import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { createRutina } from "@/app/protected/rutinas/actions";
import { RutinaForm } from "@/components/rutinas/rutina-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NuevaPlantillaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/rutinas"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a rutinas
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Nueva plantilla de rutina</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RutinaForm action={createRutina} submitLabel="Crear plantilla" />
        </CardContent>
      </Card>
    </div>
  );
}
