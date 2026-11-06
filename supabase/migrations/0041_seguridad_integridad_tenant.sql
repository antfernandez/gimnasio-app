-- Spec 64 (seguridad, hallazgos H4 y H9 del test OWASP del 2026-11-05).
-- 1) Un registro hijo debe apuntar a un alumno de SU MISMO gimnasio (RLS sólo validaba gimnasio_id).
-- 2) Funciones auxiliares ya no ejecutables por usuarios sin sesión.

-- ---------------------------------------------------------------------------
-- 0) Verificación previa: si hay filas incoherentes, se aborta listando cuántas.
-- ---------------------------------------------------------------------------
do $$
declare
  v_tabla text;
  v_n bigint;
  v_total bigint := 0;
  v_detalle text := '';
begin
  foreach v_tabla in array array[
    'pagos', 'rutinas', 'avances', 'paquetes', 'reservas', 'registros_rutina',
    'asignaciones_nutricionales', 'solicitudes_pago', 'solicitudes_cambio_plan'
  ] loop
    execute format(
      'select count(*) from %I t join alumnos a on a.id = t.alumno_id where a.gimnasio_id <> t.gimnasio_id',
      v_tabla
    ) into v_n;
    if v_n > 0 then
      v_total := v_total + v_n;
      v_detalle := v_detalle || format(' %s=%s', v_tabla, v_n);
    end if;
  end loop;
  if v_total > 0 then
    raise exception 'Hay filas con alumno de otro gimnasio:%. Revisarlas antes de aplicar 0041.', v_detalle;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Trigger genérico de coherencia alumno <-> gimnasio.
-- ---------------------------------------------------------------------------
create or replace function validar_alumno_gimnasio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- solicitudes_pago (flujo suscripción) no lleva alumno.
  if new.alumno_id is null then
    return new;
  end if;
  if not exists (
    select 1 from alumnos a where a.id = new.alumno_id and a.gimnasio_id = new.gimnasio_id
  ) then
    -- Mismo mensaje exista o no el alumno: no sirve para enumerar ids de otros gimnasios.
    raise exception 'El alumno no pertenece a este gimnasio' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function validar_alumno_gimnasio() from public, anon, authenticated;

do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array[
    'pagos', 'rutinas', 'avances', 'paquetes', 'reservas', 'registros_rutina',
    'asignaciones_nutricionales', 'solicitudes_pago', 'solicitudes_cambio_plan'
  ] loop
    execute format('drop trigger if exists trg_validar_alumno_gimnasio on %I', v_tabla);
    execute format(
      'create trigger trg_validar_alumno_gimnasio
         before insert or update of alumno_id, gimnasio_id on %I
         for each row execute function validar_alumno_gimnasio()',
      v_tabla
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Funciones auxiliares: sólo usuarios con sesión.
-- ---------------------------------------------------------------------------
revoke execute on function gimnasio_sin_perfiles(uuid) from public, anon;
grant execute on function gimnasio_sin_perfiles(uuid) to authenticated;

revoke execute on function usuario_es_alumno() from public, anon;
grant execute on function usuario_es_alumno() to authenticated;

revoke execute on function plan_sistema_requerido(uuid) from public, anon;
grant execute on function plan_sistema_requerido(uuid) to authenticated;
