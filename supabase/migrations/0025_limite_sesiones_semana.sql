-- Spec 31: una sesión de bitácora = una fecha con registros. El alumno no puede
-- registrar más fechas distintas por semana (lunes a domingo) que los días por
-- semana de su plan. Aplica a registros del alumno y del staff. Los registros
-- existentes no se modifican.
create or replace function registros_rutina_check_limite_semanal()
returns trigger
language plpgsql
as $$
declare
  v_limite int;
  v_inicio date := date_trunc('week', new.fecha)::date;
  v_otras int;
begin
  select p.dias_por_semana into v_limite
  from alumnos a
  join planes p on p.id = a.plan_id
  where a.id = new.alumno_id;

  if v_limite is null then
    return new;
  end if;

  -- Si la fecha ya tiene registros, es la misma sesión: no suma.
  if exists (
    select 1 from registros_rutina
    where alumno_id = new.alumno_id and fecha = new.fecha
  ) then
    return new;
  end if;

  select count(distinct fecha) into v_otras
  from registros_rutina
  where alumno_id = new.alumno_id
    and fecha >= v_inicio
    and fecha < v_inicio + 7;

  if v_otras >= v_limite then
    raise exception 'limite_sesiones_semana: el plan permite % sesiones por semana', v_limite
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_registros_rutina_limite_semanal on registros_rutina;
create trigger trg_registros_rutina_limite_semanal
  before insert on registros_rutina
  for each row execute function registros_rutina_check_limite_semanal();
