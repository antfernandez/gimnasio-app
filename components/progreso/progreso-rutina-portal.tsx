"use client";

import { Eye, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
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
import { diasDelMes, inicioDeSemana, sumarDias } from "@/lib/turnos";
import type { RegistroRutina } from "@/lib/types";

type Vista = "anio" | "mes" | "semana" | "dia";

const VISTAS: { value: Vista; label: string }[] = [
  { value: "anio", label: "Anual" },
  { value: "mes", label: "Mensual" },
  { value: "semana", label: "Semanal" },
  { value: "dia", label: "Diario" },
];

/** Rango [desde, hasta] (ISO) del período que contiene `fecha`. */
function rangoDe(vista: Vista, fecha: string): [string, string] {
  if (vista === "dia") return [fecha, fecha];
  if (vista === "semana") {
    const lunes = inicioDeSemana(fecha);
    return [lunes, sumarDias(lunes, 6)];
  }
  if (vista === "mes") {
    const dias = diasDelMes(fecha);
    return [dias[0], dias[dias.length - 1]];
  }
  const y = fecha.slice(0, 4);
  return [`${y}-01-01`, `${y}-12-31`];
}

type Fila = {
  ejercicio: string;
  sesiones: number;
  series: number;
  reps: number;
  pesoMax: number;
  registros: RegistroRutina[];
};

/** Spec 59: progreso de la rutina del alumno por período (anual, mensual, semanal o diario)
 * con indicadores, filtros Filtrar / Limpiar, grilla por ejercicio y, en "Ver detalle", los
 * gráficos de barras de repeticiones y peso de ese ejercicio. */
export function ProgresoRutinaPortal({ registros, hoy }: { registros: RegistroRutina[]; hoy: string }) {
  const [borrador, setBorrador] = useState<{ vista: Vista; fecha: string }>({ vista: "mes", fecha: hoy });
  const [aplicado, setAplicado] = useState(borrador);
  const [pagina, setPagina] = useState(1);
  const [desde, hasta] = rangoDe(aplicado.vista, aplicado.fecha);

  const { filas, sesiones, series, reps } = useMemo(() => {
    const enRango = registros.filter((r) => r.fecha >= desde && r.fecha <= hasta);
    const mapa = new Map<string, RegistroRutina[]>();
    for (const r of enRango) mapa.set(r.ejercicio, [...(mapa.get(r.ejercicio) ?? []), r]);
    const filas: Fila[] = [...mapa.entries()]
      .map(([ejercicio, lista]) => ({
        ejercicio,
        sesiones: new Set(lista.map((r) => r.fecha)).size,
        series: lista.reduce((a, r) => a + (r.series_realizadas ?? 0), 0),
        reps: lista.reduce((a, r) => a + (r.reps_realizadas ?? 0), 0),
        pesoMax: Math.max(0, ...lista.map((r) => Number(r.peso_kg ?? 0))),
        registros: [...lista].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)),
      }))
      .sort((a, b) => a.ejercicio.localeCompare(b.ejercicio, "es"));
    return {
      filas,
      sesiones: new Set(enRango.map((r) => r.fecha)).size,
      series: enRango.reduce((a, r) => a + (r.series_realizadas ?? 0), 0),
      reps: enRango.reduce((a, r) => a + (r.reps_realizadas ?? 0), 0),
    };
  }, [registros, desde, hasta]);

  const indicadores = [
    ["Sesiones", sesiones],
    ["Ejercicios", filas.length],
    ["Series", series],
    ["Repeticiones", reps],
  ] as const;
  const periodoTexto = desde === hasta ? formatFecha(desde) : `${formatFecha(desde)} – ${formatFecha(hasta)}`;
  const porDefecto = aplicado.vista === "mes" && aplicado.fecha === hoy;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map(([label, valor]) => (
          <Card key={label}>
            <CardContent className="px-4 py-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="font-display text-2xl">{valor}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setAplicado(borrador);
              setPagina(1);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="prog_vista">Ver por</Label>
              <Select
                id="prog_vista"
                value={borrador.vista}
                onChange={(e) => setBorrador({ ...borrador, vista: e.target.value as Vista })}
                className="w-40"
              >
                {VISTAS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prog_fecha">Fecha</Label>
              <Input
                id="prog_fecha"
                type="date"
                value={borrador.fecha}
                max={hoy}
                onChange={(e) => e.target.value && setBorrador({ ...borrador, fecha: e.target.value })}
                className="w-auto"
              />
            </div>
            <Button size="sm" type="submit" variant="outline">
              Filtrar
            </Button>
            <BotonLimpiar
              activo={!porDefecto || borrador !== aplicado}
              onClick={() => {
                const base = { vista: "mes" as Vista, fecha: hoy };
                setBorrador(base);
                setAplicado(base);
                setPagina(1);
              }}
            />
          </form>

          <p className="text-sm text-muted-foreground">Período: {periodoTexto}</p>

          {filas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay registros de rutina en este período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ejercicio</TableHead>
                  <TableHead>Sesiones</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Peso máx.</TableHead>
                  <TableHead className="w-12 px-0 text-center">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cortarPagina(filas, pagina).map((f) => (
                  <TableRow key={f.ejercicio}>
                    <TableCell className="font-medium text-foreground">{f.ejercicio}</TableCell>
                    <TableCell>{f.sesiones}</TableCell>
                    <TableCell>{f.series}</TableCell>
                    <TableCell>{f.reps}</TableCell>
                    <TableCell>{f.pesoMax > 0 ? `${f.pesoMax} kg` : "—"}</TableCell>
                    <TableCell className="px-0">
                      <EjercicioDetalle fila={f} periodo={periodoTexto} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginadorLocal pagina={pagina} total={filas.length} onCambiar={setPagina} />
        </CardContent>
      </Card>
    </div>
  );
}

/** Ojo "Ver detalle": ventana con los gráficos de barras (repeticiones y peso) del ejercicio. */
function EjercicioDetalle({ fila, periodo }: { fila: Fila; periodo: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const reps = fila.registros.filter((r) => r.reps_realizadas != null).map((r) => ({ x: r.fecha, y: r.reps_realizadas! }));
  const peso = fila.registros
    .filter((r) => r.peso_kg != null && Number(r.peso_kg) > 0)
    .map((r) => ({ x: r.fecha, y: Number(r.peso_kg) }));

  return (
    <>
      <IconAction icon={Eye} label="Ver detalle" tooltipDerecha onClick={() => ref.current?.showModal()} />
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(94vw,720px)] rounded-[12px] border border-border bg-card p-6 text-card-foreground backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{fila.ejercicio}</h3>
            <p className="text-xs text-muted-foreground">{periodo}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => ref.current?.close()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repeticiones</h4>
            <BarChart data={reps} unidad=" reps" medida="repeticiones" />
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Peso</h4>
            <BarChart data={peso} unidad=" kg" medida="peso" />
          </div>
        </div>
      </dialog>
    </>
  );
}
