-- Spec 24: módulo Nutrición (alimentos → recetas → planes → asignación a alumno).
--
-- Alimentos: globales (gimnasio_id null, de solo lectura, cargados por seed) o propios del
-- gimnasio. Recetas, planes y asignaciones: siempre del gimnasio. Gestión: dueño y
-- entrenador. El alumno solo lee lo que está en su asignación activa.

create type categoria_alimento as enum (
  'proteina', 'carbohidrato', 'grasa', 'fruta', 'verdura', 'lacteo',
  'legumbre', 'cereal', 'suplemento', 'condimento', 'bebida', 'otro'
);
create type tipo_receta as enum ('desayuno', 'colacion', 'almuerzo', 'cena', 'snack');
create type dificultad_receta as enum ('facil', 'media', 'dificil');
create type estado_receta as enum ('activo', 'borrador');
create type objetivo_nutricional as enum (
  'deficit_calorico', 'mantenimiento', 'volumen', 'salud_general', 'deportivo'
);
create type estado_plan_nutricional as enum ('activo', 'borrador', 'archivado');
create type estado_asignacion_nutricional as enum ('activo', 'pausado', 'completado', 'cancelado');

-- ============================================================================
-- Tablas
-- ============================================================================

create table alimentos (
  id uuid primary key default gen_random_uuid(),
  -- null = alimento global (seed), solo lectura para los gimnasios.
  gimnasio_id uuid references gimnasios(id) on delete cascade,
  nombre text not null,
  categoria categoria_alimento not null,
  -- Valores por 100 g.
  calorias numeric(7,1) not null default 0 check (calorias >= 0),
  proteina numeric(6,1) not null default 0 check (proteina >= 0),
  carbohidratos numeric(6,1) not null default 0 check (carbohidratos >= 0),
  grasas numeric(6,1) not null default 0 check (grasas >= 0),
  -- Porción opcional (p. ej. "scoop" de 30 g).
  unidad_porcion text,
  gramos_porcion numeric(7,1) check (gramos_porcion is null or gramos_porcion > 0),
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Sin duplicados por nombre y ámbito (global / gimnasio).
create unique index alimentos_global_nombre_unq on alimentos (lower(nombre)) where gimnasio_id is null;
create unique index alimentos_gimnasio_nombre_unq on alimentos (gimnasio_id, lower(nombre)) where gimnasio_id is not null;
create index idx_alimentos_gimnasio on alimentos(gimnasio_id);

create table recetas (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  nombre text not null,
  tipo tipo_receta not null default 'almuerzo',
  dificultad dificultad_receta not null default 'facil',
  porciones int not null default 1 check (porciones > 0),
  tiempo_min int check (tiempo_min is null or tiempo_min >= 0),
  descripcion text,
  preparacion text,
  estado estado_receta not null default 'activo',
  url_video text,
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gimnasio_id, nombre)
);
create index idx_recetas_gimnasio on recetas(gimnasio_id);

create table receta_ingredientes (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  receta_id uuid not null references recetas(id) on delete cascade,
  -- restrict: no se borra un alimento que está en una receta.
  alimento_id uuid references alimentos(id) on delete restrict,
  -- Ingrediente en texto libre (sin macros) cuando no hay alimento del catálogo.
  nombre_manual text,
  cantidad numeric(8,1) not null check (cantidad > 0),
  -- 'g' (gramos/ml) o 'porcion' (usa gramos_porcion del alimento).
  unidad text not null default 'g' check (unidad in ('g', 'porcion')),
  orden int not null default 0,
  check (alimento_id is not null or nullif(trim(nombre_manual), '') is not null)
);
create index idx_receta_ingredientes_receta on receta_ingredientes(receta_id);

create table planes_nutricionales (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  nombre text not null,
  objetivo objetivo_nutricional not null default 'salud_general',
  estado estado_plan_nutricional not null default 'borrador',
  descripcion text,
  instrucciones text,
  meta_calorias numeric(7,1) check (meta_calorias is null or meta_calorias >= 0),
  meta_proteina numeric(6,1) check (meta_proteina is null or meta_proteina >= 0),
  meta_carbohidratos numeric(6,1) check (meta_carbohidratos is null or meta_carbohidratos >= 0),
  meta_grasas numeric(6,1) check (meta_grasas is null or meta_grasas >= 0),
  duracion_dias int check (duracion_dias is null or duracion_dias > 0),
  creado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gimnasio_id, nombre)
);
create index idx_planes_nutricionales_gimnasio on planes_nutricionales(gimnasio_id);

