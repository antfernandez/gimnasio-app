"use client";

import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatHora } from "@/lib/turnos";

export type BloqueDelDia = {
  horaInicio: string;
  cantidadAlumnos: number;
};

type Props = {
  fecha: string;
  hora?: string;
  bloques: BloqueDelDia[];
};

/** Sprint 15, Parte B: navega actualizando los query params de `/protected/bitacora`
 * — cambiar la fecha resetea el bloque y el alumno elegidos (ya no aplican al nuevo
 * día). */
export function SelectorFechaHora({ fecha, hora, bloques }: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="grid gap-2 sm:max-w-[220px]">
        <Label htmlFor="fecha">Fecha</Label>
        <Input
          id="fecha"
          type="date"
          value={fecha}
          onChange={(e) => router.push(`/protected/bitacora?fecha=${e.target.value}`)}
        />
      </div>
      <div className="grid gap-2 sm:max-w-[280px]">
        <Label htmlFor="hora">Bloque horario</Label>
        {bloques.length === 0 ? (
          <p className="flex h-11 items-center text-sm text-muted-foreground">
            Sin horarios configurados para este día.
          </p>
        ) : (
          <Select
            id="hora"
            value={hora ?? ""}
            onChange={(e) => {
              const nuevaHora = e.target.value;
              const query = new URLSearchParams({ fecha });
              if (nuevaHora) query.set("hora", nuevaHora);
              router.push(`/protected/bitacora?${query.toString()}`);
            }}
          >
            <option value="">Selecciona un bloque…</option>
            {bloques.map((b) => (
              <option key={b.horaInicio} value={b.horaInicio}>
                {formatHora(b.horaInicio)} h · {b.cantidadAlumnos}{" "}
                {b.cantidadAlumnos === 1 ? "alumno" : "alumnos"}
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
