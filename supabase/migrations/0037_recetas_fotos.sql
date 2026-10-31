-- Spec 51: foto opcional por receta (preparación del plato), en un bucket privado.
-- Las fotos se comprimen en el cliente (≤ 500 KB, 1280 px) y Storage vuelve a limitar
-- tamaño y tipo (sin SVG). Ruta: `<gimnasio_id>/<uuid>.<ext>`.

alter table recetas add column if not exists foto_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recetas-fotos',
  'recetas-fotos',
  false,
  512000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura: el staff de la carpeta de su gimnasio; el alumno solo las fotos de las recetas
-- que su RLS de `recetas` le deja ver (plan nutricional con asignación activa).
create policy "recetas-fotos: lectura"
  on storage.objects for select
  using (
    bucket_id = 'recetas-fotos'
    and (
      (storage.foldername(name))[1] in (select gimnasio_id::text from perfiles where id = auth.uid())
      or name in (select foto_path from recetas where foto_path is not null)
    )
  );

create policy "recetas-fotos: staff sube a su carpeta"
  on storage.objects for insert
  with check (
    bucket_id = 'recetas-fotos'
    and (storage.foldername(name))[1] in (select gimnasio_id::text from perfiles where id = auth.uid())
  );

create policy "recetas-fotos: staff borra de su carpeta"
  on storage.objects for delete
  using (
    bucket_id = 'recetas-fotos'
    and (storage.foldername(name))[1] in (select gimnasio_id::text from perfiles where id = auth.uid())
  );
