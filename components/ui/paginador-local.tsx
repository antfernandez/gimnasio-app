"use client";

import { Button } from "@/components/ui/button";
import { POR_PAGINA } from "@/lib/paginacion";

/**
 * Paginador para listas que ya viven en el cliente (p. ej. con filtros en
 * estado local). Misma presentación que `Paginador`; el estado de página lo
 * lleva el componente que lo usa y debe volver a 1 al cambiar un filtro.
 */
export function PaginadorLocal({
  pagina,
  total,
  onCambiar,
  porPagina = POR_PAGINA,
}: {
  pagina: number;
  total: number;
  onCambiar: (pagina: number) => void;
  porPagina?: number;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (total === 0 || totalPaginas <= 1) return null;

  const actual = Math.min(pagina, totalPaginas);
  const desde = (actual - 1) * porPagina + 1;
  const hasta = Math.min(actual * porPagina, total);

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Mostrando {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={actual <= 1} onClick={() => onCambiar(actual - 1)}>
          Anterior
        </Button>
        <span className="px-1 text-xs">
          Página {actual} de {totalPaginas}
        </span>
        <Button variant="outline" size="sm" disabled={actual >= totalPaginas} onClick={() => onCambiar(actual + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
