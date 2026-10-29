-- Spec 32: el alumno no puede agendar más clases por semana (lunes a domingo) que
-- los días por semana de su plan. Las reservas canceladas no cuentan. Solo aplica a
-- reservas creadas por el alumno (también cubre reprogramar, que cancela antes de
-- insertar); el dueño puede agendar por encima del cupo.
create or replace function reservas_check_limite_semanal()
returns trigger
language plpgsql
as $$
declare
  v_limite int;
  v_inicio date := date_trunc('week', new.fecha)::date;
  v_agendadas int;
begin
  if new.creado_por is distinct from 'alumno' then
    return new;
  end if;

  select p.dias_por_semana into v_limite
  from alumnos a
  join planes p on p.id = a.plan_id
  where a.id = new.alumno_id;

  if v_limite is null then
    return new;
  end if;

  select count(*) into v_agendadas
  from reservas
  where alumno_id = new.alumno_id
    and estado in ('reservada', 'realizada')
    and fecha >= v_inicio
    and fecha < v_inicio + 7;

  if v_agendadas >= v_limite then
    raise exception 'limite_clases_semana: el plan permite % clases por semana', v_limite
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservas_limite_semanal on reservas;
create trigger trg_reservas_limite_semanal
  before insert on reservas
  for each row execute function reservas_check_limite_semanal();
