-- Sprint 13: catálogo de planes (Básico/Intermedio/Avanzado) separado de la rutina,
-- "Mi Plan" en el portal del alumno, tope de reservas según el plan, y bitácora digital
-- de rutina (reemplazo de la hoja impresa). Ver
-- .claude/sprints/sprint-13-ajustes-post-sprint-12.md.

-- ============================================================================
-- Catálogo de planes
-- ============================================================================

-- El Plan (cuántos días a la semana entrena el alumno) queda desacoplado de la
-- Rutina (qué ejercicios hace) — no hay pantalla combinada, ver el hallazgo de la
-- ronda de aclaraciones en el sprint.
create type nivel_plan as enum ('basico', 'intermedio', 'avanzado');

create table planes (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  nombre text not null,
  nivel nivel_plan not null,
  precio numeric(10,2),
  dias_por_semana smallint not null check (dias_por_semana > 0),
  fecha_vigencia_desde date not null default current_date,
  fecha_vigencia_hasta date,
  creado_por uuid references perfiles(id),
  modificado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_planes_gimnasio on planes(gimnasio_id);

create trigger trg_planes_updated_at
  before update on planes
  for each row execute function set_updated_at();

alter table planes enable row level security;

create policy "planes: acceso por gimnasio"
  on planes for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- Migración de `alumnos.plan_contratado` (texto libre) a `alumnos.plan_id` (FK).
alter table alumnos add column plan_id uuid references planes(id) on delete set null;

-- Política de SELECT del alumno sobre `planes`, definida recién acá porque depende de
-- `alumnos.plan_id` (columna creada arriba).
create policy "planes: alumno ve el propio"
  on planes for select
  using (id in (select plan_id from alumnos where user_id = auth.uid()));

-- Backfill sin pérdida de datos: un plan de catálogo por cada texto libre distinto ya
-- usado en el gimnasio (nivel/días son un valor de partida razonable — el dueño los
-- ajusta después desde el nuevo panel de Planes).
insert into planes (gimnasio_id, nombre, nivel, dias_por_semana, creado_por)
select distinct gimnasio_id, plan_contratado, 'basico'::nivel_plan, 3, null::uuid
from alumnos
where plan_contratado is not null and trim(plan_contratado) <> '';

update alumnos a
set plan_id = p.id
from planes p
where p.gimnasio_id = a.gimnasio_id
  and p.nombre = a.plan_contratado
  and a.plan_contratado is not null
  and trim(a.plan_contratado) <> '';

alter table alumnos drop column plan_contratado;

-- Búsqueda pública de planes activos/vigentes de un gimnasio, para el selector del
-- registro de alumno (mismo patrón `security definer` que `buscar_gimnasios`,
-- migración 0004) — expone solo columnas no sensibles.
create or replace function listar_planes_publico(p_gimnasio_id uuid)
returns table (
  id uuid,
  nombre text,
  nivel nivel_plan,
  precio numeric,
  dias_por_semana smallint
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.nombre, p.nivel, p.precio, p.dias_por_semana
  from planes p
  where p.gimnasio_id = p_gimnasio_id
    and p.fecha_vigencia_desde <= current_date
    and (p.fecha_vigencia_hasta is null or p.fecha_vigencia_hasta >= current_date)
  order by p.dias_por_semana, p.nombre;
$$;

grant execute on function listar_planes_publico(uuid) to public;

-- Redefine el guard de autoservicio del alumno (migraciones 0004/0008): cambia
-- `plan_contratado` por `plan_id`, y agrega `puede_registrar_bitacora` a la lista de
-- columnas que un alumno no puede autoeditar.
create or replace function alumnos_enforce_self_service_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or exists (select 1 from perfiles where id = auth.uid()) then
    return new;
  end if;

  if new.gimnasio_id is distinct from old.gimnasio_id
    or new.user_id is distinct from old.user_id
    or new.rut is distinct from old.rut
    or new.dig_ver is distinct from old.dig_ver
    or new.nombres is distinct from old.nombres
    or new.apellidos is distinct from old.apellidos
    or new.plan_id is distinct from old.plan_id
    or new.fecha_inicio is distinct from old.fecha_inicio
    or new.activo is distinct from old.activo
    or new.puede_registrar_avances is distinct from old.puede_registrar_avances
    or new.puede_registrar_bitacora is distinct from old.puede_registrar_bitacora
    or new.estado_aprobacion is distinct from old.estado_aprobacion
  then
    raise exception 'Un alumno solo puede editar su correo y teléfono de contacto';
  end if;

  return new;
end;
$$;

-- ============================================================================
-- Bitácora de rutina (registro de sesiones y repeticiones)
-- ============================================================================

alter table alumnos add column puede_registrar_bitacora boolean not null default false;

-- Una fila por ejercicio dentro de cada sesión: lo planificado queda "congelado" como
-- snapshot al momento del registro (así el historial no se reescribe si luego se edita
-- la rutina) contra lo realmente realizado.
create table registros_rutina (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  rutina_id uuid not null references rutinas(id) on delete cascade,
  ejercicio_index smallint not null,
  ejercicio text not null,
  series_planificadas smallint,
  reps_planificadas smallint,
  series_realizadas smallint,
  reps_realizadas smallint,
  peso_kg numeric(6,2),
  fecha date not null default current_date,
  registrado_por uuid references perfiles(id),
  origen origen_cambio not null default 'dueño',
  notas text,
  created_at timestamptz not null default now()
);
create index idx_registros_rutina_alumno_fecha on registros_rutina(alumno_id, fecha);

alter table registros_rutina enable row level security;

create policy "registros_rutina: acceso por gimnasio"
  on registros_rutina for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "registros_rutina: alumno ve los propios"
  on registros_rutina for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));