create table plan_nutricional_recetas (
  plan_id uuid not null references planes_nutricionales(id) on delete cascade,
  -- restrict: no se borra una receta que está en un plan.
  receta_id uuid not null references recetas(id) on delete restrict,
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  primary key (plan_id, receta_id)
);
create index idx_plan_nutricional_recetas_receta on plan_nutricional_recetas(receta_id);

create table asignaciones_nutricionales (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  -- restrict: un plan asignado no se elimina (se archiva).
  plan_id uuid references planes_nutricionales(id) on delete restrict,
  responsable_id uuid references perfiles(id),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  notas text,
  estado estado_asignacion_nutricional not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);
create index idx_asignaciones_nutricionales_gimnasio on asignaciones_nutricionales(gimnasio_id);
create index idx_asignaciones_nutricionales_alumno on asignaciones_nutricionales(alumno_id);
-- Un alumno tiene como máximo una asignación activa a la vez.
create unique index asignaciones_nutricionales_activa_unq
  on asignaciones_nutricionales(alumno_id) where estado = 'activo';

create trigger trg_alimentos_updated_at before update on alimentos
  for each row execute function set_updated_at();
create trigger trg_recetas_updated_at before update on recetas
  for each row execute function set_updated_at();
create trigger trg_planes_nutricionales_updated_at before update on planes_nutricionales
  for each row execute function set_updated_at();
create trigger trg_asignaciones_nutricionales_updated_at before update on asignaciones_nutricionales
  for each row execute function set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

alter table alimentos enable row level security;
alter table recetas enable row level security;
alter table receta_ingredientes enable row level security;
alter table planes_nutricionales enable row level security;
alter table plan_nutricional_recetas enable row level security;
alter table asignaciones_nutricionales enable row level security;

-- Alimentos: lectura de los globales + los del propio gimnasio (staff y alumnos);
-- escritura solo de los propios del gimnasio por el staff.
create policy "alimentos: lectura"
  on alimentos for select
  using (
    gimnasio_id is null and auth.uid() is not null
    or gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid())
    or gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid())
  );
create policy "alimentos: alta staff"
  on alimentos for insert
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "alimentos: edición staff"
  on alimentos for update
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "alimentos: baja staff"
  on alimentos for delete
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- Recetas, ingredientes, planes y vínculo plan-receta: staff del gimnasio con CRUD;
-- el alumno solo lee lo que está en su asignación activa.
create policy "recetas: staff"
  on recetas for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "recetas: lectura alumno"
  on recetas for select
  using (id in (
    select pr.receta_id
    from plan_nutricional_recetas pr
    join asignaciones_nutricionales a on a.plan_id = pr.plan_id and a.estado = 'activo'
    join alumnos al on al.id = a.alumno_id
    where al.user_id = auth.uid()
  ));

create policy "receta_ingredientes: staff"
  on receta_ingredientes for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "receta_ingredientes: lectura alumno"
  on receta_ingredientes for select
  using (receta_id in (
    select pr.receta_id
    from plan_nutricional_recetas pr
    join asignaciones_nutricionales a on a.plan_id = pr.plan_id and a.estado = 'activo'
    join alumnos al on al.id = a.alumno_id
    where al.user_id = auth.uid()
  ));

create policy "planes_nutricionales: staff"
  on planes_nutricionales for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "planes_nutricionales: lectura alumno"
  on planes_nutricionales for select
  using (id in (
    select a.plan_id
    from asignaciones_nutricionales a
    join alumnos al on al.id = a.alumno_id
    where al.user_id = auth.uid() and a.estado = 'activo'
  ));

create policy "plan_nutricional_recetas: staff"
  on plan_nutricional_recetas for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "plan_nutricional_recetas: lectura alumno"
  on plan_nutricional_recetas for select
  using (plan_id in (
    select a.plan_id
    from asignaciones_nutricionales a
    join alumnos al on al.id = a.alumno_id
    where al.user_id = auth.uid() and a.estado = 'activo'
  ));

create policy "asignaciones_nutricionales: staff"
  on asignaciones_nutricionales for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "asignaciones_nutricionales: lectura alumno"
  on asignaciones_nutricionales for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));

