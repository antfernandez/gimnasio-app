-- Spec 54: el dueño solicita cambiar el plan del sistema de su gimnasio; solo rige tras
-- la aprobación del Superadmin. Al aprobar se actualiza `gimnasios.plan_sistema_id`: el
-- período ya pagado no cambia y el nuevo precio rige desde el próximo pago (el monto se
-- calcula siempre con el plan vigente del gimnasio).

create table solicitudes_cambio_plan_sistema (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  plan_actual_id uuid references planes_sistema(id) on delete set null,
  plan_nuevo_id uuid not null references planes_sistema(id) on delete cascade,
  nota text,
  estado estado_cambio_plan not null default 'pendiente',
  motivo_rechazo text,
  resuelta_por uuid references auth.users(id) on delete set null,
  resuelta_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cambio_plan_sistema_estado_ck check (estado in ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  constraint cambio_plan_sistema_distinto_ck check (plan_actual_id is distinct from plan_nuevo_id)
);
create index idx_cambio_plan_sistema_gimnasio on solicitudes_cambio_plan_sistema(gimnasio_id, created_at desc);
-- Una sola solicitud pendiente por gimnasio.
create unique index idx_cambio_plan_sistema_pendiente
  on solicitudes_cambio_plan_sistema(gimnasio_id) where estado = 'pendiente';

alter table solicitudes_cambio_plan_sistema enable row level security;

create policy "cambio_plan_sistema: dueño ve las de su gimnasio"
  on solicitudes_cambio_plan_sistema for select
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'));

-- El dueño solo crea solicitudes pendientes de su gimnasio, desde su plan actual.
create policy "cambio_plan_sistema: dueño crea la propia"
  on solicitudes_cambio_plan_sistema for insert
  with check (
    estado = 'pendiente'
    and resuelta_por is null and resuelta_at is null and motivo_rechazo is null
    and gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño')
    and plan_actual_id is not distinct from (
      select g.plan_sistema_id from gimnasios g where g.id = solicitudes_cambio_plan_sistema.gimnasio_id
    )
  );

-- El dueño solo puede pasar una pendiente propia a cancelada. Aprobar/rechazar queda
-- para el Superadmin (service_role), que no pasa por RLS.
create policy "cambio_plan_sistema: dueño cancela la pendiente"
  on solicitudes_cambio_plan_sistema for update
  using (estado = 'pendiente'
    and gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'))
  with check (estado = 'cancelada'
    and gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'));
