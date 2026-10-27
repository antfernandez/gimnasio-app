"use client";

import { useState, useTransition } from "react";

import { setPermisoAlumnos, type PermisoAlumno } from "@/app/protected/permisos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type FilaPermisos = {
  id: string;
  nombre: string;
  rut: string;
  activo: boolean;
  puede_registrar_avances: boolean;
  puede_registrar_bitacora: boolean;
};

const COLUMNAS: { permiso: PermisoAlumno; label: string }[] = [
  { permiso: "puede_registrar_avances", label: "Registrar avances propios" },
  { permiso: "puede_registrar_bitacora", label: "Registrar bitácora propia" },
];

export function PermisosTabla({
  filas: inicial,
  puedeEditar,
}: {
  filas: FilaPermisos[];
  puedeEditar: boolean;
}) {
  const [filas, setFilas] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const aplicar = (ids: string[], permiso: PermisoAlumno, valor: boolean) => {
    const anteriores = filas;
    setError(null);
    setFilas((fs) => fs.map((f) => (ids.includes(f.id) ? { ...f, [permiso]: valor } : f)));
    startTransition(async () => {
      const res = await setPermisoAlumnos(ids, permiso, valor);
      if (res.error) {
        setFilas(anteriores); // revierte las casillas si falla
        setError(res.error);
      }
    });
  };

  const masivo = (permiso: PermisoAlumno, valor: boolean) => {
    const verbo = valor ? "marcar" : "desmarcar";
    if (!window.confirm(`¿${verbo[0].toUpperCase()}${verbo.slice(1)} este permiso para los ${filas.length} alumnos de la lista?`)) return;
    aplicar(filas.map((f) => f.id), permiso, valor);
  };

  if (filas.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay alumnos que coincidan con los filtros.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!puedeEditar && (
        <p className="text-sm text-muted-foreground">
          Solo el dueño puede cambiar permisos; aquí los ves en modo lectura.
        </p>
      )}
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>Alumno</TableHead>
            <TableHead>Estado</TableHead>
            {COLUMNAS.map((c) => (
              <TableHead key={c.permiso} className="text-center">
                <div>{c.label}</div>
                {puedeEditar && (
                  <div className="mt-1 flex justify-center gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => masivo(c.permiso, true)}>
                      Marcar todos
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => masivo(c.permiso, false)}>
                      Desmarcar
                    </Button>
                  </div>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium text-foreground">
                {f.nombre}
                <span className="ml-2 font-normal text-muted-foreground">{f.rut}</span>
              </TableCell>
              <TableCell>
                <Badge variant={f.activo ? "success" : "secondary"}>{f.activo ? "Activo" : "De baja"}</Badge>
              </TableCell>
              {COLUMNAS.map((c) => (
                <TableCell key={c.permiso} className="text-center">
                  <Checkbox
                    checked={f[c.permiso]}
                    disabled={!puedeEditar}
                    aria-label={`${c.label}: ${f.nombre}`}
                    onCheckedChange={(v) => aplicar([f.id], c.permiso, v === true)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
