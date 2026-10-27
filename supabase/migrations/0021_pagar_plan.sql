-- Spec 23: módulo Pagar plan (Mercado Pago o transferencia).
-- Dos flujos sobre una misma tabla de solicitudes:
--   'alumno'      el alumno paga su plan al gimnasio (MP a la cuenta de Valinor).
--   'suscripcion' la dueña paga el sistema a Antonio (MP a la cuenta de Antonio).
-- Los montos los calcula el servidor; el cliente nunca los envía. Las inserciones y la
-- confirmación de MP las hace el servidor con `service_role`; el cliente solo lee.

-- Método de pago de Mercado Pago en `pagos` (no se usa en esta migración: un valor de
-- enum recién agregado no puede usarse dentro de la misma transacción).
alter type metodo_pago add value if not exists 'mercado_pago';

create type flujo_pago as enum ('alumno', 'suscripcion');
create type metodo_solicitud as enum ('mercado_pago', 'transferencia');
create type estado_solicitud as enum ('pendiente', 'confirmado', 'rechazado');

-- Planes del sistema (lo que la dueña paga a Antonio), por tramo de alumnos activos.
-- `max_alumnos` null = sin tope. Se administran con service_role (superadmin).
create table planes_sistema (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  max_alumnos integer check (max_alumnos is null or max_alumnos > 0),
  precio_mensual numeric(10,2) not null check (precio_mensual > 0),
  activo boolean not null default true,
  orden smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table planes_sistema enable row level security;

create policy "planes_sistema: lectura para usuarios autenticados"
  on planes_sistema for select
  using (auth.uid() is not null and activo);

-- Suscripción vigente de cada gimnasio al sistema.
alter table gimnasios
  add column plan_sistema_id uuid references planes_sistema(id) on delete set null,
  add column suscripcion_hasta date;

-- Tope de alumnos: no bloquea ingresos. Al superar el tope del tramo, el gimnasio pasa
-- solo al siguiente (nunca baja solo); el nuevo precio rige desde el próximo pago. El
-- aviso previo se muestra en el panel cuando el uso llega a `porcentaje_aviso` (80 %).
create or replace function plan_sistema_requerido(p_gimnasio_id uuid)
returns uuid
language sql
stable
as $$
  select ps.id
  from planes_sistema ps
  where ps.activo
    and (ps.max_alumnos is null
         or ps.max_alumnos >= (select count(*) from alumnos
                               where gimnasio_id = p_gimnasio_id and activo))
  order by ps.orden
  limit 1;
$$;

create or replace function alumnos_subir_plan_sistema()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req uuid;
begin
  v_req := plan_sistema_requerido(new.gimnasio_id);
  update gimnasios g
  set plan_sistema_id = v_req
  where g.id = new.gimnasio_id
    and v_req is not null
    and g.plan_sistema_id is distinct from v_req
    and coalesce((select orden from planes_sistema where id = g.plan_sistema_id), -1)
        < (select orden from planes_sistema where id = v_req);
  return new;
end;
$$;

create trigger trg_alumnos_subir_plan_sistema
  after insert or update of activo on alumnos
  for each row when (new.activo)
  execute function alumnos_subir_plan_sistema();

-- Uso del tramo por gimnasio, para el aviso anticipado en el panel.
create or replace view v_uso_plan_sistema
with (security_invoker = true) as
select
  g.id as gimnasio_id,
  ps.nombre as plan_nombre,
  ps.max_alumnos,
  (select count(*) from alumnos a where a.gimnasio_id = g.id and a.activo) as alumnos_activos,
  (select s.nombre from planes_sistema s
   where s.activo and s.orden > ps.orden order by s.orden limit 1) as plan_siguiente,
  ps.max_alumnos is not null
    and (select count(*) from alumnos a where a.gimnasio_id = g.id and a.activo)
        >= ceil(ps.max_alumnos * 0.8) as cerca_del_tope
from gimnasios g
join planes_sistema ps on ps.id = g.plan_sistema_id;

-- Datos bancarios para transferencias. `gimnasio_id` null = cuenta del sistema (Antonio,
-- flujo B); no nulo = cuenta del gimnasio (flujo A). Una cuenta por destino.
create table cuentas_transferencia (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid references gimnasios(id) on delete cascade,
  banco text not null,
  tipo_cuenta text not null,
  numero_cuenta text not null,
  titular text not null,
  rut_titular text not null,
  email_contacto text,
  updated_at timestamptz not null default now()
);
create unique index idx_cuentas_transferencia_destino
  on cuentas_transferencia (coalesce(gimnasio_id, '00000000-0000-0000-0000-000000000000'::uuid));

create trigger trg_cuentas_transferencia_updated_at
  before update on cuentas_transferencia
  for each row execute function set_updated_at();

alter table cuentas_transferencia enable row level security;

-- El dueño/entrenador administra la cuenta de su gimnasio; el alumno la ve para transferir.
create policy "cuentas_transferencia: acceso por gimnasio"
  on cuentas_transferencia for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "cuentas_transferencia: alumno ve la de su gimnasio"
  on cuentas_transferencia for select
  using (gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid()));

