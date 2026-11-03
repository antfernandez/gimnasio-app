"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NOMBRES_MES } from "@/lib/turnos";

/** Filtros (año y período) de la grilla de sesiones —Filtrar / Limpiar, spec 62— y descarga
 * del PDF de progreso alineada a la derecha. El PDF sigue la selección vigente de los combos;
 * sin año elegido usa el año actual. */
export function ProgresoPdfSelector({
  alumnoId,
  anios,
  anioInicial,
  anioFiltro,
  mesFiltro,
}: {
  alumnoId: string;
  anios: number[];
  anioInicial: number;
  /** Filtros aplicados hoy a la grilla (de la URL). */
  anioFiltro?: string;
  mesFiltro?: string;
}) {
  const [anio, setAnio] = useState(anioFiltro ?? "");
  const [mes, setMes] = useState(mesFiltro ?? "");
  const href = `/api/export/alumno-progreso?alumno=${alumnoId}&anio=${anio || anioInicial}${mes ? `&mes=${mes}` : ""}`;

  return (
    <form
      action={`/protected/alumnos/${alumnoId}`}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="vista" value="progreso" />
      <input type="hidden" name="tab" value="ejercicios" />
      <div className="grid gap-1.5">
        <Label htmlFor="pdf_anio">Año</Label>
        <Select
          id="pdf_anio"
          name="anio"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          className="w-32"
        >
          <option value="">Todos</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pdf_mes">Período</Label>
        <Select
          id="pdf_mes"
          name="mes"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="w-44"
        >
          <option value="">Año completo</option>
          {NOMBRES_MES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      <BotonLimpiar
        href={`/protected/alumnos/${alumnoId}?vista=progreso&tab=ejercicios`}
        activo={Boolean(anioFiltro || mesFiltro)}
      />
      <a
        href={href}
        className="ml-auto inline-flex h-11 items-center gap-2 rounded-[9px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <Download className="h-4 w-4" />
        Descargar PDF
      </a>
    </form>
  );
}
