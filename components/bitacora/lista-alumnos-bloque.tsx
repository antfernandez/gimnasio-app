"use client";

import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import type { Asistencia, EstadoReserva } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  reservaId: string;
  estado: EstadoReserva;
  asistencia: Asistencia | null;
  marcarAsistencia: (reservaId: string, asistencia: Asistencia) => Promise<void>;
};

const OPCIONES: { value: Asistencia; label: string }[] = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "justificado", label: "Justificado" },
];

/** Asistencia del alumno dentro de su bloque (Sprint 19): un toque en "Presente" y
 * listo. Spec 27: botones de al menos 44 px para uso táctil. */
export function AsistenciaAlumno({ reservaId, estado, asistencia, marcarAsistencia }: Props) {
  const [isPending, startTransition] = useTransition();
  const yaTomada = estado !== "reservada" || asistencia != null;

  if (yaTomada) {
    return (
      <Badge
        variant={
          asistencia === "ausente"
            ? "destructive"
            : asistencia === "justificado"
              ? "secondary"
              : "success"
        }
      >
        {asistencia === "ausente"
          ? "Ausente"
          : asistencia === "justificado"
            ? "Justificado"
            : "Presente"}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPCIONES.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => marcarAsistencia(reservaId, o.value))}
          className={cn(
            "min-h-11 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50",
            o.value === "presente" && "hover:border-success hover:text-success",
            o.value === "ausente" && "hover:border-destructive hover:text-destructive",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
