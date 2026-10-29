-- Spec 28: opciones de la membresía "Medición corporal" y "Plan nutricional".
-- Condicionan qué secciones ve el alumno (ficha, bitácora del dueño, portal) y si se le
-- puede asignar un plan nutricional. Los datos ya guardados no se borran.

alter table alumnos
  add column medicion_corporal_habilitada boolean not null default false,
  add column plan_nutricional_habilitado boolean not null default false;

-- Los alumnos que ya existían conservan lo que ven hoy; los nuevos parten en false.
update alumnos set medicion_corporal_habilitada = true, plan_nutricional_habilitado = true;

-- El alumno no puede cambiar estos flags desde su portal (solo dueño/entrenador).
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
    or new.medicion_corporal_habilitada is distinct from old.medicion_corporal_habilitada
    or new.plan_nutricional_habilitado is distinct from old.plan_nutricional_habilitado
  then
    raise exception 'Un alumno solo puede editar su correo y teléfono de contacto';
  end if;

  return new;
end;
$$;
