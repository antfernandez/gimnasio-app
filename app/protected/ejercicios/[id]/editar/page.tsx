import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { actualizarEjercicio } from "@/app/protected/ejercicios/actions";
import { EjercicioForm } from "@/components/ejercicios/ejercicio-form";
import { Card, CardContent } from "@/components/ui/card";
import { exigirDueno, fetchZonas } from "@/lib/ejercicios";
import { createClient } from "@/lib/supabase/server";
import type { Ejercicio } from "@/lib/types";

export default async function EditarEjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await exigirDueno();

  const supabase = await createClient();
  const { data } = await supabase
    .from("ejercicios")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const e = data as Ejercicio;
  const zonas = await fetchZonas();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/protected/ejercicios/${e.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la ficha
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Editar ejercicio
        </div>
        <h2 className="text-2xl">{e.nombre}</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <EjercicioForm
            action={actualizarEjercicio.bind(null, e.id)}
            zonas={zonas}
            ejercicio={e}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
