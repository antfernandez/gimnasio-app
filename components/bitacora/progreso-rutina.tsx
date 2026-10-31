"use client";

import { useMemo, useState } from "react";

import { LineChart } from "@/components/charts/line-chart";
import { PaginadorLocal } from "@/components/ui/paginador-local";
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
import { cortarPagina } from "@/lib/paginacion";
import type { RegistroRutina } from "@/lib/types";

/** Tope de registros del ejercicio seleccionado que alimentan gráfico y grilla (spec 52). */
export const TOPE_REGISTROS_PROGRESO = 30;

/** Compara lo planificado contra lo registrado en la bitácora, de un ejercicio a la vez
 * (spec 52): un filtro elige el ejercicio —siempre hay uno precargado, el de actividad más
 * reciente— y el gráfico de repeticiones y la grilla muestran solo sus últimos
 * `TOPE_REGISTROS_PROGRESO` registros para no colapsar con historiales largos. */
export function ProgresoRutina({ registros }: { registros: RegistroRutina[] }) {
  const { ejercicios, porEjercicio } = useMemo(() => {
    const mapa = new Map<string, RegistroRutina[]>();
    const ultima = new Map<string, string>();
    for (const r of registros) {
      mapa.set(r.ejercicio, [...(mapa.get(r.ejercicio) ?? []), r]);
      if ((ultima.get(r.ejercicio) ?? "") < r.fecha) ultima.set(r.ejercicio, r.fecha);
    }
    // El más reciente primero (precarga); desempata por nombre.
    const nombres = [...mapa.keys()].sort(
      (a, b) => (ultima.get(b) ?? "").localeCompare(ultima.get(a) ?? "") || a.localeCompare(b, "es"),
    );
    return { ejercicios: nombres, porEjercicio: mapa };
  }, [registros]);

  const [elegido, setElegido] = useState<string>(ejercicios[0] ?? "");
  const [pagina, setPagina] = useState(1);

  if (registros.length === 0 || ejercicios.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Todavía no hay registros de bitácora para mostrar progreso.
      </p>
    );
  }

  const ejercicio = porEjercicio.has(elegido) ? elegido : ejercicios[0];
  const todas = [...(porEjercicio.get(ejercicio) ?? [])].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const ordenadas = todas.slice(-TOPE_REGISTROS_PROGRESO);
  const puntos = ordenadas
    .filter((r) => r.reps_realizadas != null)
    .map((r) => ({ x: r.fecha, y: r.reps_realizadas! }));

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-sm">
        <Select
          aria-label="Ejercicio a visualizar"
          value={ejercicio}
          onChange={(e) => {
            setElegido(e.target.value);
            setPagina(1);
          }}
        >
          {ejercicios.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </Select>
      </div>

      {todas.length > ordenadas.length && (
        <p className="text-xs text-muted-foreground">
          Mostrando los últimos {ordenadas.length} de {todas.length} registros.
        </p>
      )}

      <LineChart data={puntos} unidad=" reps" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Series</TableHead>
            <TableHead>Reps</TableHead>
            <TableHead>Peso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cortarPagina(ordenadas, pagina).map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatFecha(r.fecha)}</TableCell>
              <TableCell>{r.series_realizadas ?? "—"}</TableCell>
              <TableCell>{r.reps_realizadas ?? "—"}</TableCell>
              <TableCell>{r.peso_kg ? `${r.peso_kg} kg` : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginadorLocal pagina={pagina} total={ordenadas.length} onCambiar={setPagina} />
    </div>
  );
}
