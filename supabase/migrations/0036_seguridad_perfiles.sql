-- Spec 57 (auditoría de seguridad): cierra la escalada de privilegios vía `perfiles`.
--
-- Hallazgo: la política "perfiles: acceso propio" (0001) era `for all` con
-- `id = auth.uid()`, sin restringir columnas. Cualquier usuario autenticado podía
--   (a) insertar su propio perfil con el `gimnasio_id` de OTRO gimnasio (y rol 'dueño'),
--   (b) actualizar `gimnasio_id`/`rol` de su perfil,
--   (c) un alumno con un perfil propio esquiva `alumnos_enforce_self_service_columns`
--       (que lo exime si existe un perfil) y podía autoaprobarse o cambiar su plan.
-- Además `gimnasios` aceptaba altas de cualquier usuario autenticado, incluidos alumnos.

-- Funciones security definer para evitar recursión de RLS al consultar perfiles/alumnos
-- dentro de sus propias políticas.
create or replace function gimnasio_sin_perfiles(p_gimnasio uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (select 1 from perfiles where gimnasio_id = p_gimnasio);
$$;

create or replace function usuario_es_alumno()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from alumnos where user_id = auth.uid());
$$;

-- perfiles: lectura propia; alta solo como dueño de un gimnasio aún sin perfiles (el
-- alta de gimnasio de `ensureGymProfile`); edición propia sin tocar rol ni gimnasio.
drop policy if exists "perfiles: acceso propio" on perfiles;

create policy "perfiles: lectura propia"
  on perfiles for select
  using (id = auth.uid());

create policy "perfiles: alta del dueño en gimnasio nuevo"
  on perfiles for insert
  with check (
    id = auth.uid()
    and rol = 'dueño'
    and gimnasio_sin_perfiles(gimnasio_id)
    and not usuario_es_alumno()
  );

create policy "perfiles: edición propia"
  on perfiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function perfiles_proteger_columnas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (superadmin) no tiene auth.uid(): puede cambiarlas.
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id
    or new.gimnasio_id is distinct from old.gimnasio_id
    or new.rol is distinct from old.rol
  then
    raise exception 'No se puede cambiar el rol ni el gimnasio de un perfil';
  end if;
  return new;
end;
$$;

drop trigger if exists perfiles_proteger_columnas on perfiles;
create trigger perfiles_proteger_columnas
  before update on perfiles
  for each row execute function perfiles_proteger_columnas();

-- gimnasios: un alumno no puede dar de alta gimnasios.
drop policy if exists "gimnasios: alta por usuario autenticado" on gimnasios;
create policy "gimnasios: alta por usuario autenticado"
  on gimnasios for insert
  with check (auth.uid() is not null and not usuario_es_alumno());
