-- Spec 63: orden de las recetas dentro de un plan nutricional (primero, segundo, ...).
-- El portal del alumno (spec 60) muestra las recetas en este orden. Las filas existentes
-- quedan con 0 y se desempatan por nombre de receta.

alter table plan_nutricional_recetas add column if not exists orden integer not null default 0;
