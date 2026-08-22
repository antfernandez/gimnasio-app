-- Sprint 1: falta una política de INSERT sobre `gimnasios`. La migración 0001 solo
-- dejó SELECT ("gimnasios: acceso por pertenencia"), así que el flujo de onboarding
-- (crear el gimnasio + perfil del dueño en el primer login post-confirmación, ver
-- lib/perfil.ts) fallaba por RLS. Cualquier usuario autenticado puede dar de alta un
-- gimnasio; en la práctica la app solo lo hace una vez por usuario, cuando aún no
-- tiene perfil (ver "Consideraciones de implementación" en modelo-datos-negocio.md).
--
-- v2: la primera versión usaba `to authenticated with check (true)`, pero en este
-- proyecto las sesiones autenticadas no matchean el rol Postgres `authenticated`
-- (a diferencia de otros proyectos Supabase estándar) — probablemente por el uso
-- de "publishable/secret keys" en vez de las anon/service_role keys clásicas. El
-- resto de las políticas del esquema (perfiles, alumnos, pagos...) evitan ese
-- problema apoyándose en `auth.uid()` en vez de restringir por rol, así que esta
-- versión sigue el mismo patrón.

drop policy if exists "gimnasios: alta por usuario autenticado" on gimnasios;

create policy "gimnasios: alta por usuario autenticado"
  on gimnasios for insert
  with check (auth.uid() is not null);
