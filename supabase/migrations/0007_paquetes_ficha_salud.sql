-- Sprint 9: paquetes de clases (ciclo de cobro = 1 mes corrido desde el inicio, no un
-- ciclo calendario fijo), consumo automático al marcarse un turno como "realizada",
-- ficha de salud del alumno (alergias/enfermedades, sumadas a lesiones/objetivos que
-- ya se manejaban en la práctica) y clasificación derivada activo/inactivo/de prueba.
-- Ver .claude/sprints/sprint-9-paquetes-ficha-salud.md y
-- .claude/specs/valinor-informacion-recopilada.md.

-- Ficha de salud: columnas nuevas en `alumnos`. Nullable a propósito — para los
-- alumnos ya existentes empiezan vacías, lo que es justo la señal que necesita
-- `v_clasificacion_alumnos.ficha_salud_pendiente` más abajo.
alter table alumnos add column alergias text;
alter table alumnos add column enfermedades text;
alter table alumnos add column lesiones text;
alter table alumnos add column objetivos_salud text;

-- Mercado Pago: la dueña de Valinor prefiere transferencia por la comisión que cobra
-- Mercado Pago, así que el cobro automático (Sprint 13) se modela como una opción
-- configurable por gimnasio, no obligatoria — por ahora solo el interruptor; el cobro
-- real (OAuth, checkout, webhooks) llega en el Sprint 13.
alter table gimnasios add column mercado_pago_habilitado boolean not null default false;