-- "Solo día actual" (Parte E) reforzado a nivel de base de datos, no solo en el
-- formulario.
create policy "registros_rutina: alumno registra los propios de hoy si está habilitado"
  on registros_rutina for insert
  with check (
    origen = 'alumno'
    and fecha = current_date
    and alumno_id in (
      select id from alumnos
      where user_id = auth.uid() and puede_registrar_bitacora = true
    )
  );

-- ============================================================================
-- Tope de reservas por paquete (amplía el alcance original, toca el Sprint 8)
-- ============================================================================

-- Mismo patrón que `reservas_check_cupo` (migración 0006): valida solo en INSERT.
-- Cuando `creado_por = 'dueño'` el chequeo se salta — el dueño puede agendar por
-- encima del límite (reposición, cortesía). Si el alumno no tiene paquete vigente
-- para la fecha, tampoco bloquea (nada contra qué topear) — mismo criterio permisivo
-- que usa `consumir_clase_paquete` cuando no encuentra paquete.
create or replace function reservas_check_paquete()
returns trigger
language plpgsql
as $$
declare
  v_paquete_id uuid;
  v_clases_incluidas smallint;
  v_fecha_inicio date;
  v_fecha_vencimiento date;
  v_reservas_existentes int;
begin
  if new.creado_por <> 'alumno' then
    return new;
  end if;

  select id, clases_incluidas, fecha_inicio, fecha_vencimiento
  into v_paquete_id, v_clases_incluidas, v_fecha_inicio, v_fecha_vencimiento
  from paquetes
  where alumno_id = new.alumno_id
    and new.fecha between fecha_inicio and fecha_vencimiento
  order by fecha_vencimiento asc
  limit 1;

  if v_paquete_id is null then
    return new;
  end if;

  select count(*) into v_reservas_existentes
  from reservas
  where alumno_id = new.alumno_id
    and estado in ('reservada', 'realizada')
    and fecha between v_fecha_inicio and v_fecha_vencimiento;

  if v_reservas_existentes >= v_clases_incluidas then
    raise exception 'No te quedan clases disponibles en tu paquete vigente';
  end if;

  return new;
end;
$$;

create trigger trg_reservas_check_paquete
  before insert on reservas
  for each row execute function reservas_check_paquete();
