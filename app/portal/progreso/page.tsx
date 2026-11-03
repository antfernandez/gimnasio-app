import Link from "next/link";

import { BitacoraHistorialPortal } from "@/components/bitacora/bitacora-historial-portal";
import { LineChart } from "@/components/charts/line-chart";
import { TablaAvances } from "@/components/portal/tabla-avances";
import { ProgresoRutinaPortal } from "@/components/progreso/progreso-rutina-portal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type { Avance, RegistroRutina, Rutina } from "@/lib/types";

// Contenido dinámico por usuario (sesión y datos del gimnasio); mismo criterio que el layout.
export const instant = false;

/** Spec 59: módulo Progreso del alumno. Reúne el progreso de la rutina (indicadores,
 * filtros por período y gráficos de barras por ejercicio), el historial de la bitácora y,
 * si está habilitada, la medición corporal (antes un módulo aparte). Solo lectura. */
export default async function PortalProgresoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login

  const cabecera = (
    <div>
      <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Portal del alumno
      </div>
      <h2 className="text-2xl">Progreso</h2>
    </div>
  );

  if (alumno.estado_aprobacion !== "aprobado") {
    return (
      <div className="flex flex-col gap-6">
        {cabecera}
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tu solicitud todavía no fue aprobada por tu estudio.
          </CardContent>
        </Card>
      </div>
    );
  }

  const hayMedicion = alumno.medicion_corporal_habilitada;
  const tabActiva = hayMedicion && tab === "medicion" ? "medicion" : "rutina";
  const supabase = await createClient();

  return (
    <div className="flex flex-col gap-6">
      {cabecera}

      {hayMedicion && (
        <div className="flex flex-wrap items-center gap-1 self-start rounded-full border border-border p-1">
          {(
            [
              ["rutina", "Rutina"],
              ["medicion", "Medición corporal"],
            ] as const
          ).map(([value, label]) => (
            <Button key={value} asChild size="sm" variant={tabActiva === value ? "default" : "ghost"}>
              <Link href={value === "rutina" ? "/portal/progreso" : "/portal/progreso?tab=medicion"}>{label}</Link>
            </Button>
          ))}
        </div>
      )}

      {tabActiva === "rutina" ? await RutinaTab() : await MedicionTab()}
    </div>
  );

  async function RutinaTab() {
    const [{ data: rutinas }, { data: registros }] = await Promise.all([
      supabase
        .from("rutinas")
        .select("*")
        .eq("alumno_id", alumno!.id)
        .order("fecha_asignacion", { ascending: false }),
      supabase
        .from("registros_rutina")
        .select("*")
        .eq("alumno_id", alumno!.id)
        .order("fecha", { ascending: false }),
    ]);
    const listaRutinas = (rutinas ?? []) as Rutina[];
    const listaRegistros = (registros ?? []) as RegistroRutina[];

    return (
      <>
        <ProgresoRutinaPortal registros={listaRegistros} hoy={hoyIso()} />
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de bitácora
            </h3>
            {listaRegistros.length === 0 && !alumno!.puede_registrar_bitacora ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tu entrenador aún no registró sesiones de bitácora para ti.
              </p>
            ) : (
              <BitacoraHistorialPortal registros={listaRegistros} rutinas={listaRutinas} />
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  async function MedicionTab() {
    const { data } = await supabase
      .from("avances")
      .select("*")
      .eq("alumno_id", alumno!.id)
      .order("fecha", { ascending: false });
    const avances = (data ?? []) as Avance[];
    const puntosPeso = avances
      .filter((av) => av.peso_kg != null)
      .map((av) => ({ x: av.fecha, y: av.peso_kg! }));

    if (avances.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tu entrenador aún no registró mediciones para ti.
          </CardContent>
        </Card>
      );
    }
    return (
      <>
        {puntosPeso.length > 1 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Evolución del peso
              </h3>
              <LineChart data={puntosPeso} unidad=" kg" />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de avances
            </h3>
            <TablaAvances avances={avances} />
          </CardContent>
        </Card>
      </>
    );
  }
}
