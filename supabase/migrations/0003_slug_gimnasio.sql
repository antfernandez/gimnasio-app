-- Sprint 5: columna `slug` en `gimnasios` — identificador único y legible (ej.
-- `fuerza-total`), necesario para el buscador de gimnasio del alumno (Sprint 6) y,
-- más adelante, el CMS (Sprint 7).
--
-- Nullable por ahora: los gimnasios ya existentes (creados en los Sprints 0-1, antes
-- de que este concepto existiera) no tienen un slug asignado retroactivamente aquí, y
-- forzar `not null` habría requerido backfillear datos de negocio desde una migración
-- de esquema. `ensureGymProfile` (lib/perfil.ts) ya genera el slug para todo gimnasio
-- nuevo desde este sprint en adelante.

alter table gimnasios add column slug text;

-- Unicidad case-insensitive: dos gimnasios no pueden compartir el mismo slug aunque
-- difieran en mayúsculas/minúsculas (la app siempre genera slugs en minúsculas, pero
-- el índice lo garantiza a nivel de esquema).
create unique index idx_gimnasios_slug_unique on gimnasios (lower(slug));

alter table gimnasios
  add constraint gimnasios_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
