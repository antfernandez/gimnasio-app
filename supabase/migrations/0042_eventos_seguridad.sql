-- Spec 69: registro de eventos de seguridad.
-- Lectura sólo para superadmin (RLS); inserción sólo por service_role (sin política de INSERT
-- para clientes: con RLS activo y sin política, anon/authenticated no pueden escribir).
-- `detalle` nunca debe llevar contraseñas, tokens, RUT ni montos completos de tarjeta.

create table if not exists eventos_seguridad (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null check (char_length(tipo) between 1 and 60),
  gimnasio_id uuid references gimnasios(id) on delete set null,
  usuario_id uuid,
  detalle jsonb not null default '{}'::jsonb,
  ip text
);

create index if not exists eventos_seguridad_created_at_idx on eventos_seguridad (created_at desc);
create index if not exists eventos_seguridad_tipo_created_at_idx on eventos_seguridad (tipo, created_at desc);

alter table eventos_seguridad enable row level security;

drop policy if exists "eventos_seguridad: lectura superadmin" on eventos_seguridad;
create policy "eventos_seguridad: lectura superadmin"
  on eventos_seguridad for select
  using (exists (select 1 from superadmins s where s.id = auth.uid()));

-- Sin políticas de INSERT/UPDATE/DELETE: sólo service_role (que bypassa RLS) escribe.
revoke all on eventos_seguridad from anon, authenticated;
grant select on eventos_seguridad to authenticated;

-- Retención: purga de eventos con más de 12 meses (se invoca al leer, ver lib/seguridad-eventos.ts).
create or replace function purgar_eventos_seguridad()
returns void
language sql
security definer
set search_path = public
as $$
  delete from eventos_seguridad where created_at < now() - interval '12 months';
$$;

revoke all on function purgar_eventos_seguridad() from public, anon, authenticated;
grant execute on function purgar_eventos_seguridad() to service_role;
