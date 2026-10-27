"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NOMBRES_MES } from "@/lib/turnos";

/** Descarga del PDF de progreso por año completo o por mes. */
export function ProgresoPdfSelector({
  alumnoId,
  anios,
  anioInicial,
}: {
  alumnoId: string;
  anios: number[];
  anioInicial: number;
}) {
  const [anio, setAnio] = useState(String(anioInicial));
  const [mes, setMes] = useState("");
  const href = `/api/export/alumno-progreso?alumno=${alumnoId}&anio=${anio}${mes ? `&mes=${mes}` : ""}`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="pdf_anio">Año</Label>
        <Select
          id="pdf_anio"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          className="w-28"
        >
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
      <a
        href={href}
        className="inline-flex h-11 items-center gap-2 rounded-[9px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <Download className="h-4 w-4" />
        Descargar PDF
      </a>
    </div>
  );
}
