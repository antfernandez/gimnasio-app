-- Sprint 7: CMS autoadministrable — cada gimnasio tiene un sitio público propio
-- (borrador + publicado) accesible en /g/[slug] (slug agregado en el Sprint 5).
--
-- Diseño: `contenido_borrador` es donde el dueño edita; `contenido_publicado` es lo que
-- se sirve en la ruta pública. Separarlos evita que un cambio a medio escribir se vea
-- en el sitio en vivo, y habilita la vista previa (renderiza `contenido_borrador`,
-- solo visible para el dueño) sin tocar lo publicado.

create table sitios (
  gimnasio_id uuid primary key references gimnasios(id) on delete cascade,
  tema text not null default 'oscuro' check (tema in ('oscuro', 'claro')),
  color_acento text not null default '#ff4b26' check (
    color_acento in ('#ff4b26', '#c6ff3d', '#c9a24d', '#4d9f6c', '#3d7fff', '#e0483a', '#8b5cf6', '#ec4899')
  ),
  contenido_borrador jsonb not null default '{}',
  contenido_publicado jsonb,
  publicado_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger trg_sitios_updated_at
  before update on sitios
  for each row execute function set_updated_at();

-- Historial de versiones publicadas, para "restaurar versión anterior". Se inserta una
-- fila cada vez que el dueño publica (ver `publicarSitio`, app/protected/sitio/actions.ts);
-- el propio server action recorta a las últimas 10 por gimnasio.
create table sitio_versiones (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  tema text not null,
  color_acento text not null,
  contenido jsonb not null,
  created_at timestamptz not null default now()
);
create index idx_sitio_versiones_gimnasio on sitio_versiones(gimnasio_id, created_at desc);

alter table sitios enable row level security;
alter table sitio_versiones enable row level security;

-- Solo el dueño/entrenador del gimnasio ve y edita su sitio (borrador incluido). La
-- ruta pública NUNCA lee esta tabla directamente — usa `obtener_sitio_publico(slug)`
-- (abajo), que expone solo lo publicado. Mismo patrón que "alumnos: acceso por
-- gimnasio" (migración 0001).
create policy "sitios: acceso por gimnasio"
  on sitios for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "sitio_versiones: acceso por gimnasio"
  on sitio_versiones for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- Lectura pública del sitio publicado de un gimnasio, por slug. SECURITY DEFINER +
-- solo columnas seguras (nunca `contenido_borrador`, que puede tener cambios a medio
-- redactar) — mismo patrón que `buscar_gimnasios` (Sprint 6). Devuelve 0 filas si el
-- gimnasio no existe, no tiene slug, no tiene nada publicado, o está `cancelado`.
create or replace function obtener_sitio_publico(p_slug text)
returns table (
  nombre text,
  tema text,
  color_acento text,
  contenido jsonb,
  publicado_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select g.nombre, s.tema, s.color_acento, s.contenido_publicado, s.publicado_at
  from gimnasios g
  join sitios s on s.gimnasio_id = g.id
  where g.slug = p_slug
    and g.estado = 'activo'
    and s.contenido_publicado is not null;
$$;

grant execute on function obtener_sitio_publico(text) to public;

-- Listado de slugs con sitio publicado, para el sitemap público (app/sitemap.ts).
-- Mismo motivo que la función anterior: el sitemap no tiene sesión de usuario, así que
-- no puede leer `sitios`/`gimnasios` directo bajo RLS.
create or replace function listar_sitios_publicados()
returns table (slug text)
language sql
security definer
set search_path = public
stable
as $$
  select g.slug
  from gimnasios g
  join sitios s on s.gimnasio_id = g.id
  where g.slug is not null
    and g.estado = 'activo'
    and s.contenido_publicado is not null;
$$;

grant execute on function listar_sitios_publicados() to public;

-- Storage: imágenes del sitio (logo, banners, galería, fotos de equipo). Bucket
-- público de solo lectura; escritura restringida al dueño/entrenador del propio
-- gimnasio vía el primer segmento de la ruta del archivo (convención de la app:
-- `${gimnasio_id}/${uuid}-${nombre}`, ver components/sitio/image-uploader.tsx).
-- Límite de 5MB y solo formatos de imagen comunes, aplicado por Storage mismo (no solo
-- en el cliente).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sitio-imagenes',
  'sitio-imagenes',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "sitio-imagenes: lectura pública"
  on storage.objects for select
  using (bucket_id = 'sitio-imagenes');

create policy "sitio-imagenes: el dueño sube a su propia carpeta"
  on storage.objects for insert
  with check (
    bucket_id = 'sitio-imagenes'
    and (storage.foldername(name))[1] in (
      select gimnasio_id::text from perfiles where id = auth.uid()
    )
  );

create policy "sitio-imagenes: el dueño borra de su propia carpeta"
  on storage.objects for delete
  using (
    bucket_id = 'sitio-imagenes'
    and (storage.foldername(name))[1] in (
      select gimnasio_id::text from perfiles where id = auth.uid()
    )
  );
