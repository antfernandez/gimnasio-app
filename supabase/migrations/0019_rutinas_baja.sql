-- Spec 15: "Dar de baja" una rutina del catálogo. Una rutina de baja no se ofrece para
-- asignar a alumnos, pero se conserva (y se puede reactivar). Las asignaciones ya hechas
-- son copias por alumno (`rutinas`), así que no se ven afectadas.
alter table rutina_plantillas add column activa boolean not null default true;
