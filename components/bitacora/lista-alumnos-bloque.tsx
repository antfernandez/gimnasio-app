"use client";

import Link from "next/link";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import type { Asistencia, EstadoReserva } from "@/lib/types";
import { cn } from "@/lib/utils";

type AlumnoBloque = {
  id: string;
  reservaId: string;
  nombres: string;
  apellidos: string;
  estado: EstadoReserva;
  asistencia: Asistencia | null;
  clasesRestantes: number | null;
};

type Props = {
  fecha: string;
  hora: string;
  alumnos: AlumnoBloque[];
  alumnoSeleccionadoId?: string;
  marcarAsistencia: (reservaId: string, asistencia: Asistencia) => Promise<void>;
};

const OPCIONES: { value: Asistencia; label: string }[] = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "justificado", label: "Justificado" },
];

/** Sprint 15, Parte B: alumnos con reserva vigente en el bloque horario elegido —
 * cada nombre es un link que agrega `?alumno=ID` a la URL actual (mismo patrón de
 * navegación por query params que `SelectorFechaHora`). Sprint 19, Parte 1: suma el
 * check de asistencia acá mismo, sin tener que entrar a la rutina — la mayoría de
 * los alumnos de un bloque solo necesitan un tap en "Presente". Sprint 19, Parte 2:
 * contador de clases restantes junto al nombre. */
export function ListaAlumnosBloque({
  fecha,
  hora,
  alumnos,
  alumnoSeleccionadoId,
  marcarAsistencia,
}: Props) {
  const [isPending, startTransition] = useTransition();

  if (alumnos.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No hay alumnos citados en este bloque.
      </p>
    );
  }

  const query = new URLSearchParams({ fecha, hora });

  return (
    <div className="flex flex-col gap-2">
      {alumnos.map((a) => {
        const activo = a.id === alumnoSeleccionadoId;
        const href = `/protected/bitacora?${query.toString()}&alumno=${a.id}`;
        const yaTomada = a.estado !== "reservada" || a.asistencia != null;

        return (
          <div
            key={a.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-border px-3.5 py-2.5 transition-all",
              activo && "bg-gradient-to-br from-primary/20 to-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]",
            )}
          >
            <Link
              href={href}
              className={cn(
                "min-w-0 flex-1 text-sm",
                activo ? "text-secondary-foreground" : "text-foreground hover:text-primary",
              )}
            >
              <span className="font-medium">
                {a.nombres} {a.apellidos}
              </span>
              {a.clasesRestantes != null && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {a.clasesRestantes} clase{a.clasesRestantes === 1 ? "" : "s"} restante
                  {a.clasesRestantes === 1 ? "" : "s"}
                </span>
              )}
            </Link>

            {yaTomada ? (
              <Badge variant={a.asistencia === "ausente" ? "destructive" : "success"}>
                {a.asistencia === "ausente"
                  ? "Ausente"
                  : a.asistencia === "justificado"
                    ? "Justificado"
                    : "Presente"}
              </Badge>
            ) : (
              <div className="flex gap-1.5">
                {OPCIONES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => marcarAsistencia(a.reservaId, o.value))
                    }
                    className={cn(
                      "rounded-full border border-border px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50",
                      o.value === "presente" && "hover:border-success hover:text-success",
                      o.value === "ausente" && "hover:border-destructive hover:text-destructive",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
