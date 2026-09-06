import { redirect } from "next/navigation";
import { connection } from "next/server";

import { BrandMark } from "@/components/brand-mark";

// Todo el panel protegido es contenido dinámico por usuario (cookies de sesión,
// datos del gimnasio) sin valor real en un "shell" estático — lo dejamos bloqueante
// en vez de forzar streaming/Suspense por cada página. Ver guía de Cache Components
// en node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md.
// `export const instant = false` (abajo) NO fuerza esto por sí solo — solo desactiva la
// validación de navegación instantánea; hoy la ruta queda dinámica porque
// `getPerfilActual()` lee `cookies()` (API de tiempo de request) antes de renderizar. El
// `await connection()` explícito de abajo es la red de seguridad si ese camino cambia
// (mismo bug que tenía app/g/[slug]/page.tsx, Sprint 16, cuando dejó de tocar cookies()).
export const instant = false;
import { LogoutButton } from "@/components/logout-button";
import { SidebarMobileToggle } from "@/components/protected/sidebar-mobile-toggle";
import { SidebarNav } from "@/components/protected/sidebar-nav";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const data = await getPerfilActual();
  if (!data) {
    redirect("/auth/login");
  }
  const { perfil, gimnasio } = data;

  // "Dar de baja" (Sprint 12, Parte C) bloquea el acceso al panel — lo hace el
  // Superadmin cambiando `gimnasios.estado` (app/superadmin/actions.ts). Se
  // revisa acá, no solo en el login, porque una sesión ya abierta debe cortarse
  // también.
  if (gimnasio.estado === "cancelado") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/auth/login/dueno?baja=1");
  }
  const inicial = perfil.nombre_completo.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-b border-border bg-secondary/40 px-5 py-5 md:border-b-0 md:border-r md:py-7">
        <BrandMark className="mb-2 px-1 md:mb-8" />
        <SidebarMobileToggle>
          {/* Sprint 15, Parte E: nombre de usuario → nombre del gimnasio → botón
              "Cerrar sesión", en ese orden — el badge de plan se conserva pero pasa a
              mostrarse debajo del botón, no encima. */}
          <div className="mb-6 border-b border-border pb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
              {inicial}
            </div>
            <h4 className="font-sans text-sm font-semibold text-foreground">
              {perfil.nombre_completo}
            </h4>
            <span className="text-xs text-muted-foreground">
              {gimnasio.nombre}
            </span>
            <div className="mt-3">
              <LogoutButton />
            </div>
            <div className="mx-auto mt-3 inline-block rounded-full border border-border bg-primary/10 px-3 py-1 text-[0.66rem] uppercase tracking-wide text-secondary-foreground">
              Plan {gimnasio.plan}
            </div>
          </div>
          <SidebarNav />
        </SidebarMobileToggle>
      </aside>

      <main className="px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
