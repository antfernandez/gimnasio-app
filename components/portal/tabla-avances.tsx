"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
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
import { listarMedidas } from "@/lib/medidas";
import { cortarPagina } from "@/lib/paginacion";
import type { Avance } from "@/lib/types";

/** Historial de avances del alumno (solo lectura): filtro por fechas, 10 por página y
 * un ojo que abre el detalle en página propia (spec 56). */
export function TablaAvances({ avances }: { avances: Avance[] }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [bDesde, setBDesde] = useState("");
  const [bHasta, setBHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  const visibles = avances.filter(
    (av) => (!desde || av.fecha >= desde) && (!hasta || av.fecha <= hasta),
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
          No hay avances en ese rango de fechas.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Medidas</TableHead>
              <TableHead className="w-12 px-0 text-center">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cortarPagina(visibles, pagina).map((avance) => {
              const n = listarMedidas(avance.medidas).length;
              return (
                <TableRow key={avance.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatFecha(avance.fecha)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-foreground">
                    {avance.peso_kg ? `${avance.peso_kg} kg` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {n > 0 ? n : "—"}
                  </TableCell>
                  <TableCell className="px-0">
                    <IconAction
                      icon={Eye}
                      label="Ver detalle"
                      tooltipDerecha
                      href={`/portal/medicion-corporal/${avance.id}`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <PaginadorLocal
        pagina={pagina}
        total={visibles.length}
        onCambiar={setPagina}
      />
    </div>
  );
}
