import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha "YYYY-MM-DD" válida de `searchParams`, o `undefined`. */
export function leerFecha(valor: string | undefined): string | undefined {
  return valor && FECHA_RE.test(valor) ? valor : undefined;
}

/**
 * Barra de filtros por rango de fechas para grillas de historial (spec 37).
 * Sin `pagina` en el form: cambiar un filtro vuelve a la página 1. `fijos`
 * conserva otros parámetros de la URL (p. ej. la vista activa).
 */
export function FiltrosFecha({
  pathname,
  desde,
  hasta,
  fijos = {},
  hayFiltros,
  children,
}: {
  pathname: string;
  desde?: string;
  hasta?: string;
  fijos?: Record<string, string | undefined>;
  /** Filtros extra (p. ej. un `Select` de estado) y si alguno está activo. */
  children?: ReactNode;
  hayFiltros?: boolean;
}) {
  return (
    <form className="mb-5 flex flex-wrap items-center gap-3" action={pathname}>
      {Object.entries(fijos).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <Input type="date" name="desde" defaultValue={desde} aria-label="Desde" className="w-auto" />
      <Input type="date" name="hasta" defaultValue={hasta} aria-label="Hasta" className="w-auto" />
      {children}
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {(desde || hasta || hayFiltros) && (
        <Button asChild variant="ghost">
          <Link href={{ pathname, query: Object.fromEntries(Object.entries(fijos).filter(([, v]) => v)) as Record<string, string> }}>
            Limpiar
          </Link>
        </Button>
      )}
    </form>
  );
}
