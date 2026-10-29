import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CargaMasivaAlumnos } from "@/components/alumnos/carga-masiva-alumnos";
import { Card, CardContent } from "@/components/ui/card";
import { MAX_FILAS } from "@/lib/carga-alumnos";
import { getPerfilActual } from "@/lib/perfil";

export default async function CargaMasivaPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/alumnos"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Alumnos
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Carga masiva de alumnos</h2>
      </div>

      {perfilData.perfil.rol !== "dueño" ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Solo la dueña del gimnasio puede cargar alumnos de forma masiva.
          </CardContent>
        </Card>
      ) : (
        <CargaMasivaAlumnos maxFilas={MAX_FILAS} />
      )}
    </div>
  );
}
