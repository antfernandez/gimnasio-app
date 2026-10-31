"use client";

import { useMemo, useState } from "react";

import { SesionDetalleDialog } from "@/components/bitacora/sesion-detalle-dialog";
import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
import { agruparSesiones, detalleSesion, textoRealizado } from "@/lib/progreso";
import type { RegistroRutina, Rutina } from "@/lib/types";

type Props = {
  registros: RegistroRutina[];
  rutinas: Rutina[];
};

/** Spec 42: historial del alumno como grilla por sesión (rutina + fecha), con filtros de
 * fechas y rutina, paginador de 10 y un ojo que abre el detalle en una ventana flotante. */
export function BitacoraHistorialPortal({ registros, rutinas }: Props) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [rutinaId, setRutinaId] = useState("");
  const [bDesde, setBDesde] = useState("");
  const [bHasta, setBHasta] = useState("");
  const [bRutinaId, setBRutinaId] = useState("");
  const [pagina, setPagina] = useState(1);

  const sesiones = useMemo(() => agruparSesiones(registros, rutinas), [registros, rutinas]);
  const rutinaPorId = useMemo(() => new Map(rutinas.map((r) => [r.id, r])), [rutinas]);

  const visibles = sesiones.filter(
    (s) =>
      (!desde || s.fecha >= desde) &&
      (!hasta || s.fecha <= hasta) &&
      (!rutinaId || s.registros[0]?.rutina_id === rutinaId),
  );

  const opcionesRutina = [...new Set(sesiones.map((s) => s.registros[0]?.rutina_id))].filter(
    (id): id is string => !!id,
  );
  const hayFiltros = desde || hasta || rutinaId;

  if (sesiones.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aún no hay sesiones registradas en la bitácora.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Desde
          <Input
            type="date"
            className="h-11 w-full"
            value={bDesde}
            onChange={(e) => setBDesde(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Hasta
          <Input
            type="date"
            className="h-11 w-full"
            value={bHasta}
            onChange={(e) => setBHasta(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Rutina
          <Select value={bRutinaId} onChange={(e) => setBRutinaId(e.target.value)}>
            <option value="">Todas</option>
            {opcionesRutina.map((id) => (
              <option key={id} value={id}>
                {rutinaPorId.get(id)?.nombre ?? "Rutina"}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDesde(bDesde);
            setHasta(bHasta);
            setRutinaId(bRutinaId);
            setPagina(1);
          }}
        >
          Filtrar
        </Button>
        <BotonLimpiar
          activo={Boolean(hayFiltros)}
          onClick={() => {
            setBDesde("");
            setBHasta("");
            setBRutinaId("");
            setDesde("");
            setHasta("");
            setRutinaId("");
            setPagina(1);
          }}
        />
      </div>

      {visibles.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay sesiones con esos filtros.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sesión</TableHead>
              <TableHead className="text-right">Ejercicios</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cortarPagina(visibles, pagina).map((s) => (
              <TableRow key={s.clave}>
                <TableCell>
                  <div className="font-medium text-foreground">{s.rutinaNombre}</div>
                  <div className="text-xs text-muted-foreground">{formatFecha(s.fecha)}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  {s.registros.filter((r) => textoRealizado(r) !== "—").length}/{s.registros.length}
                </TableCell>
                <TableCell className="px-0">
                  <SesionDetalleDialog
                    detalle={detalleSesion(s, rutinaPorId.get(s.registros[0].rutina_id))}
                  />
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
