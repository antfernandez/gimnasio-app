import { redirect } from "next/navigation";
import Link from "next/link";

import { SitioPublicoView } from "@/components/sitio/sitio-publico-view";
import { getSitioActual } from "@/lib/sitio-actual";

// Contenido 100% dinámico por sesión (borrador del dueño actual) — mismo motivo que
// /protected/layout.tsx y /portal/layout.tsx, ver la nota ahí.
export const instant = false;

// Ruta propia (no bajo /protected) a propósito: /protected/layout.tsx envuelve todo
// en el shell del panel del dueño (sidebar, max-w-4xl), y esta vista previa necesita
// verse igual que el sitio público real. El gate de sesión lo pone igual `proxy.ts`
// (no está en la lista de rutas públicas); acá además exigimos que sea specíficamente
// un dueño/entrenador con sitio propio, igual que en /protected/sitio.
export default async function VistaPreviaSitioPage() {
  const sitioData = await getSitioActual();
  if (!sitioData) redirect("/auth/login");

  return (
    <div>
      <div className="flex items-center justify-between gap-4 bg-foreground px-6 py-2.5 text-xs text-background">
        <span>
          Vista previa — así se vería tu sitio con el borrador actual. Esto{" "}
          <strong>no está publicado</strong>.
        </span>
        <Link href="/protected/sitio" className="underline underline-offset-4">
          Volver al editor
        </Link>
      </div>
      <SitioPublicoView
        nombreGimnasio={sitioData.gimnasioNombre}
        tema={sitioData.sitio.tema}
        colorAcento={sitioData.sitio.color_acento}
        contenido={sitioData.sitio.contenido_borrador}
      />
    </div>
  );
}
