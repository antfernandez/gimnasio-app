-- Sprint 12: reenfoque 100% Valinor + tres roles reales (Superadmin/Admin/Alumno).
-- Ver .claude/sprints/sprint-12-ajustes-post-sprint-11.md.

-- Fecha de nacimiento del alumno (Parte E) — no existía. Nullable: los alumnos ya
-- cargados (por el dueño, sin este dato) quedan vacíos, no se retropuebla.
alter table alumnos add column fecha_nacimiento date;

-- Aprobación manual del alumno por el Admin (Parte D). Default 'aprobado' a propósito:
-- todo alumno que YA existe en la base (cargado a mano por el dueño hasta hoy) queda
-- aprobado de inmediato, sin retroactividad — la cola de pendientes solo se llena con
-- registros nuevos hechos por el propio alumno desde `sign-up/alumno`, que la app
-- inserta explícitamente en 'pendiente' (ver `lib/alumno-portal.ts`). El alta manual
-- del dueño (`createAlumno`, Sprint 1) tampoco pasa por aprobación: ya es un alta
-- hecha por el propio dueño, no autoservicio.
alter table alumnos add column estado_aprobacion text not null default 'aprobado'
  check (estado_aprobacion in ('pendiente', 'aprobado', 'rechazado'));
create index idx_alumnos_estado_aprobacion
  on alumnos(gimnasio_id, estado_aprobacion)
  where estado_aprobacion = 'pendiente';

-- Superadmin: NO es una fila en `perfiles` a propósito. `perfiles` es lo que las
-- políticas RLS de todas las tablas de negocio (alumnos, pagos, rutinas, avances,
-- turnos, paquetes, sitios) usan como "acceso por gimnasio" — si el Superadmin
-- tuviera fila ahí quedaría atado a UN gimnasio y heredaría acceso completo a sus
-- datos, justo lo que Parte C prohíbe ("sin visibilidad de nada más"). Se modela
-- como tabla propia, sin `gimnasio_id`, y el panel de Superadmin (`app/superadmin/`)
-- usa el cliente `service_role` (bypassa RLS) para las únicas dos tablas que sí
-- necesita tocar: `perfiles` y `gimnasios` — nunca alumnos/pagos/sitios de un tenant.
-- No se autoregistra: se inserta a mano en la base (Parte C, bullet 1).
create table superadmins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table superadmins enable row level security;

-- Un superadmin puede verificar su propia condición (usado por el login y por
-- `getSuperadminActual()`). No hay política para ver OTRAS filas: administrar
-- superadmins entre sí queda fuera de alcance de este sprint (solo hay uno, Antonio).
create policy "superadmins: verifica su propia fila"
  on superadmins for select
  using (id = auth.uid());

-- Un alumno solo puede reservar turnos u registrar avances propios si ya fue
-- aprobado por el Admin (Parte D, bullet 3: "no puede operar mientras esté
-- pendiente"). El resto de operaciones de solo lectura del portal se restringe a
-- nivel de UI (`app/portal/*`), no aquí — este sprint es un ajuste acotado, no un
-- endurecimiento general de RLS (eso ya se hizo en el Sprint 8).
drop policy if exists "reservas: alumno crea las propias" on reservas;
create policy "reservas: alumno crea las propias"
  on reservas for insert
  with check (
    creado_por = 'alumno'
    and alumno_id in (
      select id from alumnos
      where user_id = auth.uid() and estado_aprobacion = 'aprobado'
    )
    and gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid())
  );

drop policy if exists "avances: alumno registra los propios si está habilitado" on avances;
create policy "avances: alumno registra los propios si está habilitado"
  on avances for insert
  with check (
    alumno_id in (
      select id from alumnos
      where user_id = auth.uid()
        and puede_registrar_avances = true
        and estado_aprobacion = 'aprobado'
    )
  );

-- `alumnos_enforce_self_service_columns` (migración 0004) restringe qué columnas
-- puede tocar un alumno editando su propia ficha, pero se escribió antes de que
-- existiera `estado_aprobacion` — sin este ajuste, un alumno podría autoaprobarse
-- llamando directo a `supabase.from('alumnos').update({estado_aprobacion:'aprobado'})`,
-- saltándose por completo la Parte D de este sprint (la política RLS de UPDATE solo
-- exige `user_id = auth.uid()`, no restringe columnas). Se redefine la misma función
-- agregando esa única columna a la lista prohibida.
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
    or new.plan_contratado is distinct from old.plan_contratado
    or new.fecha_inicio is distinct from old.fecha_inicio
    or new.activo is distinct from old.activo
    or new.puede_registrar_avances is distinct from old.puede_registrar_avances
    or new.estado_aprobacion is distinct from old.estado_aprobacion
  then
    raise exception 'Un alumno solo puede editar su correo y teléfono de contacto';
  end if;

  return new;
end;
$$;