-- La cuenta del sistema la ve cualquier dueño/entrenador (para pagar la suscripción).
create policy "cuentas_transferencia: dueño ve la del sistema"
  on cuentas_transferencia for select
  using (gimnasio_id is null and exists (select 1 from perfiles where id = auth.uid()));

-- Solicitudes de pago.
create table solicitudes_pago (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  flujo flujo_pago not null,
  alumno_id uuid references alumnos(id) on delete cascade,
  plan_id uuid references planes(id) on delete set null,
  plan_sistema_id uuid references planes_sistema(id) on delete set null,
  meses smallint not null check (meses in (1, 2, 3, 6, 12)),
  monto numeric(10,2) not null check (monto > 0),
  metodo metodo_solicitud not null,
  estado estado_solicitud not null default 'pendiente',
  mp_preference_id text,
  mp_payment_id text,
  comprobante_path text,
  fecha_transferencia date,
  nota text,
  motivo_rechazo text,
  pago_id uuid references pagos(id) on delete set null,
  created_at timestamptz not null default now(),
  validado_por uuid references auth.users(id) on delete set null,
  validado_at timestamptz,
  -- Flujo A: alumno + plan del gimnasio. Flujo B: plan del sistema, sin alumno.
  constraint solicitudes_pago_flujo_ck check (
    (flujo = 'alumno' and alumno_id is not null and plan_id is not null and plan_sistema_id is null)
    or (flujo = 'suscripcion' and alumno_id is null and plan_id is null and plan_sistema_id is not null)
  ),
  -- Transferencia exige comprobante y fecha (no futura); MP no los lleva.
  constraint solicitudes_pago_transferencia_ck check (
    (metodo = 'transferencia' and comprobante_path is not null
       and fecha_transferencia is not null and fecha_transferencia <= current_date + 1)
    or (metodo = 'mercado_pago' and comprobante_path is null)
  ),
  constraint solicitudes_pago_rechazo_ck check (
    estado <> 'rechazado' or motivo_rechazo is not null
  )
);
create index idx_solicitudes_pago_gimnasio on solicitudes_pago(gimnasio_id, created_at desc);
create index idx_solicitudes_pago_alumno on solicitudes_pago(alumno_id, created_at desc);
-- Idempotencia del webhook: un pago de MP corresponde a una sola solicitud.
create unique index idx_solicitudes_pago_mp_payment
  on solicitudes_pago(mp_payment_id) where mp_payment_id is not null;
-- Un pago de `pagos` nace de una sola solicitud.
create unique index idx_solicitudes_pago_pago on solicitudes_pago(pago_id) where pago_id is not null;

alter table solicitudes_pago enable row level security;

-- Solo lectura desde el cliente. Insertar y cambiar de estado pasa por el servidor.
create policy "solicitudes_pago: dueño ve las de su gimnasio"
  on solicitudes_pago for select
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "solicitudes_pago: alumno ve las propias"
  on solicitudes_pago for select
  using (flujo = 'alumno'
    and alumno_id in (select id from alumnos where user_id = auth.uid()));

