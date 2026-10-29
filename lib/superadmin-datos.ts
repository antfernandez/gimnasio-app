import { createAdminClient } from "@/lib/supabase/admin";
import type { GimnasioSuscripcion } from "@/lib/superadmin-metricas";

export interface GimnasioAdmin extends GimnasioSuscripcion {
  dueno_id: string | null;
  dueno_nombre: string;
  email: string;
}

/**
 * Gimnasios con su dueño/a y email, con `service_role` (el superadmin no pasa RLS).
 * Solo lee `gimnasios`, `perfiles` y `auth.users`; nunca alumnos ni pagos de alumnos.
 */
export async function listarGimnasiosAdmin(): Promise<GimnasioAdmin[]> {
  const admin = createAdminClient();
  const [{ data: gimnasios }, { data: perfiles }, { data: usuarios }] = await Promise.all([
    admin
      .from("gimnasios")
      .select("id, nombre, estado, plan_sistema_id, suscripcion_hasta, created_at")
      .order("created_at", { ascending: false }),
    admin.from("perfiles").select("id, gimnasio_id, nombre_completo").eq("rol", "dueño"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emails = new Map((usuarios?.users ?? []).map((u) => [u.id, u.email ?? "—"]));
  const duenos = new Map((perfiles ?? []).map((p) => [p.gimnasio_id as string, p]));

  return ((gimnasios ?? []) as GimnasioSuscripcion[]).map((g) => {
    const d = duenos.get(g.id);
    return {
      ...g,
      dueno_id: d?.id ?? null,
      dueno_nombre: d?.nombre_completo ?? "—",
      email: d ? (emails.get(d.id) ?? "—") : "—",
    };
  });
}
