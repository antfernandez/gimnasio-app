import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { LogoutButton } from "@/components/logout-button";
import { SuperadminNav } from "@/components/superadmin/superadmin-nav";
import { getSuperadminActual } from "@/lib/superadmin";

// Mismo motivo que /protected y /portal: contenido 100% dinámico por sesión, sin
// valor en un shell estático.
export const instant = false;

// Shell propio, deliberadamente NO reutiliza `app/protected/layout.tsx`: ese layout
// llama `getPerfilActual()`, que si no encuentra fila en `perfiles` la CREA (alta
// lazy de gimnasio+perfil) — un superadmin autenticado terminaría con un gimnasio
// fantasma. El Superadmin nunca pasa por esa función.
export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const superadmin = await getSuperadminActual();
  if (!superadmin) {
    redirect("/auth/login/superadmin");
  }

  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col border-b border-border bg-[hsl(33_50%_86%)] px-5 py-7 md:border-b-0 md:border-r">
        <div>
          <BrandMark className="mb-8 px-1" />
          <div className="mb-6 border-b border-border pb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
              SA
            </div>
            <h4 className="font-sans text-sm font-semibold text-foreground">
              Superadmin
            </h4>
            <span className="text-xs text-muted-foreground">
              Valinor Estudio
            </span>
            <div className="mt-3 flex justify-center">
              <LogoutButton />
            </div>
          </div>
          <SuperadminNav />
        </div>
      </aside>

      <main className="px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
