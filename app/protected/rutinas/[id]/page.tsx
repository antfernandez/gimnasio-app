import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateRutina } from "@/app/protected/rutinas/actions";
import { RutinaForm } from "@/components/rutinas/rutina-form";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { RutinaPlantilla } from "@/lib/types";

export default async function EditarPlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: plantilla } = await supabase
    .from("rutina_plantillas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!plantilla) notFound();
  const p = plantilla as RutinaPlantilla;
  const updateRutinaConId = updateRutina.bind(null, p.id);

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
          Editar plantilla
        </div>
        <h2 className="text-2xl">{p.nombre}</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RutinaForm action={updateRutinaConId} plantilla={p} submitLabel="Guardar cambios" />
        </CardContent>
      </Card>
    </div>
  );
}