-- ============================================================================
-- Seed de alimentos globales (por 100 g). Idempotente: no duplica al reejecutar.
-- Valores aproximados de tablas nutricionales de uso común; revisar (Spec 24 §10.5).
-- ============================================================================

insert into alimentos (gimnasio_id, nombre, categoria, calorias, proteina, carbohidratos, grasas, unidad_porcion, gramos_porcion) values
  -- Proteínas
  (null, 'Pechuga de pollo cocida', 'proteina', 165, 31.0, 0, 3.6, null, null),
  (null, 'Muslo de pollo sin piel cocido', 'proteina', 209, 26.0, 0, 10.9, null, null),
  (null, 'Carne de vacuno magra cocida', 'proteina', 217, 26.0, 0, 12.0, null, null),
  (null, 'Carne molda magra cocida', 'proteina', 230, 26.0, 0, 14.0, null, null),
  (null, 'Lomo de cerdo cocido', 'proteina', 242, 27.0, 0, 14.0, null, null),
  (null, 'Pavo pechuga cocida', 'proteina', 135, 30.0, 0, 1.0, null, null),
  (null, 'Salmón cocido', 'proteina', 206, 22.0, 0, 12.0, null, null),
  (null, 'Atún en agua', 'proteina', 116, 26.0, 0, 1.0, 'lata', 120),
  (null, 'Merluza cocida', 'proteina', 105, 22.0, 0, 1.7, null, null),
  (null, 'Huevo entero', 'proteina', 143, 12.6, 0.7, 9.5, 'unidad', 50),
  (null, 'Clara de huevo', 'proteina', 52, 10.9, 0.7, 0.2, 'unidad', 33),
  (null, 'Tofu firme', 'proteina', 144, 15.7, 3.9, 8.7, null, null),
  -- Carbohidratos
  (null, 'Arroz blanco cocido', 'carbohidrato', 130, 2.7, 28.0, 0.3, null, null),
  (null, 'Arroz integral cocido', 'carbohidrato', 123, 2.7, 25.6, 1.0, null, null),
  (null, 'Papa cocida', 'carbohidrato', 87, 1.9, 20.1, 0.1, null, null),
  (null, 'Camote cocido', 'carbohidrato', 90, 2.0, 20.7, 0.2, null, null),
  (null, 'Fideos cocidos', 'carbohidrato', 158, 5.8, 30.9, 0.9, null, null),
  (null, 'Pan integral', 'carbohidrato', 247, 13.0, 41.0, 3.4, 'rebanada', 30),
  (null, 'Pan marraqueta', 'carbohidrato', 270, 9.0, 55.0, 1.5, 'unidad', 80),
  (null, 'Quinoa cocida', 'carbohidrato', 120, 4.4, 21.3, 1.9, null, null),
  (null, 'Choclo cocido', 'carbohidrato', 96, 3.4, 21.0, 1.5, null, null),
  -- Grasas
  (null, 'Palta', 'grasa', 160, 2.0, 8.5, 14.7, null, null),
  (null, 'Aceite de oliva', 'grasa', 884, 0, 0, 100.0, 'cucharada', 14),
  (null, 'Almendras', 'grasa', 579, 21.2, 21.6, 49.9, null, null),
  (null, 'Nueces', 'grasa', 654, 15.2, 13.7, 65.2, null, null),
  (null, 'Maní', 'grasa', 567, 25.8, 16.1, 49.2, null, null),
  (null, 'Mantequilla de maní', 'grasa', 588, 25.0, 20.0, 50.0, 'cucharada', 16),
  (null, 'Semillas de chía', 'grasa', 486, 16.5, 42.1, 30.7, 'cucharada', 12),
  -- Frutas
  (null, 'Plátano', 'fruta', 89, 1.1, 22.8, 0.3, 'unidad', 120),
  (null, 'Manzana', 'fruta', 52, 0.3, 13.8, 0.2, 'unidad', 180),
  (null, 'Naranja', 'fruta', 47, 0.9, 11.8, 0.1, 'unidad', 150),
  (null, 'Frutillas', 'fruta', 32, 0.7, 7.7, 0.3, null, null),
  (null, 'Arándanos', 'fruta', 57, 0.7, 14.5, 0.3, null, null),
  (null, 'Uvas', 'fruta', 69, 0.7, 18.1, 0.2, null, null),
  (null, 'Kiwi', 'fruta', 61, 1.1, 14.7, 0.5, 'unidad', 75),
  (null, 'Durazno', 'fruta', 39, 0.9, 9.5, 0.3, 'unidad', 150),
  -- Verduras
  (null, 'Brócoli cocido', 'verdura', 35, 2.4, 7.2, 0.4, null, null),
  (null, 'Espinaca cruda', 'verdura', 23, 2.9, 3.6, 0.4, null, null),
  (null, 'Lechuga', 'verdura', 15, 1.4, 2.9, 0.2, null, null),
  (null, 'Tomate', 'verdura', 18, 0.9, 3.9, 0.2, 'unidad', 120),
  (null, 'Zanahoria', 'verdura', 41, 0.9, 9.6, 0.2, null, null),
  (null, 'Zapallo italiano', 'verdura', 17, 1.2, 3.1, 0.3, null, null),
  (null, 'Pimentón', 'verdura', 31, 1.0, 6.0, 0.3, null, null),
  (null, 'Champiñones', 'verdura', 22, 3.1, 3.3, 0.3, null, null),
  (null, 'Cebolla', 'verdura', 40, 1.1, 9.3, 0.1, null, null),
  -- Lácteos
  (null, 'Leche descremada', 'lacteo', 34, 3.4, 5.0, 0.1, 'vaso', 200),
  (null, 'Leche entera', 'lacteo', 61, 3.2, 4.8, 3.3, 'vaso', 200),
  (null, 'Yogurt natural sin azúcar', 'lacteo', 59, 10.0, 3.6, 0.4, 'pote', 150),
  (null, 'Yogurt griego natural', 'lacteo', 97, 9.0, 3.9, 5.0, 'pote', 150),
  (null, 'Queso fresco', 'lacteo', 174, 12.0, 3.0, 13.0, null, null),
  (null, 'Queso cottage', 'lacteo', 98, 11.1, 3.4, 4.3, null, null),
  (null, 'Queso mantecoso', 'lacteo', 340, 24.0, 1.0, 27.0, 'laminas', 20),
  -- Legumbres
  (null, 'Lentejas cocidas', 'legumbre', 116, 9.0, 20.1, 0.4, null, null),
  (null, 'Garbanzos cocidos', 'legumbre', 164, 8.9, 27.4, 2.6, null, null),
  (null, 'Porotos negros cocidos', 'legumbre', 132, 8.9, 23.7, 0.5, null, null),
  (null, 'Porotos blancos cocidos', 'legumbre', 139, 9.7, 25.1, 0.5, null, null),
  (null, 'Arvejas cocidas', 'legumbre', 84, 5.4, 15.6, 0.2, null, null),
  -- Cereales
  (null, 'Avena en hojuelas', 'cereal', 389, 16.9, 66.3, 6.9, 'cucharada', 10),
  (null, 'Granola', 'cereal', 471, 10.0, 64.0, 20.0, null, null),
  (null, 'Cereal de maíz', 'cereal', 357, 7.0, 84.0, 0.4, null, null),
  (null, 'Harina de avena', 'cereal', 381, 13.0, 67.0, 7.0, null, null),
  -- Suplementos
  (null, 'Proteína whey (polvo)', 'suplemento', 400, 80.0, 8.0, 6.0, 'scoop', 30),
  (null, 'Creatina monohidrato', 'suplemento', 0, 0, 0, 0, 'scoop', 5),
  (null, 'Caseína (polvo)', 'suplemento', 370, 78.0, 6.0, 3.0, 'scoop', 33),
  -- Condimentos
  (null, 'Miel', 'condimento', 304, 0.3, 82.4, 0, 'cucharadita', 7),
  (null, 'Mermelada light', 'condimento', 100, 0.3, 24.0, 0.1, 'cucharada', 15),
  (null, 'Salsa de soya', 'condimento', 53, 8.1, 4.9, 0.6, 'cucharada', 15),
  (null, 'Jugo de limón', 'condimento', 22, 0.4, 6.9, 0.2, 'cucharada', 15),
  -- Bebidas
  (null, 'Leche de almendras sin azúcar', 'bebida', 15, 0.6, 0.3, 1.2, 'vaso', 200),
  (null, 'Jugo de naranja natural', 'bebida', 45, 0.7, 10.4, 0.2, 'vaso', 200),
  (null, 'Café sin azúcar', 'bebida', 1, 0.1, 0, 0, 'taza', 200)
on conflict (lower(nombre)) where gimnasio_id is null do nothing;
