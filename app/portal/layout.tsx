import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";

// Mismo shell bloqueante que /protected/layout.tsx: contenido 100% dinámico
// por usuario, sin valor en un shell estático. Ver nota ahí y la guía de
// Cache Components en node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md.
export const instant = false;
import { LogoutButton } from "@/components/logout-button";
import { PortalNav } from "@/components/portal/portal-nav";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";
import type { Gimnasio } from "@/lib/types";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const alumno = await getAlumnoActual();
  if (!alumno) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const { data: gimnasio } = await supabase
    .from("gimnasios")
    .select("*")
    .eq("id", alumno.gimnasio_id)
    .maybeSingle();

  const inicial = alumno.nombres.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col justify-between border-b border-border bg-secondary/40 px-5 py-7 md:border-b-0 md:border-r">
        <div>
          <BrandMark className="mb-8 px-1" />
          <div className="mb-6 border-b border-border pb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
              {inicial}
            </div>
            <h4 className="font-sans text-sm font-semibold text-foreground">
              {alumno.nombres} {alumno.apellidos}
            </h4>
            <span className="text-xs text-muted-foreground">
              {(gimnasio as Gimnasio | null)?.nombre ?? "Tu gimnasio"}
            </span>
            <div className="mx-auto mt-3 inline-block rounded-full border border-border bg-primary/10 px-3 py-1 text-[0.66rem] uppercase tracking-wide text-secondary-foreground">
              Portal del alumno
            </div>
          </div>
          <PortalNav />
        </div>
        <LogoutButton />
      </aside>

      <main className="px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
