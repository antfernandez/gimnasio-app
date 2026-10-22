"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { EjercicioOpcion } from "@/components/ejercicios/ejercicio-combobox";

/** Icono "i" con popover flotante (posición absoluta, no empuja el layout) con el
 * resumen del ejercicio. Abre con hover, foco o tap; Esc o clic fuera lo cierra. */
export function EjercicioInfo({ ejercicio }: { ejercicio: EjercicioOpcion | undefined }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent | TouchEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("touchstart", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("touchstart", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  // Siempre ocupa el mismo espacio, para que la fila no cambie de altura/ancho.
  if (!ejercicio) {
    return <span aria-hidden className="h-11 w-9 shrink-0" />;
  }

  const primeraLinea = ejercicio.ejecucion?.split("\n").find((l) => l.trim());
  const datos = [
    ["Músculo principal", ejercicio.musculo_principal],
    ["Secundarios", ejercicio.musculos_secundarios],
    ["Equipo", ejercicio.equipo],
    ["Ejecución", primeraLinea],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <span
      ref={raiz}
      className="relative flex shrink-0"
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
    >
      <button
        type="button"
        aria-label={`Información de ${ejercicio.nombre}`}
        aria-expanded={abierto}
        aria-controls={popoverId}
        onClick={() => setAbierto((a) => !a)}
        onFocus={() => setAbierto(true)}
        className="flex h-11 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Info className="h-4 w-4" />
      </button>
      {abierto && (
        <div
          id={popoverId}
          role="tooltip"
          className="absolute right-0 top-full z-30 w-72 max-w-[80vw] rounded-[9px] border border-border bg-card p-3 text-xs shadow-lg"
        >
          {datos.length === 0 ? (
            <p className="text-muted-foreground">Sin información adicional.</p>
          ) : (
            <dl className="grid gap-1.5">
              {datos.map(([k, v]) => (
                <div key={k}>
                  <dt className="uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </span>
  );
}
