"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Rutina } from "@/lib/types";

export type BitacoraFormState = {
  error?: string;
};

type Props = {
  action: (
    state: BitacoraFormState,
    formData: FormData,
  ) => Promise<BitacoraFormState>;
  rutina: Rutina;
  /** Portal del alumno: sin selector de fecha, siempre hoy. */
  fechaFija?: boolean;
};

type Fila = {
  hecho: boolean;
  series: string;
  reps: string;
  peso: string;
  notas: string;
};

type Campo = "series" | "reps" | "peso" | "notas";

/** Registro de sesión como tabla: una fila por ejercicio con series/reps
 * precargadas con lo planificado. Una fila se registra si está marcada "Hecho" o
 * si el usuario cambió/ingresó algún valor; las demás se envían vacías y el
 * servidor las descarta (`buildFilasRegistroRutina`). */
export function BitacoraForm({ action, rutina, fechaFija }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  const [filas, setFilas] = useState<Fila[]>(() =>
    rutina.contenido.map((ej) => ({
      hecho: false,
      series: String(ej.series ?? ""),
      reps: String(ej.reps ?? ""),
      peso: "",
      notas: "",
    })),
  );

  const actualizar = (i: number, campo: Campo, v: string) => {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: v } : f)));
  };

  const alternarHecho = (i: number) => {
    setFilas((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, hecho: !f.hecho } : f)),
    );
  };

  const estaActiva = (f: Fila, i: number) => {
    const ej = rutina.contenido[i];
    return (
      f.hecho ||
      f.peso !== "" ||
      f.notas !== "" ||
      f.series !== String(ej.series ?? "") ||
      f.reps !== String(ej.reps ?? "")
    );
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="rutina_id" value={rutina.id} />

      {!fechaFija && (
        <div className="grid gap-2 sm:max-w-[220px]">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" defaultValue={hoy} required />
        </div>
      )}

      <div className="overflow-x-auto rounded-[9px] border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Hecho</th>
              <th className="px-3 py-2 font-medium">Ejercicio</th>
              <th className="px-3 py-2 font-medium">Series</th>
              <th className="px-3 py-2 font-medium">Reps</th>
              <th className="px-3 py-2 font-medium">Peso (kg)</th>
              <th className="px-3 py-2 font-medium">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rutina.contenido.map((ej, i) => {
              const fila = filas[i];
              const activa = estaActiva(fila, i);

              return (
                <tr key={i} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={fila.hecho}
                      onChange={() => alternarHecho(i)}
                      aria-label={`Marcar ${ej.ejercicio} como hecho`}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{ej.ejercicio}</div>
                    {ej.peso && (
                      <div className="text-xs text-muted-foreground">
                        Plan: {ej.peso}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="numeric"
                      className="w-16"
                      value={fila.series}
                      onChange={(e) => actualizar(i, "series", e.target.value)}
                      aria-label={`Series de ${ej.ejercicio}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="numeric"
                      className="w-16"
                      value={fila.reps}
                      onChange={(e) => actualizar(i, "reps", e.target.value)}
                      aria-label={`Reps de ${ej.ejercicio}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="decimal"
                      className="w-20"
                      value={fila.peso}
                      placeholder={ej.peso ?? ""}
                      onChange={(e) => actualizar(i, "peso", e.target.value)}
                      aria-label={`Peso de ${ej.ejercicio}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={fila.notas}
                      placeholder="Opcional"
                      onChange={(e) => actualizar(i, "notas", e.target.value)}
                      aria-label={`Notas de ${ej.ejercicio}`}
                    />
                  </td>

                  {/* Valores enviados al servidor, alineados por índice de ejercicio. */}
                  <td className="hidden">
                    <input
                      type="hidden"
                      name="series_realizadas"
                      value={activa ? fila.series : ""}
                    />
                    <input
                      type="hidden"
                      name="reps_realizadas"
                      value={activa ? fila.reps : ""}
                    />
                    <input type="hidden" name="peso_kg" value={fila.peso} />
                    <input type="hidden" name="notas" value={fila.notas} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar sesión"}
        </Button>
      </div>
    </form>
  );
}
