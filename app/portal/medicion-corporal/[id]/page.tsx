import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { formatFecha } from "@/lib/format";
import { listarMedidas } from "@/lib/medidas";
import { createClient } from "@/lib/supabase/server";
import type { Avance } from "@/lib/types";

/** Spec 56: detalle de una medición corporal en página propia (antes un modal). Solo
 * lectura; filtra por `alumno_id` y la RLS refuerza que sea una medición propia. */
export default async function PortalMedicionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login
  if (!alumno.medicion_corporal_habilitada) redirect("/portal");

  const supabase = await createClient();
  const { data } = await supabase
    .from("avances")
    .select("*")
    .eq("id", id)
    .eq("alumno_id", alumno.id)
    .maybeSingle();
  if (!data) notFound();
  const avance = data as Avance;
  const medidas = listarMedidas(avance.medidas);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal/medicion-corporal"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a medición corporal
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Portal del alumno
        </div>
        <h2 className="text-2xl">Medición del {formatFecha(avance.fecha)}</h2>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="rounded-[9px] border border-border px-5 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Peso</div>
            <div className="font-display text-3xl">{avance.peso_kg ? `${avance.peso_kg} kg` : "—"}</div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Medidas
            </h3>
            {medidas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin medidas registradas.</p>
            ) : (
              <ul className="grid gap-x-10 sm:grid-cols-2">
                {medidas.map((m) => (
                  <li
                    key={m.etiqueta}
                    className="flex justify-between border-b border-border/60 py-3 text-base"
                  >
                    <span className="text-muted-foreground">{m.etiqueta}</span>
                    <span className="font-medium text-foreground">{m.valor} cm</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {avance.notas && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Notas
              </h3>
              <p className="whitespace-pre-line text-base">{avance.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
