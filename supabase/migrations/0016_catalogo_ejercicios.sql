-- Catálogo de ejercicios por zona del cuerpo (panel del dueño). Ver
-- .claude/specs/02_spec_catalogo_ejercicios.md.
--
-- Lectura: dueño y entrenador del gimnasio. Escritura: solo el dueño. Sin policy
-- de alumno ni de superadmin (el catálogo es una herramienta interna del staff).

-- ============================================================================
-- Zonas del cuerpo
-- ============================================================================

create table zonas_cuerpo (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  nombre text not null,
  orden int not null default 0,
  -- "Cardio" y "Personalizados": no se pueden eliminar ni renombrar.
  es_sistema boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gimnasio_id, nombre)
);
create index idx_zonas_cuerpo_gimnasio on zonas_cuerpo(gimnasio_id);

create trigger trg_zonas_cuerpo_updated_at
  before update on zonas_cuerpo
  for each row execute function set_updated_at();

-- ============================================================================
-- Ejercicios
-- ============================================================================

create table ejercicios (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  -- restrict: no se puede borrar una zona que todavía tiene ejercicios.
  zona_id uuid not null references zonas_cuerpo(id) on delete restrict,
  nombre text not null,
  subgrupo text,
  equipo text,
  musculo_principal text,
  musculos_secundarios text,
  posicion_inicial text,
  ejecucion text,
  notas text,
  url_referencia text,
  origen text not null default 'manual' check (origen in ('seed', 'manual')),
  activo boolean not null default true,
  creado_por uuid references perfiles(id),
  modificado_por uuid references perfiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gimnasio_id, zona_id, nombre)
);
create index idx_ejercicios_gimnasio on ejercicios(gimnasio_id);
create index idx_ejercicios_gimnasio_zona on ejercicios(gimnasio_id, zona_id);

create trigger trg_ejercicios_updated_at
  before update on ejercicios
  for each row execute function set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

alter table zonas_cuerpo enable row level security;
alter table ejercicios enable row level security;

create policy "zonas_cuerpo: lectura por gimnasio"
  on zonas_cuerpo for select
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "zonas_cuerpo: alta solo dueño"
  on zonas_cuerpo for insert
  with check (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ));

create policy "zonas_cuerpo: edición solo dueño"
  on zonas_cuerpo for update
  using (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ))
  with check (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ));

create policy "zonas_cuerpo: baja solo dueño"
  on zonas_cuerpo for delete
  using (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ));

create policy "ejercicios: lectura por gimnasio"
  on ejercicios for select
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "ejercicios: alta solo dueño"
  on ejercicios for insert
  with check (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ));

create policy "ejercicios: edición solo dueño"
  on ejercicios for update
  using (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ))
  with check (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ));

create policy "ejercicios: baja solo dueño"
  on ejercicios for delete
  using (gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid() and rol = 'dueño'
  ));
