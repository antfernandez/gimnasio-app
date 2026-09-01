import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente `service_role` — bypassa RLS por completo. Uso exclusivo del servidor:
 * SOLO en `app/superadmin/**` y solo contra `perfiles`/`gimnasios`/`auth.admin.*`
 * (crear/editar/dar de baja cuentas de Admin). Nunca importar desde código de
 * cliente ni tocar tablas de negocio de un tenant (alumnos, pagos, sitios, etc.)
 * con este cliente — eso rompería el aislamiento "sin visibilidad de nada más" del
 * Superadmin (ver `supabase/migrations/0008_roles_superadmin_aprobacion.sql`).
 * Requiere `SUPABASE_SERVICE_ROLE_KEY` también en las variables de entorno de
 * Vercel (hoy solo confirmado en `.env.local`), o el panel de Superadmin falla en
 * producción.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
