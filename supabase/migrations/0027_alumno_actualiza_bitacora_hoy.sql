-- Spec 33: la bitácora del portal se guarda fila por fila; el alumno puede volver a
-- guardar (modificar) un ejercicio de hoy que él mismo registró, si está habilitado.
create policy "registros_rutina: alumno modifica los propios de hoy si está habilitado"
  on registros_rutina for update
  using (
    origen = 'alumno'
    and fecha = current_date
    and alumno_id in (
      select id from alumnos
      where user_id = auth.uid() and puede_registrar_bitacora = true
    )
  )
  with check (
    origen = 'alumno'
    and fecha = current_date
    and alumno_id in (
      select id from alumnos
      where user_id = auth.uid() and puede_registrar_bitacora = true
    )
  );
