"use client";

import { Eye, X } from "lucide-react";
import { useRef, useState } from "react";

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

/** Ojo que abre en una ventana flotante el detalle de medidas de un avance. */
function AvanceDetalleDialog({ avance }: { avance: Avance }) {
  const ref = useRef<HTMLDialogElement>(null);
  const medidas = listarMedidas(avance.medidas);

  return (
    <>
      <IconAction
        icon={Eye}
        label="Ver detalle"
        tooltipDerecha
        onClick={() => ref.current?.showModal()}
      />
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(94vw,480px)] rounded-[12px] border border-border bg-card p-6 text-card-foreground backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">
              Medición del {formatFecha(avance.fecha)}
            </h3>
            <p className="text-xs text-muted-foreground">
              Peso: {avance.peso_kg ? `${avance.peso_kg} kg` : "—"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => ref.current?.close()}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {medidas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin medidas registradas.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {medidas.map((m) => (
              <li key={m.etiqueta} className="flex justify-between py-2">
                <span className="text-muted-foreground">{m.etiqueta}</span>
                <span className="font-medium text-foreground">
                  {m.valor} cm
                </span>
              </li>
            ))}
          </ul>
        )}
        {avance.notas && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Notas: </span>
            {avance.notas}
          </p>
        )}
      </dialog>
    </>
  );
}

/** Historial de avances del alumno (solo lectura): filtro por fechas, 10 por página y
 * un ojo con el detalle de medidas (spec 42). */
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
                    <AvanceDetalleDialog avance={avance} />
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
