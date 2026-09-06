"use client";

import { Check, Pencil, X } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

type EstadoFila = "pendiente" | "hecho" | "editando";

type Fila = {
  estado: EstadoFila;
  series: string;
  reps: string;
  peso: string;
  notas: string;
};

/** Sprint 18, Parte 1: rediseño tipo checklist — un tap por ejercicio ("Hecho")
 * registra la sesión tal como estaba planificada, sin escribir nada. Solo si el
 * alumno hizo algo distinto (más/menos peso, series, etc.) hace falta abrir
 * "Ajustar" y tipear los valores reales. Pensado para completarse en segundos por
 * alumno, parado en el gimnasio con el teléfono en una mano — ver auditoría UX
 * 2026-09-04, punto 3.2. */
export function BitacoraForm({ action, rutina, fechaFija }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  const [filas, setFilas] = useState<Fila[]>(() =>
    rutina.contenido.map(() => ({
      estado: "pendiente" as EstadoFila,
      series: "",
      reps: "",
      peso: "",
      notas: "",
    })),
  );

  const marcarHecho = (i: number) => {
    setFilas((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, estado: "hecho" } : f)),
    );
  };

  const marcarPendiente = (i: number) => {
    setFilas((prev) =>
      prev.map((f, idx) =>
        idx === i
          ? { estado: "pendiente", series: "", reps: "", peso: "", notas: "" }
          : f,
      ),
    );
  };

  const abrirAjuste = (i: number) => {
    setFilas((prev) =>
      prev.map((f, idx) => {
        if (idx !== i) return f;
        const ej = rutina.contenido[idx];
        return {
          estado: "editando",
          series: f.series || String(ej.series ?? ""),
          reps: f.reps || String(ej.reps ?? ""),
          peso: f.peso,
          notas: f.notas,
        };
      }),
    );
  };

  const actualizarCampo = (i: number, campo: "series" | "reps" | "peso" | "notas", v: string) => {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: v } : f)));
  };

  const hechos = filas.filter((f) => f.estado !== "pendiente").length;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="rutina_id" value={rutina.id} />

      {!fechaFija && (
        <div className="grid gap-2 sm:max-w-[220px]">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" defaultValue={hoy} required />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Toca cada ejercicio a medida que lo completan.</span>
        <span className="font-medium text-foreground">
          {hechos} / {filas.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {rutina.contenido.map((ej, i) => {
          const fila = filas[i];
          const planResumen = `${ej.series || "—"} series × ${ej.reps || "—"} reps${ej.peso ? ` · ${ej.peso}` : ""}`;

          return (
            <div
              key={i}
              className={cn(
                "rounded-[9px] border p-3 transition-colors",
                fila.estado === "hecho"
                  ? "border-success/40 bg-success/10"
                  : fila.estado === "editando"
                    ? "border-primary/40 bg-primary/5"
                    : "border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    fila.estado === "hecho" ? marcarPendiente(i) : marcarHecho(i)
                  }
                  aria-pressed={fila.estado === "hecho"}
                  aria-label={
                    fila.estado === "hecho"
                      ? `Deshacer ${ej.ejercicio}`
                      : `Marcar ${ej.ejercicio} como hecho`
                  }
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    fila.estado === "hecho"
                      ? "border-success bg-success text-success-foreground"
                      : "border-border text-transparent hover:border-primary",
                  )}
                >
                  <Check className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {ej.ejercicio}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {fila.estado === "editando" ? `Plan: ${planResumen}` : planResumen}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    fila.estado === "editando" ? marcarPendiente(i) : abrirAjuste(i)
                  }
                  className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
                >
                  {fila.estado === "editando" ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      Cerrar
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Ajustar
                    </>
                  )}
                </button>
              </div>

              {fila.estado === "editando" && (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-3 sm:grid-cols-[1fr_1fr_1fr_2fr]">
                  <div className="grid gap-1">
                    <span className="text-[0.65rem] uppercase text-muted-foreground">
                      Series
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={fila.series}
                      onChange={(e) => actualizarCampo(i, "series", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <span className="text-[0.65rem] uppercase text-muted-foreground">
                      Reps
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={fila.reps}
                      onChange={(e) => actualizarCampo(i, "reps", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <span className="text-[0.65rem] uppercase text-muted-foreground">
                      Peso (kg)
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={fila.peso}
                      onChange={(e) => actualizarCampo(i, "peso", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 grid gap-1 sm:col-span-1">
                    <span className="text-[0.65rem] uppercase text-muted-foreground">
                      Notas
                    </span>
                    <Input
                      value={fila.notas}
                      placeholder="Opcional"
                      onChange={(e) => actualizarCampo(i, "notas", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Valores reales enviados al servidor: "hecho" manda el plan tal cual
                  (sin pesos, no son numéricos), "editando" manda lo tipeado. */}
              <input
                type="hidden"
                name="series_realizadas"
                value={
                  fila.estado === "hecho"
                    ? String(ej.series ?? "")
                    : fila.estado === "editando"
                      ? fila.series
                      : ""
                }
              />
              <input
                type="hidden"
                name="reps_realizadas"
                value={
                  fila.estado === "hecho"
                    ? String(ej.reps ?? "")
                    : fila.estado === "editando"
                      ? fila.reps
                      : ""
                }
              />
              <input
                type="hidden"
                name="peso_kg"
                value={fila.estado === "editando" ? fila.peso : ""}
              />
              <input
                type="hidden"
                name="notas"
                value={fila.estado === "editando" ? fila.notas : ""}
              />
            </div>
          );
        })}
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
