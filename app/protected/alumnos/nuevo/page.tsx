import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { createAlumno } from "@/app/protected/alumnos/actions";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { Card, CardContent } from "@/components/ui/card";
import { getPerfilActual } from "@/lib/perfil";

export default async function NuevoAlumnoPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/alumnos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a alumnos
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Nuevo alumno</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <AlumnoForm
            action={createAlumno}
            submitLabel="Crear alumno"
          />
        </CardContent>
      </Card>
    </div>
  );
}
