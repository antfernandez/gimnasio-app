-- Sprint 15: bitácora aparte (Dueño), fix transaccional de asignación de rutina,
-- campo peso en plantillas, dashboard con indicador de alumnos, portal del alumno
-- con "Bitácora" simplificada. Ver .claude/sprints/sprint-15-ajustes-post-sprint-14.md.

-- Snapshot del peso planificado (campo nuevo de la plantilla, Parte C) al momento de
-- registrar la sesión — mismo criterio que ya usan series_planificadas/reps_planificadas.
alter table registros_rutina add column peso_planificado text;

-- Fix transaccional de la asignación de rutina (Parte A): desactivar la vigente e
-- insertar la nueva quedan en una sola operación, sin dejar al alumno sin rutina activa
-- si el segundo paso falla.
create or replace function asignar_rutina_alumno(
  p_alumno_id uuid,
  p_gimnasio_id uuid,
  p_plantilla_id uuid,
  p_creado_por uuid,
  p_fecha_asignacion date
) returns rutinas
language plpgsql
security invoker
as $$
declare
  v_plantilla rutina_plantillas;
  v_rutina rutinas;
begin
  select * into v_plantilla from rutina_plantillas
    where id = p_plantilla_id and gimnasio_id = p_gimnasio_id;
  if not found then
    raise exception 'La plantilla seleccionada no existe o no pertenece a este gimnasio.';
  end if;

  update rutinas set activa = false
    where alumno_id = p_alumno_id and activa = true;

  insert into rutinas (
    gimnasio_id, alumno_id, creado_por, plantilla_id,
    nombre, objetivo, contenido, fecha_asignacion, activa
  ) values (
    p_gimnasio_id, p_alumno_id, p_creado_por, v_plantilla.id,
    v_plantilla.nombre, v_plantilla.objetivo, v_plantilla.contenido,
    coalesce(p_fecha_asignacion, current_date), true
  ) returning * into v_rutina;

  return v_rutina;
end;
$$;

grant execute on function asignar_rutina_alumno(uuid, uuid, uuid, uuid, date) to authenticated;
