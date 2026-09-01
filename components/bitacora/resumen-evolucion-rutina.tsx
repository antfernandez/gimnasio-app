"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import { inicioDeSemana, sumarDias } from "@/lib/turnos";
import type { RegistroRutina, Rutina } from "@/lib/types";

type Periodo = "dia" | "semana" | "mes" | "año";

const OPCIONES: { value: Periodo; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "año", label: "Año" },
];

function claveDeBucket(fecha: string, periodo: Periodo): string {
  if (periodo === "dia") return fecha;
  if (periodo === "semana") return inicioDeSemana(fecha);
  if (periodo === "mes") return fecha.slice(0, 7);
  return fecha.slice(0, 4);
}

function rangoDeBucket(clave: string, periodo: Periodo): string {
  if (periodo === "dia") return formatFecha(clave);
  if (periodo === "semana") {
    return `${formatFecha(clave)} – ${formatFecha(sumarDias(clave, 6))}`;
  }
  if (periodo === "mes") {
    const [y, m] = clave.split("-");
    return `${m}/${y}`;
  }
  return clave;
}

/** Sprint 15, Partes F/G: reemplaza a `ProgresoRutina` (gráfico por ejercicio) solo
 * en el portal del alumno — la pantalla "Bitácora" del dueño sigue usando el
 * gráfico, sin cambios. Agrupa los registros por el período elegido usando
 * directamente `fecha` (día = la fecha completa; semana = `inicioDeSemana`, ya
 * existente en `lib/turnos.ts`; mes/año = los primeros 7/4 caracteres) — no hace
 * falta ninguna función nueva de agrupación de fechas. */
export function ResumenEvolucionRutina({
  registros,
  rutinas,
}: {
  registros: RegistroRutina[];
  rutinas: Rutina[];
}) {
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  const nombrePorRutina = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rutinas) m.set(r.id, r.nombre);
    return m;
  }, [rutinas]);

  const filas = useMemo(() => {
    const buckets = new Map<string, RegistroRutina[]>();
    for (const r of registros) {
      const clave = claveDeBucket(r.fecha, periodo);
      const lista = buckets.get(clave) ?? [];
      lista.push(r);
      buckets.set(clave, lista);
    }

    return [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([clave, filasBucket]) => {
        const rutinasTrabajadas = [
          ...new Set(filasBucket.map((f) => nombrePorRutina.get(f.rutina_id) ?? "—")),
        ];
        const sesiones = new Set(filasBucket.map((f) => f.fecha)).size;
        const totalSeries = filasBucket.reduce(
          (acc, f) => acc + (f.series_realizadas ?? 0),
          0,
        );
        const totalReps = filasBucket.reduce((acc, f) => acc + (f.reps_realizadas ?? 0), 0);
        const masReciente = [...filasBucket].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];

        return {
          clave,
          rango: rangoDeBucket(clave, periodo),
          rutinas: rutinasTrabajadas.join(", "),
          sesiones,
          totalSeries,
          totalReps,
          pesoReciente: masReciente?.peso_kg ?? null,
        };
      });
  }, [registros, periodo, nombrePorRutina]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:max-w-[200px]">
        <Label htmlFor="periodo">Período</Label>
        <Select
          id="periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
        >
          {OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {filas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Todavía no hay registros de bitácora para mostrar progreso.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Rutina(s)</TableHead>
              <TableHead>Sesiones</TableHead>
              <TableHead>Series</TableHead>
              <TableHead>Reps</TableHead>
              <TableHead>Peso más reciente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => (
              <TableRow key={f.clave}>
                <TableCell className="font-medium text-foreground">{f.rango}</TableCell>
                <TableCell className="text-muted-foreground">{f.rutinas}</TableCell>
                <TableCell>{f.sesiones}</TableCell>
                <TableCell>{f.totalSeries}</TableCell>
                <TableCell>{f.totalReps}</TableCell>
                <TableCell>{f.pesoReciente ? `${f.pesoReciente} kg` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
