-- Spec 42: el alumno ya no registra avances corporales; solo ve los suyos.
-- Queda únicamente la política de lectura "avances: alumno ve los propios" (0004).
drop policy if exists "avances: alumno registra los propios si está habilitado" on avances;
