import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createRegistroRutina } from "@/app/protected/rutinas/actions";
import { BitacoraForm } from "@/components/bitacora/bitacora-form";
import { BitacoraHistorial } from "@/components/bitacora/bitacora-historial";
import { ProgresoRutina } from "@/components/bitacora/progreso-rutina";
import { RutinaCard } from "@/components/rutinas/rutina-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Alumno, RegistroRutina, Rutina } from "@/lib/types";

export default async function RutinasAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ alumnoId: string }>;
  searchParams: Promise<{ creada?: string; bitacora?: string }>;
}) {
  const { alumnoId } = await params;
  const { creada, bitacora } = await searchParams;

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", alumnoId)
    .maybeSingle();

  if (!alumno) notFound();
  const a = alumno as Alumno;

  const [{ data: rutinas }, { data: registros }] = await Promise.all([
    supabase
      .from("rutinas")
      .select("*")
      .eq("alumno_id", alumnoId)
      .order("fecha_asignacion", { ascending: false }),
    supabase
      .from("registros_rutina")
      .select("*")
      .eq("alumno_id", alumnoId)
      .order("fecha", { ascending: false }),
  ]);

  const lista = (rutinas ?? []) as Rutina[];
  const rutinaActiva = lista.find((r) => r.activa);
  const listaRegistros = (registros ?? []) as RegistroRutina[];

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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Rutinas de
            </div>
            <h2 className="text-2xl">
              {a.nombres} {a.apellidos}
            </h2>
          </div>
          <Button asChild size="lg">
            <Link href={`/protected/rutinas/${a.id}/nueva`}>
              <Plus className="h-4 w-4" />
              Nueva rutina
            </Link>
          </Button>
        </div>
      </div>

      {creada === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Rutina asignada correctamente.
        </div>
      )}
      {bitacora === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Sesión registrada en la bitácora.
        </div>
      )}

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Este alumno aún no tiene rutinas asignadas.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((rutina) => (
            <RutinaCard key={rutina.id} rutina={rutina} />
          ))}
        </div>
      )}

      {rutinaActiva && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registrar sesión de bitácora
            </h3>
            <BitacoraForm
              action={createRegistroRutina.bind(null, a.id, rutinaActiva.id)}
              rutina={rutinaActiva}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de bitácora
          </h3>
          <BitacoraHistorial registros={listaRegistros} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Progreso de rutina
          </h3>
          <ProgresoRutina registros={listaRegistros} />
        </CardContent>
      </Card>
    </div>
  );
}
