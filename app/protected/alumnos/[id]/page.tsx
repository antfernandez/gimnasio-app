import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAlumno } from "@/app/protected/alumnos/actions";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { ToggleActivoButton } from "@/components/alumnos/toggle-activo-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import type { Alumno } from "@/lib/types";

export default async function FichaAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!alumno) notFound();

  const a = alumno as Alumno;
  const updateAlumnoConId = updateAlumno.bind(null, a.id);

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Ficha de alumno
            </div>
            <h2 className="text-2xl">
              {a.nombres} {a.apellidos}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/protected/pagos/${a.id}`}
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Ver pagos
            </Link>
            <Link
              href={`/protected/rutinas/${a.id}`}
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Ver rutinas
            </Link>
            <Badge variant={a.activo ? "success" : "secondary"}>
              {a.activo ? "Activo" : "De baja"}
            </Badge>
            <ToggleActivoButton
              id={a.id}
              activo={a.activo}
              nombreCompleto={`${a.nombres} ${a.apellidos}`}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
            <span>RUT {formatRut(a.rut, a.dig_ver)}</span>
            <span>Alumno desde {formatFecha(a.fecha_inicio)}</span>
          </div>
          <AlumnoForm
            action={updateAlumnoConId}
            alumno={a}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
