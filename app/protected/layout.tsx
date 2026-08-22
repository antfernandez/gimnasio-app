import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";

// Todo el panel protegido es contenido dinámico por usuario (cookies de sesión,
// datos del gimnasio) sin valor real en un "shell" estático — lo dejamos bloqueante
// en vez de forzar streaming/Suspense por cada página. Ver guía de Cache Components
// en node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md.
export const instant = false;
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/protected/sidebar-nav";
import { getPerfilActual } from "@/lib/perfil";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getPerfilActual();
  if (!data) {
    redirect("/auth/login");
  }
  const { perfil, gimnasio } = data;
  const inicial = perfil.nombre_completo.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col justify-between border-b border-border bg-secondary/40 px-5 py-7 md:border-b-0 md:border-r">
        <div>
          <BrandMark className="mb-8 px-1" />
          <div className="mb-6 border-b border-border pb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(42,71%,74%)] to-[hsl(39,49%,36%)] font-display text-xl font-semibold text-primary-foreground">
              {inicial}
            </div>
            <h4 className="font-sans text-sm font-semibold text-foreground">
              {perfil.nombre_completo}
            </h4>
            <span className="text-xs text-muted-foreground">
              {gimnasio.nombre}
            </span>
            <div className="mx-auto mt-3 inline-block rounded-full border border-border bg-primary/10 px-3 py-1 text-[0.66rem] uppercase tracking-wide text-secondary-foreground">
              Plan {gimnasio.plan}
            </div>
          </div>
          <SidebarNav />
        </div>
        <LogoutButton />
      </aside>

      <main className="px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