-- Paquetes de clases: un pago (Sprint 2) puede originar un paquete nuevo (`pago_id`
-- opcional, no todo pago tiene por qué originar uno). `fecha_vencimiento` es una
-- columna generada (1 mes corrido desde `fecha_inicio`, no un ciclo calendario tipo
-- "día 1 a día 30") para que nunca quede desincronizada de `fecha_inicio`.
create table paquetes (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  pago_id uuid references pagos(id) on delete set null,
  clases_incluidas smallint not null check (clases_incluidas > 0),
  clases_consumidas smallint not null default 0 check (clases_consumidas >= 0),
  fecha_inicio date not null default current_date,
  fecha_vencimiento date generated always as ((fecha_inicio + interval '1 month')::date) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_paquetes_alumno on paquetes(alumno_id, fecha_vencimiento);

create trigger trg_paquetes_updated_at
  before update on paquetes
  for each row execute function set_updated_at();

-- Consumo automático: cuando una reserva pasa a 'realizada' (asistencia normal,
-- cancelación tardía o inasistencia — las tres cuentan como sesión realizada según la
-- regla del Sprint 8), se descuenta una clase del paquete vigente **a la fecha de esa
-- sesión** (no a la fecha de hoy — una reserva pasada marcada realizada con demora
-- igual debe descontar del paquete que cubría ese día). Si no hay paquete vigente para
-- esa fecha, no descuenta nada ni falla: el turno queda igual marcado como realizada,
-- la dueña ve la inconsistencia (sin paquete) desde `v_estado_paquetes_alumnos`.
-- SECURITY DEFINER: una cancelación tardía de un ALUMNO (sin fila en `perfiles`) puede
-- disparar esto (ver `reservas_before_update`, migración 0006) y ese rol no tiene
-- permiso RLS para actualizar `paquetes` directamente.
create or replace function consumir_clase_paquete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paquete_id uuid;
begin
  select id into v_paquete_id
  from paquetes
  where alumno_id = new.alumno_id
    and new.fecha between fecha_inicio and fecha_vencimiento
  order by fecha_vencimiento asc
  limit 1;

  if v_paquete_id is not null then
    update paquetes set clases_consumidas = clases_consumidas + 1 where id = v_paquete_id;
  end if;

  return new;
end;
$$;

create trigger trg_reservas_consumir_paquete
  after update on reservas
  for each row
  when (new.estado = 'realizada' and old.estado is distinct from 'realizada')
  execute function consumir_clase_paquete();

-- Estado de paquete por alumno — equivalente para paquetes a lo que
-- `v_estado_pago_alumnos` es para pagos. Toma, de entre los paquetes vigentes (fecha de
-- hoy dentro de [fecha_inicio, fecha_vencimiento]), el que vence primero (FIFO, misma
-- prioridad que usa `consumir_clase_paquete`); si no hay ninguno vigente, igual informa
-- el último vencimiento conocido (aunque haya expirado) para referencia.
create or replace view v_estado_paquetes_alumnos as
with paquete_vigente as (
  select distinct on (alumno_id)
    alumno_id, id, clases_incluidas, clases_consumidas, fecha_inicio, fecha_vencimiento
  from paquetes
  where current_date between fecha_inicio and fecha_vencimiento
  order by alumno_id, fecha_vencimiento asc
),
ultimo_paquete as (
  select distinct on (alumno_id)
    alumno_id, fecha_vencimiento as ultimo_vencimiento
  from paquetes
  order by alumno_id, fecha_vencimiento desc
)
select
  a.id as alumno_id,
  a.gimnasio_id,
  a.nombres,
  a.apellidos,
  a.activo,
  pv.id as paquete_id,
  pv.clases_incluidas,
  pv.clases_consumidas,
  (pv.clases_incluidas - pv.clases_consumidas) as clases_restantes,
  pv.fecha_inicio,
  coalesce(pv.fecha_vencimiento, up.ultimo_vencimiento) as vencimiento_actual,
  case
    when pv.id is null then 'sin_paquete'
    when pv.fecha_vencimiento <= current_date + 7 then 'por_vencer'
    else 'vigente'
  end as estado_paquete
from alumnos a
left join paquete_vigente pv on pv.alumno_id = a.id
left join ultimo_paquete up on up.alumno_id = a.id;

-- Clasificación activo/inactivo/de prueba — estado DERIVADO (nunca una columna
-- editada a mano), con el criterio estándar propuesto en el informe de la dueña,
-- pendiente de que ella lo confirme (ver valinor-informacion-recopilada.md):
--   - activo: tiene un paquete vigente ahora mismo, O su último paquete venció hace
--     menos de 30 días (período de gracia — todavía no se cuenta como "caído").
--   - inactivo: tuvo al menos un paquete alguna vez, pero el más reciente venció hace
--     30 días o más y no hay uno vigente.
--   - de_prueba: nunca ha tenido un paquete (típicamente su primera clase, reservada
--     o ya realizada, todavía sin compra de paquete).
-- `ficha_salud_pendiente` es independiente de la clasificación anterior: usa el
-- booleano manual `alumnos.activo` (Sprint 1, "de baja" o no), no esta clasificación,
-- porque la ficha de salud aplica a cualquier alumno vigente como cliente del estudio,
-- compre o no paquete todavía. Campos considerados (mismos que cita el dashboard del
-- Sprint 10): alergias, enfermedades, lesiones.
create or replace view v_clasificacion_alumnos as
select
  a.id as alumno_id,
  a.gimnasio_id,
  a.nombres,
  a.apellidos,
  a.activo,
  case
    when vig.alumno_id is not null then 'activo'
    when ult.ultimo_vencimiento is not null and current_date - ult.ultimo_vencimiento < 30
      then 'activo'
    when ult.ultimo_vencimiento is not null then 'inactivo'
    else 'de_prueba'
  end as clasificacion,
  (
    a.activo
    and (
      nullif(trim(a.alergias), '') is null
      or nullif(trim(a.enfermedades), '') is null
      or nullif(trim(a.lesiones), '') is null
    )
  ) as ficha_salud_pendiente
from alumnos a
left join (
  select distinct alumno_id
  from paquetes
  where current_date between fecha_inicio and fecha_vencimiento
) vig on vig.alumno_id = a.id
left join (
  select alumno_id, max(fecha_vencimiento) as ultimo_vencimiento
  from paquetes
  group by alumno_id
) ult on ult.alumno_id = a.id;

-- Row Level Security
alter table paquetes enable row level security;

create policy "paquetes: acceso por gimnasio"
  on paquetes for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "paquetes: alumno ve los propios"
  on paquetes for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));
