import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createRutina } from "@/app/protected/rutinas/actions";
import { RutinaForm } from "@/components/rutinas/rutina-form";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Alumno } from "@/lib/types";

export default async function NuevaRutinaPage({
  params,
}: {
  params: Promise<{ alumnoId: string }>;
}) {
  const { alumnoId } = await params;

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", alumnoId)
    .maybeSingle();

  if (!alumno) notFound();
  const a = alumno as Alumno;
  const createRutinaConId = createRutina.bind(null, a.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/protected/rutinas/${a.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a rutinas de {a.nombres} {a.apellidos}
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Nueva rutina para
        </div>
        <h2 className="text-2xl">
          {a.nombres} {a.apellidos}
        </h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RutinaForm action={createRutinaConId} />
        </CardContent>
      </Card>
    </div>
  );
}
