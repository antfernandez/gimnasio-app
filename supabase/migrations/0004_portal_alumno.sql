-- Sprint 6: registro y autenticación del Alumno + portal del alumno.
--
-- Decisión de modelado (spec dejaba "a definir"): el alumno se vincula
-- directo a su fila existente/nueva en `alumnos` vía `auth.users` (columna
-- `alumnos.user_id`), NO se modela como fila en `perfiles`. Motivo: `perfiles`
-- es lo que dispara `ensureGymProfile`/`getPerfilActual` (lib/perfil.ts) y
-- habilita el panel `/protected` completo (CRUD de alumnos, pagos, rutinas,
-- avances de TODO el gimnasio) para cualquier fila en `perfiles` con ese
-- `gimnasio_id` — si el alumno tuviera perfil ahí, heredaría por accidente
-- permisos de dueño/entrenador sobre el resto de los datos del gimnasio.
-- Mantenerlo fuera de `perfiles` aísla el rol Alumno con políticas RLS
-- nuevas y explícitas, acotadas a su propia fila.

alter table alumnos add column user_id uuid references auth.users(id) on delete set null;
create unique index idx_alumnos_user_id_unique on alumnos(user_id) where user_id is not null;

-- Permite que el dueño habilite, alumno por alumno, que registre sus propios
-- avances (tarea del sprint: "si el dueño lo habilita").
alter table alumnos add column puede_registrar_avances boolean not null default false;

-- Alta propia del alumno al registrarse: solo puede insertar una fila
-- vinculada a su propia cuenta. No contempla "reclamar" una fila que el
-- dueño ya haya creado a mano con el mismo RUT (mismo choque que resuelve
-- la constraint unique(gimnasio_id, rut) con un error 23505) — fuera de
-- alcance de este sprint, ver nota en sprint-6-registro-alumno-portal.md.
create policy "alumnos: alta propia del alumno"
  on alumnos for insert
  with check (auth.uid() is not null and user_id = auth.uid());

-- Un alumno ve su propia ficha, además de lo que ya ve el dueño/entrenador
-- vía "alumnos: acceso por gimnasio" (política existente, se combina con OR).
create policy "alumnos: alumno ve su propia ficha"
  on alumnos for select
  using (user_id = auth.uid());

-- Un alumno puede actualizar su propia fila. RLS no restringe por columna;
-- eso lo hace el trigger de abajo.
create policy "alumnos: alumno edita su propia ficha"
  on alumnos for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Restringe a nivel de base de datos qué columnas puede tocar un alumno
-- editando su propia ficha: solo contacto (email, teléfono). Si quien
-- actualiza tiene fila en `perfiles` (dueño/entrenador), no aplica ninguna
-- restricción — ya está cubierto por "alumnos: acceso por gimnasio" y es
-- quien de hecho gestiona rut/plan/estado/`puede_registrar_avances`.
create or replace function alumnos_enforce_self_service_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- `auth.uid()` es null para conexiones sin sesión de usuario (service_role,
  -- scripts de administración/migraciones) — esas nunca son "el alumno
  -- editando su propia ficha", así que no les aplica esta restricción. Una
  -- sesión real de alumno siempre llega aquí con `auth.uid()` no nulo (la
  -- política RLS de UPDATE ya exige `user_id = auth.uid()` para llegar a
  -- este trigger), así que este bypass no debilita la restricción real.
  if auth.uid() is null or exists (select 1 from perfiles where id = auth.uid()) then
    return new;
  end if;

  if new.gimnasio_id is distinct from old.gimnasio_id
    or new.user_id is distinct from old.user_id
    or new.rut is distinct from old.rut
    or new.dig_ver is distinct from old.dig_ver
    or new.nombres is distinct from old.nombres
    or new.apellidos is distinct from old.apellidos
    or new.plan_contratado is distinct from old.plan_contratado
    or new.fecha_inicio is distinct from old.fecha_inicio
    or new.activo is distinct from old.activo
    or new.puede_registrar_avances is distinct from old.puede_registrar_avances
  then
    raise exception 'Un alumno solo puede editar su correo y teléfono de contacto';
  end if;

  return new;
end;
$$;

create trigger trg_alumnos_self_service_columns
  before update on alumnos
  for each row execute function alumnos_enforce_self_service_columns();

-- Búsqueda pública de gimnasios para el selector del registro de alumno.
-- `gimnasios` solo tiene SELECT por pertenencia (migración 0001) — un alumno
-- sin perfil no vería ninguno. Esta función expone SOLO columnas no
-- sensibles (nombre, slug), nunca `plan`/`fecha_inicio_plan`, y solo
-- gimnasios activos.
create or replace function buscar_gimnasios(termino text default '')
returns table (id uuid, nombre text, slug text)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.nombre, g.slug
  from gimnasios g
  where g.estado = 'activo'
    and (
      termino = ''
      or g.nombre ilike '%' || termino || '%'
      or g.slug ilike '%' || termino || '%'
    )
  order by g.nombre
  limit 20;
$$;

grant execute on function buscar_gimnasios(text) to public;

-- Un alumno ve el gimnasio al que pertenece (nombre, para el encabezado del
-- portal). `gimnasios` solo tenía SELECT por pertenencia vía `perfiles`
-- (migración 0001), que no cubre al alumno.
create policy "gimnasios: alumno ve el propio"
  on gimnasios for select
  using (id in (select gimnasio_id from alumnos where user_id = auth.uid()));

-- Un alumno ve su propio estado de pago (solo lectura — el registro de
-- pagos sigue siendo exclusivo del dueño/entrenador).
create policy "pagos: alumno ve los propios"
  on pagos for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));

-- Un alumno ve su(s) rutina(s) asignada(s) (solo lectura).
create policy "rutinas: alumno ve las propias"
  on rutinas for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));

-- Un alumno ve sus propios avances, y puede registrar avances nuevos propios
-- solo si el dueño lo habilitó (`alumnos.puede_registrar_avances`).
create policy "avances: alumno ve los propios"
  on avances for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));

create policy "avances: alumno registra los propios si está habilitado"
  on avances for insert
  with check (
    alumno_id in (
      select id from alumnos
      where user_id = auth.uid() and puede_registrar_avances = true
    )
  );
