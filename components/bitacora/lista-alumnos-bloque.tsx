import Link from "next/link";

import { cn } from "@/lib/utils";

type AlumnoBloque = {
  id: string;
  nombres: string;
  apellidos: string;
};

type Props = {
  fecha: string;
  hora: string;
  alumnos: AlumnoBloque[];
  alumnoSeleccionadoId?: string;
};

/** Sprint 15, Parte B: alumnos con reserva vigente en el bloque horario elegido —
 * cada uno es un link que agrega `?alumno=ID` a la URL actual (mismo patrón de
 * navegación por query params que `SelectorFechaHora`). */
export function ListaAlumnosBloque({ fecha, hora, alumnos, alumnoSeleccionadoId }: Props) {
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
        return (
          <Link
            key={a.id}
            href={href}
            className={cn(
              "flex items-center justify-between rounded-[9px] border border-border px-3.5 py-2.5 text-sm transition-all",
              activo
                ? "bg-gradient-to-br from-primary/20 to-primary/5 text-secondary-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]"
                : "text-foreground hover:bg-primary/10",
            )}
          >
            {a.nombres} {a.apellidos}
          </Link>
        );
      })}
    </div>
  );
}
