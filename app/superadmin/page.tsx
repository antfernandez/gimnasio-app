import { redirect } from "next/navigation";

import { AdminRow } from "@/components/superadmin/admin-row";
import { CrearAdminForm } from "@/components/superadmin/crear-admin-form";
import { Card, CardContent } from "@/components/ui/card";
import { getSuperadminActual } from "@/lib/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Gimnasio, Perfil } from "@/lib/types";

export const instant = false;

interface AdminItem {
  perfil: Perfil;
  gimnasio: Gimnasio;
  email: string;
}

/**
 * Usa el cliente `service_role`: sin fila en `perfiles`, el Superadmin no pasa
 * ninguna política RLS sobre `perfiles`/`gimnasios` con el cliente normal (a
 * propósito, ver `supabase/migrations/0008_roles_superadmin_aprobacion.sql`).
 * Solo lee estas dos tablas — nunca alumnos/pagos/sitios de un tenant.
 */
async function listarAdmins(): Promise<AdminItem[]> {
  const admin = createAdminClient();
  const { data: perfiles } = await admin
    .from("perfiles")
    .select("*, gimnasios(*)")
    .eq("rol", "dueño")
    .order("created_at", { ascending: false });

  if (!perfiles) return [];

  const items: AdminItem[] = [];
  for (const row of perfiles as Array<Perfil & { gimnasios: Gimnasio | null }>) {
    const { gimnasios: gimnasio, ...perfil } = row;
    if (!gimnasio) continue;
    const { data: userData } = await admin.auth.admin.getUserById(perfil.id);
    items.push({ perfil, gimnasio, email: userData.user?.email ?? "—" });
  }
  return items;
}

export default async function SuperadminPage() {
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const admins = await listarAdmins();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel Superadmin
        </div>
        <h2 className="text-2xl">Administradores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea, edita y da de baja cuentas de dueño/a. Este panel no tiene acceso a
          alumnos, pagos ni contenido del sitio de ningún gimnasio.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Crear cuenta de Admin
          </h3>
          <CrearAdminForm />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {admins.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay cuentas de Admin creadas.
          </p>
        ) : (
          admins.map((a) => (
            <AdminRow
              key={a.perfil.id}
              perfil={a.perfil}
              gimnasio={a.gimnasio}
              email={a.email}
            />
          ))
        )}
      </div>
    </div>
  );
}
