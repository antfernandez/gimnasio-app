"use client";

import { useState, useTransition } from "react";

import type {
  GuardarEjercicioInput,
  GuardarEjercicioResult,
} from "@/app/protected/bitacora/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Rutina } from "@/lib/types";

type Fila = GuardarEjercicioInput & {
  guardado: boolean;
  error?: string;
};

/** Valores ya registrados para la fecha, por índice de ejercicio. */
export type RegistroGuardado = GuardarEjercicioInput;

type Props = {
  rutina: Rutina;
  /** Guarda un ejercicio; ya viene con alumno, rutina y fecha aplicados. */
  guardar: (
    ejercicioIndex: number,
    input: GuardarEjercicioInput,
  ) => Promise<GuardarEjercicioResult>;
  guardados: Record<number, RegistroGuardado>;
  /** Fecha posterior a hoy: la bitácora no se puede modificar. */
  fechaFutura: boolean;
};

/** Registro de sesión del dueño (Spec 13): cada fila se guarda sola con su botón, así
 * se va registrando el ejercicio que hace el alumno sin completar toda la tabla.
 * Una fila guardada muestra "OK" y se puede editar y guardar de nuevo. */
export function SesionTabla({ rutina, guardar, guardados, fechaFutura }: Props) {
  const [filas, setFilas] = useState<Fila[]>(() =>
    rutina.contenido.map((ej, i) => {
      const g = guardados[i];
      return g
        ? { ...g, guardado: true }
        : {
            series: String(ej.series ?? ""),
            reps: String(ej.reps ?? ""),
            peso: "",
            notas: "",
            guardado: false,
          };
    }),
  );
  const [guardando, setGuardando] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const actualizar = (i: number, campo: keyof GuardarEjercicioInput, v: string) => {
    setFilas((prev) =>
      prev.map((f, idx) =>
        idx === i ? { ...f, [campo]: v, guardado: false, error: undefined } : f,
      ),
    );
  };

  const guardarFila = (i: number) => {
    const { series, reps, peso, notas } = filas[i];
    setGuardando(i);
    startTransition(async () => {
      const res = await guardar(i, { series, reps, peso, notas });
      setFilas((prev) =>
        prev.map((f, idx) =>
          idx === i
            ? res.ok
              ? { ...f, guardado: true, error: undefined }
              : { ...f, guardado: false, error: res.error }
            : f,
        ),
      );
      setGuardando(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {fechaFutura && (
        <p className="rounded-[9px] border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          No se puede registrar ni modificar la bitácora de una fecha futura.
        </p>
      )}

      {/* Spec 27: mobile first — cada ejercicio es una tarjeta sin scroll horizontal,
          con su botón de guardar siempre visible al pie. */}
      <div className="flex flex-col gap-3">
        {rutina.contenido.map((ej, i) => {
          const fila = filas[i];
          const incompleta =
            fila.series.trim() === "" || fila.reps.trim() === "" || fila.peso.trim() === "";
          return (
            <div key={i} className="rounded-[9px] border border-border p-3">
              <div className="mb-3">
                <div className="font-medium text-foreground">{ej.ejercicio}</div>
                {ej.peso && (
                  <div className="text-xs text-muted-foreground">Plan: {ej.peso}</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Series
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-11 w-full"
                    value={fila.series}
                    disabled={fechaFutura}
                    onChange={(e) => actualizar(i, "series", e.target.value)}
                    aria-label={`Series de ${ej.ejercicio}`}
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Reps
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-11 w-full"
                    value={fila.reps}
                    disabled={fechaFutura}
                    onChange={(e) => actualizar(i, "reps", e.target.value)}
                    aria-label={`Reps de ${ej.ejercicio}`}
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Peso (kg)
                  <Input
                    inputMode="decimal"
                    className="h-11 w-full"
                    value={fila.peso}
                    placeholder={ej.peso ?? ""}
                    disabled={fechaFutura}
                    onChange={(e) => actualizar(i, "peso", e.target.value)}
                    aria-label={`Peso de ${ej.ejercicio}`}
                  />
                </label>
              </div>

              <label className="mt-2 grid gap-1 text-xs text-muted-foreground">
                Notas
                <Input
                  className="h-11 w-full"
                  value={fila.notas}
                  placeholder="Opcional"
                  disabled={fechaFutura}
                  onChange={(e) => actualizar(i, "notas", e.target.value)}
                  aria-label={`Notas de ${ej.ejercicio}`}
                />
              </label>

              <div className="mt-3 flex min-h-11 items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  disabled={fechaFutura || incompleta || guardando === i}
                  onClick={() => guardarFila(i)}
                >
                  {guardando === i ? "Guardando…" : "Guardar"}
                </Button>
                {fila.guardado && (
                  <span className="text-sm font-semibold text-success">OK</span>
                )}
              </div>
              {fila.error && <p className="mt-1 text-xs text-destructive">{fila.error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
