import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EjercicioAcciones } from "@/components/ejercicios/ejercicio-acciones";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { exigirDueno } from "@/lib/ejercicios";
import { createClient } from "@/lib/supabase/server";
import type { Ejercicio } from "@/lib/types";

function Lineas({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{titulo}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {texto.split("\n").map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{valor}</dd>
    </div>
  );
}

export default async function EjercicioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ actualizado?: string }>;
}) {
  const { id } = await params;
  const { actualizado } = await searchParams;
  await exigirDueno();

  const supabase = await createClient();
  const { data } = await supabase
    .from("ejercicios")
    .select("*, zonas_cuerpo(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const { zonas_cuerpo, ...resto } = data as Ejercicio & {
    zonas_cuerpo: { nombre: string } | null;
  };
  const e = resto as Ejercicio;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/ejercicios"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a ejercicios
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {zonas_cuerpo?.nombre ?? "Ejercicio"}
          {e.subgrupo ? ` · ${e.subgrupo}` : ""}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl">{e.nombre}</h2>
          {!e.activo && <Badge variant="outline">Inactivo</Badge>}
        </div>
      </div>

      {actualizado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Ejercicio actualizado correctamente.
        </div>
      )}

      <EjercicioAcciones id={e.id} nombre={e.nombre} activo={e.activo} />

      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Dato etiqueta="Equipo" valor={e.equipo} />
            <Dato etiqueta="Músculo principal" valor={e.musculo_principal} />
            <Dato etiqueta="Secundarios" valor={e.musculos_secundarios} />
          </dl>
          <Lineas titulo="Posición inicial" texto={e.posicion_inicial} />
          <Lineas titulo="Ejecución" texto={e.ejecucion} />
          <Lineas titulo="Notas" texto={e.notas} />
          {e.url_referencia && (
            <a
              href={e.url_referencia}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Ver ficha de referencia
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {!e.posicion_inicial && !e.ejecucion && !e.notas && !e.url_referencia && (
            <p className="text-sm text-muted-foreground">
              Este ejercicio no tiene ficha técnica.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
