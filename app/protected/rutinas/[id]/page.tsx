import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateRutina } from "@/app/protected/rutinas/actions";
import { RutinaForm } from "@/components/rutinas/rutina-form";
import { Card, CardContent } from "@/components/ui/card";
import { fetchEjercicios, fetchZonas } from "@/lib/ejercicios";
import { getPerfilActual } from "@/lib/perfil";
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
  const [perfilData, zonas, ejercicios] = await Promise.all([
    getPerfilActual(),
    fetchZonas(),
    fetchEjercicios({ soloActivos: true }),
  ]);
  const updateRutinaConId = updateRutina.bind(null, p.id);

  // Con alumnos que la tienen vigente no se puede editar (también lo valida la acción).
  const { count: asignados } = await supabase
    .from("rutinas")
    .select("*", { count: "exact", head: true })
    .eq("plantilla_id", p.id)
    .eq("activa", true);

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
          Editar rutina
        </div>
        <h2 className="text-2xl">{p.nombre}</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          {asignados ? (
            <p className="text-sm text-muted-foreground">
              No se puede editar: la rutina está asignada a {asignados} alumno
              {asignados === 1 ? "" : "s"}. Para ajustar la rutina de un alumno, hazlo
              desde su ficha, en Membresía.
            </p>
          ) : (
            <RutinaForm
              action={updateRutinaConId}
              plantilla={p}
              submitLabel="Guardar cambios"
              zonas={zonas}
              ejercicios={ejercicios}
              esDueno={perfilData?.perfil.rol === "dueño"}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
