"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Envuelve un icono/botón y muestra su tooltip con `position: fixed`, para que no
 * ensanche el contenedor con scroll de la grilla (spec 61).
 */
export function TooltipFijo({
  label,
  derecha,
  children,
}: {
  label: string;
  /** Ancla el tooltip al borde derecho del icono (columnas pegadas al borde de una tabla). */
  derecha?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function mostrar() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const mitad = 88; // ~ max-w-[11rem] / 2
    const centro = derecha ? r.right - mitad : r.left + r.width / 2;
    const left = Math.min(Math.max(centro, mitad + 4), window.innerWidth - mitad - 4);
    setPos({ top: r.top - 4, left });
  }

  return (
    <span
      ref={ref}
      className="inline-flex"
      onMouseEnter={mostrar}
      onMouseLeave={() => setPos(null)}
      onFocus={mostrar}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos && (
        <span
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className="pointer-events-none fixed z-50 w-max max-w-[11rem] -translate-x-1/2 -translate-y-full whitespace-normal rounded-md bg-foreground px-2 py-1 text-center text-xs text-background"
        >
          {label}
        </span>
      )}
    </span>
  );
}
