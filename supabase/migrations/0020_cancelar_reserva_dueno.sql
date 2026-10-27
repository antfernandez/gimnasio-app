-- Turnos: cancelar una reserva desde el panel (dueño/entrenador) la deja 'cancelada' y
-- libera el cupo siempre. Antes, dentro de las 24 h previas el trigger la convertía en
-- 'realizada' (consumía la clase y el turno seguía ocupado). Esa política de 24 h se
-- mantiene solo para el alumno que cancela desde el portal. `cancelado_dentro_ventana`
-- se sigue calculando para dejar constancia.
-- Redefine la función de 0006; el trigger existente la sigue usando.

create or replace function reservas_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  es_dueno boolean;
  dentro_ventana boolean;
begin
  select exists(select 1 from perfiles where id = auth.uid()) into es_dueno;

  -- El dueño/entrenador ya tiene acceso total a las filas de su propio gimnasio vía
  -- "reservas: acceso por gimnasio" — este trigger no le agrega restricciones de
  -- columna (marcar una alerta como vista, anotar, o cancelar son todas ediciones
  -- legítimas para él). Solo calculamos la política de 24 h cuando efectivamente
  -- cancela una reserva vigente; el resto de sus ediciones pasan tal cual.
  if es_dueno then
    if old.estado = 'reservada' and new.estado = 'cancelada' then
      dentro_ventana := (old.fecha + old.hora_inicio) at time zone 'America/Santiago'
        >= now() + interval '24 hours';
      new.cancelado_dentro_ventana := dentro_ventana;
      -- La regla de las 24 h (cancelación tardía = clase realizada) es para el alumno.
      -- Cuando cancela el dueño/entrenador la reserva queda cancelada y el cupo libre.
      new.estado := 'cancelada';
      new.cancelado_por := 'dueño';
    end if;
    return new;
  end if;

  -- A partir de aquí, quien actualiza NO tiene fila en `perfiles`: por la política
  -- RLS "reservas: alumno cancela las propias" solo puede ser un alumno editando su
  -- propia reserva, y solo puede cancelarla — nada más. `estado`/`cancelado_*` los
  -- calcula este trigger, nunca lo que mande el cliente.
  if old.estado <> 'reservada' then
    raise exception 'Esta reserva ya no está vigente';
  end if;
  if new.gimnasio_id is distinct from old.gimnasio_id
    or new.alumno_id is distinct from old.alumno_id
    or new.fecha is distinct from old.fecha
    or new.hora_inicio is distinct from old.hora_inicio
    or new.duracion_min is distinct from old.duracion_min
    or new.creado_por is distinct from old.creado_por
    or new.reserva_previa_id is distinct from old.reserva_previa_id
    or new.notas is distinct from old.notas
  then
    raise exception 'Un alumno solo puede cancelar su propia reserva, no modificarla';
  end if;
  if new.estado <> 'cancelada' then
    raise exception 'Un alumno solo puede cambiar el estado de su reserva a cancelada';
  end if;

  dentro_ventana := (old.fecha + old.hora_inicio) at time zone 'America/Santiago'
    >= now() + interval '24 hours';
  new.cancelado_dentro_ventana := dentro_ventana;
  new.estado := case when dentro_ventana then 'cancelada' else 'realizada' end;
  new.cancelado_por := 'alumno';
  new.atendido_por_dueno := false;

  return new;
end;
$$;
