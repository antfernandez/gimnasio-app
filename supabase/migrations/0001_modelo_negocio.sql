-- Extensión para gen_random_uuid()
create extension if not exists pgcrypto;

-- Enums
create type plan_gimnasio as enum ('prueba', 'inicial', 'crecimiento');
create type estado_gimnasio as enum ('activo', 'cancelado');
create type rol_perfil as enum ('dueño', 'entrenador');
create type metodo_pago as enum ('efectivo', 'transferencia', 'tarjeta', 'otro');

-- Tenant raíz
create table gimnasios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  plan plan_gimnasio not null default 'prueba',
  estado estado_gimnasio not null default 'activo',
  fecha_inicio_plan date not null default current_date,
  created_at timestamptz not null default now()
);

-- Usuarios (extiende auth.users)
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  nombre_completo text not null,
  rol rol_perfil not null default 'dueño',
  created_at timestamptz not null default now()
);

-- Alumnos
create table alumnos (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  rut integer not null,
  dig_ver text not null check (dig_ver ~ '^[0-9K]$'),
  nombres text not null,
  apellidos text not null,
  email text,
  telefono text,
  plan_contratado text not null,
  fecha_inicio date not null default current_date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gimnasio_id, rut)
);
create index idx_alumnos_gimnasio on alumnos(gimnasio_id);

-- Pagos
create table pagos (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  monto numeric(10,2) not null,
  fecha_pago date not null default current_date,
  metodo metodo_pago not null default 'efectivo',
  periodo_desde date not null,
  periodo_hasta date not null,
  created_at timestamptz not null default now()
);
create index idx_pagos_alumno_periodo on pagos(alumno_id, periodo_hasta);

-- Rutinas
create table rutinas (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  creado_por uuid references perfiles(id) on delete set null,
  nombre text not null,
  objetivo text,
  contenido jsonb not null default '[]',
  fecha_asignacion date not null default current_date,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_rutinas_alumno_activa on rutinas(alumno_id, activa);

-- Avances
create table avances (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  registrado_por uuid references perfiles(id) on delete set null,
  fecha date not null default current_date,
  peso_kg numeric(5,2),
  medidas jsonb not null default '{}',
  notas text,
  created_at timestamptz not null default now()
);
create index idx_avances_alumno_fecha on avances(alumno_id, fecha);

-- Trigger: mantener alumnos.updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_alumnos_updated_at
  before update on alumnos
  for each row execute function set_updated_at();

-- Vista para dashboard y estado de pago
create or replace view v_estado_pago_alumnos as
select
  a.id as alumno_id,
  a.gimnasio_id,
  a.nombres,
  a.apellidos,
  a.activo,
  max(p.periodo_hasta) as vencimiento_actual,
  case
    when max(p.periodo_hasta) >= current_date then 'al_dia'
    when max(p.periodo_hasta) is null then 'sin_pagos'
    else 'atrasado'
  end as estado_pago
from alumnos a
left join pagos p on p.alumno_id = a.id
group by a.id, a.gimnasio_id, a.nombres, a.apellidos, a.activo;

-- Row Level Security
alter table gimnasios enable row level security;
alter table perfiles enable row level security;
alter table alumnos enable row level security;
alter table pagos enable row level security;
alter table rutinas enable row level security;
alter table avances enable row level security;

create policy "perfiles: acceso propio"
  on perfiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "gimnasios: acceso por pertenencia"
  on gimnasios for select
  using (id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "alumnos: acceso por gimnasio"
  on alumnos for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "pagos: acceso por gimnasio"
  on pagos for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "rutinas: acceso por gimnasio"
  on rutinas for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "avances: acceso por gimnasio"
  on avances for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
