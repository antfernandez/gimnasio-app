"use client";

import { useState } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { Button } from "@/components/ui/button";
import { etiquetaMes } from "@/lib/format";

export type PuntoMensual = { x: string; y: number };

/** Spec 58: avance en rutina por mes; alterna entre repeticiones (promedio por serie
 * registrada) y peso (promedio de los registros con carga) para ver mejoras. */
export function AvanceRutinaChart({ reps, peso }: { reps: PuntoMensual[]; peso: PuntoMensual[] }) {
  const [medida, setMedida] = useState<"reps" | "peso">("reps");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 self-start rounded-full border border-border p-1">
        <Button type="button" size="sm" variant={medida === "reps" ? "default" : "ghost"} onClick={() => setMedida("reps")}>
          Repeticiones
        </Button>
        <Button type="button" size="sm" variant={medida === "peso" ? "default" : "ghost"} onClick={() => setMedida("peso")}>
          Peso
        </Button>
      </div>
      {medida === "reps" ? (
        <BarChart data={reps} unidad=" reps" medida="repeticiones" formatoX={etiquetaMes} />
      ) : (
        <BarChart data={peso} unidad=" kg" medida="peso" formatoX={etiquetaMes} />
      )}
    </div>
  );
}
