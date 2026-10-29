"use client";

import { useState } from "react";

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
import { formatMedidas } from "@/lib/medidas";
import { cortarPagina } from "@/lib/paginacion";
import type { Avance } from "@/lib/types";

/** Historial de avances del alumno (spec 37): filtro por fechas y 10 por página. */
export function TablaAvances({ avances }: { avances: Avance[] }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  const visibles = avances.filter(
    (av) => (!desde || av.fecha >= desde) && (!hasta || av.fecha <= hasta),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          aria-label="Desde"
          className="w-auto"
          value={desde}
          onChange={(e) => {
            setDesde(e.target.value);
            setPagina(1);
          }}
        />
        <Input
          type="date"
          aria-label="Hasta"
          className="w-auto"
          value={hasta}
          onChange={(e) => {
            setHasta(e.target.value);
            setPagina(1);
          }}
        />
        {(desde || hasta) && (
          <Button
            variant="ghost"
            onClick={() => {
              setDesde("");
              setHasta("");
              setPagina(1);
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay avances en ese rango de fechas.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Medidas</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cortarPagina(visibles, pagina).map((avance) => (
              <TableRow key={avance.id}>
                <TableCell>{formatFecha(avance.fecha)}</TableCell>
                <TableCell className="font-medium text-foreground">
                  {avance.peso_kg ? `${avance.peso_kg} kg` : "—"}
                </TableCell>
                <TableCell>{formatMedidas(avance.medidas)}</TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground">
                  {avance.notas || "—"}
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
