"use client";

import { useState } from "react";

import type { GuardarEjercicioInput, GuardarEjercicioResult } from "@/app/protected/bitacora/actions";
import { AsistenciaAlumno } from "@/components/bitacora/lista-alumnos-bloque";
import { SesionTabla, type RegistroGuardado } from "@/components/bitacora/sesion-tabla";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Asistencia, EstadoReserva, Rutina } from "@/lib/types";

export type ItemRegistroSesion = {
  reservaId: string;
  alumnoId: string;
  nombre: string;
  hora: string;
  estado: EstadoReserva;
  asistencia: Asistencia | null;
  rutina: Rutina | null;
  guardados: Record<number, RegistroGuardado>;
  guardar: (ejercicioIndex: number, input: GuardarEjercicioInput) => Promise<GuardarEjercicioResult>;
};

/** Spec 61: la edición (asistencia y registro de sesión) vive aquí, debajo de la lista;
 * los acordeones de arriba son solo de lectura. */
export function RegistroSesionPanel({
  items,
  fecha,
  fechaFutura,
  marcarAsistencia,
}: {
  items: ItemRegistroSesion[];
  fecha: string;
  fechaFutura: boolean;
  marcarAsistencia: (reservaId: string, asistencia: Asistencia) => Promise<void>;
}) {
  const [sel, setSel] = useState(items[0]?.reservaId ?? "");
  const item = items.find((i) => i.reservaId === sel) ?? items[0];
  if (!item) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <h3 className="text-lg">Registrar sesión</h3>
        <div className="grid max-w-sm gap-2">
          <Label htmlFor="registro-alumno">Alumno</Label>
          <Select id="registro-alumno" value={item.reservaId} onChange={(e) => setSel(e.target.value)}>
            {items.map((i) => (
              <option key={i.reservaId} value={i.reservaId}>
                {i.hora} h — {i.nombre}
              </option>
            ))}
          </Select>
        </div>
        <AsistenciaAlumno
          key={`asist-${item.reservaId}-${item.estado}-${item.asistencia}`}
          reservaId={item.reservaId}
          estado={item.estado}
          asistencia={item.asistencia}
          marcarAsistencia={marcarAsistencia}
        />
        {item.rutina ? (
          <SesionTabla
            key={`${item.alumnoId}-${fecha}`}
            rutina={item.rutina}
            guardar={item.guardar}
            guardados={item.guardados}
            fechaFutura={fechaFutura}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sin rutina vigente asignada.</p>
        )}
      </CardContent>
    </Card>
  );
}
