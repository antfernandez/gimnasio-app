-- Spec 43: el alumno solicita cambiar de plan; el dueño aprueba o rechaza y el cambio
-- rige recién al terminar el periodo en curso (`aplica_desde`). Hasta entonces el plan
-- asignado (`alumnos.plan_id`) no cambia, así que el cobro sigue con el plan actual.

create type estado_cambio_plan as enum ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'aplicada');

create table solicitudes_cambio_plan (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  plan_actual_id uuid references planes(id) on delete set null,
  plan_nuevo_id uuid not null references planes(id) on delete cascade,
  nota text,
  estado estado_cambio_plan not null default 'pendiente',
  -- Primer día con el plan nuevo: día siguiente al vencimiento vigente (o el día de la
  -- aprobación si no hay periodo en curso). Solo se fija al aprobar.
  aplica_desde date,
  resuelta_por uuid references auth.users(id) on delete set null,
  resuelta_at timestamptz,
  aplicada_at timestamptz,
  created_at timestamptz not null default now(),
  constraint solicitudes_cambio_plan_distinto_ck check (plan_actual_id is distinct from plan_nuevo_id),
  constraint solicitudes_cambio_plan_aprobada_ck check (
    estado not in ('aprobada', 'aplicada') or aplica_desde is not null
  )
);
create index idx_solicitudes_cambio_plan_gimnasio on solicitudes_cambio_plan(gimnasio_id, created_at desc);
create index idx_solicitudes_cambio_plan_alumno on solicitudes_cambio_plan(alumno_id, created_at desc);
-- Una sola solicitud abierta (pendiente o aprobada sin aplicar) por alumno.
create unique index idx_solicitudes_cambio_plan_abierta
  on solicitudes_cambio_plan(alumno_id) where estado in ('pendiente', 'aprobada');

alter table solicitudes_cambio_plan enable row level security;

create policy "solicitudes_cambio_plan: alumno ve las propias"
  on solicitudes_cambio_plan for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));

create policy "solicitudes_cambio_plan: dueño ve las de su gimnasio"
  on solicitudes_cambio_plan for select
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- El alumno solo crea solicitudes pendientes a su nombre, desde su plan actual y hacia
-- un plan de su mismo gimnasio.
create policy "solicitudes_cambio_plan: alumno crea la propia"
  on solicitudes_cambio_plan for insert
  with check (
    estado = 'pendiente'
    and aplica_desde is null and resuelta_por is null
    and alumno_id in (
      select a.id from alumnos a
      where a.user_id = auth.uid()
        and a.gimnasio_id = solicitudes_cambio_plan.gimnasio_id
        and a.estado_aprobacion = 'aprobado'
        and a.plan_id is not distinct from solicitudes_cambio_plan.plan_actual_id
    )
    and plan_nuevo_id in (select id from planes where gimnasio_id = solicitudes_cambio_plan.gimnasio_id)
  );

-- El alumno solo puede pasar una pendiente propia a cancelada.
create policy "solicitudes_cambio_plan: alumno cancela la pendiente"
  on solicitudes_cambio_plan for update
  using (estado = 'pendiente'
    and alumno_id in (select id from alumnos where user_id = auth.uid()))
  with check (estado = 'cancelada'
    and alumno_id in (select id from alumnos where user_id = auth.uid()));

-- El dueño/entrenador del gimnasio resuelve (aprueba o rechaza) las pendientes.
create policy "solicitudes_cambio_plan: dueño resuelve las pendientes"
  on solicitudes_cambio_plan for update
  using (estado = 'pendiente'
    and gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (estado in ('aprobada', 'rechazada')
    and gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- Aplicación perezosa: pasa al plan nuevo las solicitudes aprobadas cuyo periodo ya
-- terminó. Alcance: las del alumno que llama o, si es dueño/entrenador, las de su
-- gimnasio. Devuelve cuántas aplicó. Idempotente.
create or replace function aplicar_cambios_plan_vencidos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  with vencidas as (
    update solicitudes_cambio_plan s
    set estado = 'aplicada', aplicada_at = now()
    where s.estado = 'aprobada'
      and s.aplica_desde <= current_date
      and (
        s.alumno_id in (select id from alumnos where user_id = auth.uid())
        or s.gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid())
      )
    returning s.alumno_id, s.plan_nuevo_id
  )
  update alumnos a
  set plan_id = v.plan_nuevo_id
  from vencidas v
  where a.id = v.alumno_id;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function aplicar_cambios_plan_vencidos() from public, anon;
grant execute on function aplicar_cambios_plan_vencidos() to authenticated;
