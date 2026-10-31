"use client";

import { useState } from "react";

import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginadorLocal } from "@/components/ui/paginador-local";
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

function formatPlanificado(r: RegistroRutina): string {
  if (!r.series_planificadas && !r.reps_planificadas && !r.peso_planificado) return "—";
  const base = `${r.series_planificadas ?? "—"} × ${r.reps_planificadas ?? "—"}`;
  return r.peso_planificado ? `${base} · ${r.peso_planificado}` : base;
}

function formatRealizado(r: RegistroRutina): string {
  if (!r.series_realizadas && !r.reps_realizadas && !r.peso_kg) return "—";
  const base = `${r.series_realizadas ?? "—"} × ${r.reps_realizadas ?? "—"}`;
  return r.peso_kg ? `${base} · ${r.peso_kg} kg` : base;
}

export function BitacoraHistorial({ registros }: { registros: RegistroRutina[] }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [bDesde, setBDesde] = useState("");
  const [bHasta, setBHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  if (registros.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aún no hay sesiones registradas en la bitácora.
      </p>
    );
  }

  const visibles = registros.filter(
    (r) => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" aria-label="Desde" className="w-auto" value={bDesde} onChange={(e) => setBDesde(e.target.value)} />
        <Input type="date" aria-label="Hasta" className="w-auto" value={bHasta} onChange={(e) => setBHasta(e.target.value)} />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDesde(bDesde);
            setHasta(bHasta);
            setPagina(1);
          }}
        >
          Filtrar
        </Button>
        <BotonLimpiar
          activo={Boolean(desde || hasta)}
          onClick={() => {
            setBDesde("");
            setBHasta("");
            setDesde("");
            setHasta("");
            setPagina(1);
          }}
        />
      </div>

      {visibles.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay registros en ese rango de fechas.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Ejercicio</TableHead>
              <TableHead>Planificado</TableHead>
              <TableHead>Realizado</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cortarPagina(visibles, pagina).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatFecha(r.fecha)}</TableCell>
                <TableCell className="font-medium text-foreground">{r.ejercicio}</TableCell>
                <TableCell className="text-muted-foreground">{formatPlanificado(r)}</TableCell>
                <TableCell>{formatRealizado(r)}</TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground">
                  {r.notas || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PaginadorLocal pagina={pagina} total={visibles.length} onCambiar={setPagina} />
    </div>
  );
}
