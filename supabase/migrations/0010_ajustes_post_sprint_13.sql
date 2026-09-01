-- Sprint 14: pago que elige plan (con upgrade/downgrade), rutinas como catálogo de
-- plantillas reutilizable, ficha de alumno como pantalla única (reemplaza "Avances"),
-- planes con nombre único. Ver
-- .claude/sprints/sprint-14-ajustes-post-sprint-13.md.

-- ============================================================================
-- Catálogo de rutinas (plantillas reutilizables, separadas de la asignación)
-- ============================================================================

create type categoria_rutina_plantilla as enum ('musculacion', 'cardio', 'general');

create table rutina_plantillas (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  nombre text not null,
  categoria categoria_rutina_plantilla not null default 'general',
  objetivo text,
  contenido jsonb not null default '[]',
  creado_por uuid references perfiles(id),
  modificado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rutina_plantillas_gimnasio on rutina_plantillas(gimnasio_id);

create trigger trg_rutina_plantillas_updated_at
  before update on rutina_plantillas
  for each row execute function set_updated_at();

alter table rutina_plantillas enable row level security;

-- Sin policy de alumno: el catálogo de plantillas es una herramienta interna del
-- dueño/entrenador, no se expone al portal (la asignación resultante en `rutinas`
-- sigue siendo lo único visible para el alumno, sin cambios en esa policy).
create policy "rutina_plantillas: acceso por gimnasio"
  on rutina_plantillas for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- Trazabilidad de qué plantilla originó cada asignación — nula para rutinas ya
-- existentes creadas antes de este sprint (quedan "sin plantilla de origen", sin
-- perder el snapshot que ya tienen en `contenido`).
alter table rutinas add column plantilla_id uuid references rutina_plantillas(id) on delete set null;

-- ============================================================================
-- Pagos: snapshot del plan elegido en cada pago
-- ============================================================================

alter table pagos add column plan_id uuid references planes(id) on delete set null;

-- ============================================================================
-- Planes: nombre único por gimnasio (case/espacio-insensible)
-- ============================================================================

create unique index planes_nombre_unq on planes (gimnasio_id, lower(trim(nombre)));
