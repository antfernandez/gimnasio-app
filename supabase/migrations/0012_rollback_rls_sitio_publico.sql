-- Sprint 16: rollback de las dos policies RLS creadas ad-hoc durante el diagnóstico del
-- 404 de /g/[slug] (ver .claude/specs/gimnasioappfixsitiopublico (Ajustes para sp15).md,
-- sección 5). Eran innecesarias porque `obtener_sitio_publico` es SECURITY DEFINER (no
-- depende de RLS) y exponían `sitios.contenido_borrador` al rol `anon`.
drop policy if exists "gimnasios: lectura publica del sitio" on public.gimnasios;
drop policy if exists "sitios: lectura publica si publicado" on public.sitios;
