import { redirect } from "next/navigation";

import { LineChart } from "@/components/charts/line-chart";
import { TablaAvances } from "@/components/portal/tabla-avances";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";
import type { Avance } from "@/lib/types";

/** Spec 42: medición corporal del alumno, solo lectura. Lo registra el dueño; RLS solo
 * deja al alumno hacer `select` de sus propios avances. */
export default async function PortalMedicionCorporalPage() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login
  if (!alumno.medicion_corporal_habilitada) redirect("/portal");

  const supabase = await createClient();
  const { data } = await supabase
    .from("avances")
    .select("*")
    .eq("alumno_id", alumno.id)
    .order("fecha", { ascending: false });
  const avances = (data ?? []) as Avance[];
  const puntosPeso = avances
    .filter((av) => av.peso_kg != null)
    .map((av) => ({ x: av.fecha, y: av.peso_kg! }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Portal del alumno
        </div>
        <h2 className="text-2xl">Medición corporal</h2>
      </div>

      {avances.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tu entrenador aún no registró mediciones para ti.
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
