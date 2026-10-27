-- Spec 16: sobrecupos. El dueño puede registrar una reserva por encima del cupo de un
-- bloque horario. `sobrecupo` marca esas reservas; solo se acepta si quien inserta es
-- dueño/entrenador (tiene fila en `perfiles`), nunca desde el portal del alumno.
alter table reservas add column sobrecupo boolean not null default false;

create or replace function reservas_check_cupo()
returns trigger
language plpgsql
as $$
declare
  v_dia_semana smallint;
  v_cupos smallint;
  v_ocupados smallint;
begin
  v_dia_semana := extract(dow from new.fecha);

  select cupos into v_cupos
  from horarios_disponibles
  where gimnasio_id = new.gimnasio_id
    and dia_semana = v_dia_semana
    and hora_inicio = new.hora_inicio
    and activo = true;

  if v_cupos is null then
    raise exception 'Ese horario no está disponible para reservar';
  end if;

  select count(*) into v_ocupados
  from reservas
  where gimnasio_id = new.gimnasio_id
    and fecha = new.fecha
    and hora_inicio = new.hora_inicio
    and estado in ('reservada', 'realizada');

  if v_ocupados >= v_cupos then
    if new.sobrecupo and exists(select 1 from perfiles where id = auth.uid()) then
      return new;
    end if;
    raise exception 'No quedan cupos disponibles para ese turno';
  end if;

  -- Una reserva normal nunca queda marcada como sobrecupo.
  new.sobrecupo := false;
  return new;
end;
$$;