-- Aplica una solicitud confirmada: flujo A registra el pago y extiende la vigencia del
-- alumno (desde hoy, o desde el día siguiente al vencimiento si sigue vigente); flujo B
-- extiende la suscripción del gimnasio. Idempotente: no hace nada si ya está confirmada.
-- Solo para `service_role` (webhook y validación manual desde el servidor).
create or replace function aplicar_solicitud_pago(p_id uuid, p_validador uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s solicitudes_pago%rowtype;
  v_venc date;
  v_desde date;
  v_hasta date;
  v_pago uuid;
begin
  select * into s from solicitudes_pago where id = p_id for update;
  if not found then
    raise exception 'solicitud_pago no existe: %', p_id;
  end if;
  if s.estado = 'confirmado' then
    return;
  end if;

  if s.flujo = 'alumno' then
    select max(periodo_hasta) into v_venc from pagos where alumno_id = s.alumno_id;
    v_desde := case when v_venc is not null and v_venc >= current_date
                    then v_venc + 1 else current_date end;
    v_hasta := (v_desde + make_interval(months => s.meses))::date - 1;

    insert into pagos (gimnasio_id, alumno_id, monto, fecha_pago, metodo, plan_id,
                       periodo_desde, periodo_hasta)
    values (s.gimnasio_id, s.alumno_id, s.monto, current_date,
            case s.metodo when 'mercado_pago' then 'mercado_pago' else 'transferencia' end::metodo_pago,
            s.plan_id, v_desde, v_hasta)
    returning id into v_pago;

    -- Igual que el pago manual (createPago): un paquete de clases por pago, de
    -- `dias_por_semana × 4`; sin plan asignado no se crea paquete.
    insert into paquetes (gimnasio_id, alumno_id, pago_id, clases_incluidas, fecha_inicio)
    select s.gimnasio_id, s.alumno_id, v_pago, pl.dias_por_semana * 4, current_date
    from planes pl
    where pl.id = s.plan_id;
  else
    select suscripcion_hasta into v_venc from gimnasios where id = s.gimnasio_id;
    v_desde := case when v_venc is not null and v_venc >= current_date
                    then v_venc + 1 else current_date end;
    v_hasta := (v_desde + make_interval(months => s.meses))::date - 1;

    update gimnasios
    set suscripcion_hasta = v_hasta, plan_sistema_id = s.plan_sistema_id
    where id = s.gimnasio_id;
  end if;

  update solicitudes_pago
  set estado = 'confirmado', pago_id = v_pago,
      validado_por = p_validador, validado_at = now()
  where id = p_id;
end;
$$;

revoke all on function aplicar_solicitud_pago(uuid, uuid) from public, anon, authenticated;
grant execute on function aplicar_solicitud_pago(uuid, uuid) to service_role;

-- Comprobantes de transferencia: bucket privado. Ruta: `${gimnasio_id}/${auth.uid()}/${archivo}`.
-- Sube quien paga (alumno o dueño de ese gimnasio); lee quien subió o el dueño/entrenador
-- del gimnasio. El superadmin accede con service_role (URL firmada). 5 MB; imagen o PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes-pago',
  'comprobantes-pago',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "comprobantes-pago: sube a su propia carpeta"
  on storage.objects for insert
  with check (
    bucket_id = 'comprobantes-pago'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (
      (storage.foldername(name))[1] in (select gimnasio_id::text from perfiles where id = auth.uid())
      or (storage.foldername(name))[1] in (select gimnasio_id::text from alumnos where user_id = auth.uid())
    )
  );

create policy "comprobantes-pago: lee quien subió o el gimnasio"
  on storage.objects for select
  using (
    bucket_id = 'comprobantes-pago'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or (storage.foldername(name))[1] in (select gimnasio_id::text from perfiles where id = auth.uid())
    )
  );
