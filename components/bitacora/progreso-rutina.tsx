"use client";

import { useMemo, useState } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { NOMBRES_MES } from "@/lib/turnos";
import type { RegistroRutina } from "@/lib/types";

/** Tope de registros del ejercicio seleccionado que alimentan gráfico y grilla (spec 52). */
export const TOPE_REGISTROS_PROGRESO = 30;

type Filtros = { anio: string; mes: string; ejercicio: string };

/** Compara lo planificado contra lo registrado en la bitácora, de un ejercicio a la vez.
 * Spec 62: filtros año, período y ejercicio con Filtrar / Limpiar (se aplican al pulsar
 * Filtrar); siempre hay un ejercicio precargado —el de actividad más reciente— y los gráficos
 * de barras (repeticiones y peso) y la grilla muestran sus últimos `TOPE_REGISTROS_PROGRESO`
 * registros para no colapsar con historiales largos. */
export function ProgresoRutina({ registros }: { registros: RegistroRutina[] }) {
  const { ejercicios, porEjercicio, anios } = useMemo(() => {
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
    const anios = [...new Set(registros.map((r) => r.fecha.slice(0, 4)))].sort().reverse();
    return { ejercicios: nombres, porEjercicio: mapa, anios };
  }, [registros]);

  const inicial: Filtros = { anio: "", mes: "", ejercicio: ejercicios[0] ?? "" };
  const [borrador, setBorrador] = useState<Filtros>(inicial);
  const [aplicado, setAplicado] = useState<Filtros>(inicial);
  const [pagina, setPagina] = useState(1);

  if (registros.length === 0 || ejercicios.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Todavía no hay registros de bitácora para mostrar progreso.
      </p>
    );
  }

  const ejercicio = porEjercicio.has(aplicado.ejercicio) ? aplicado.ejercicio : ejercicios[0];
  const todas = [...(porEjercicio.get(ejercicio) ?? [])]
    .filter(
      (r) =>
        (!aplicado.anio || r.fecha.slice(0, 4) === aplicado.anio) &&
        (!aplicado.mes || Number(r.fecha.slice(5, 7)) === Number(aplicado.mes)),
    )
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const ordenadas = todas.slice(-TOPE_REGISTROS_PROGRESO);
  const puntosReps = ordenadas
    .filter((r) => r.reps_realizadas != null)
    .map((r) => ({ x: r.fecha, y: r.reps_realizadas! }));
  const puntosPeso = ordenadas
    .filter((r) => r.peso_kg != null && Number(r.peso_kg) > 0)
    .map((r) => ({ x: r.fecha, y: Number(r.peso_kg) }));
  const hayFiltros = Boolean(aplicado.anio || aplicado.mes || aplicado.ejercicio !== inicial.ejercicio);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setAplicado(borrador);
          setPagina(1);
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="pe_anio">Año</Label>
          <Select
            id="pe_anio"
            value={borrador.anio}
            onChange={(e) => setBorrador({ ...borrador, anio: e.target.value })}
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
          <Label htmlFor="pe_mes">Período</Label>
          <Select
            id="pe_mes"
            value={borrador.mes}
            onChange={(e) => setBorrador({ ...borrador, mes: e.target.value })}
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
        <div className="grid min-w-[12rem] flex-1 gap-1.5 sm:max-w-sm">
          <Label htmlFor="pe_ejercicio">Ejercicio</Label>
          <Select
            id="pe_ejercicio"
            value={borrador.ejercicio}
            onChange={(e) => setBorrador({ ...borrador, ejercicio: e.target.value })}
          >
            {ejercicios.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </Select>
        </div>
        <Button size="sm" type="submit" variant="outline">
          Filtrar
        </Button>
        <BotonLimpiar
          activo={hayFiltros || borrador !== aplicado}
          onClick={() => {
            setBorrador(inicial);
            setAplicado(inicial);
            setPagina(1);
          }}
        />
      </form>

      {todas.length > ordenadas.length && (
        <p className="text-xs text-muted-foreground">
          Mostrando los últimos {ordenadas.length} de {todas.length} registros.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Repeticiones
          </h4>
          <BarChart data={puntosReps} unidad=" reps" medida="repeticiones" />
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Peso
          </h4>
          <BarChart data={puntosPeso} unidad=" kg" medida="peso" />
        </div>
      </div>
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
