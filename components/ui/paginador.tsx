import Link from "next/link";

import { Button } from "@/components/ui/button";
import { POR_PAGINA } from "@/lib/paginacion";

type Query = Record<string, string | undefined>;

/**
 * Paginador inferior estándar (spec 37): "Mostrando X–Y de N", anterior /
 * siguiente y número de página. El estado vive en la URL (`pagina`) junto con
 * los filtros recibidos en `query`. Se oculta si hay una sola página.
 */
export function Paginador({
  pathname,
  query = {},
  pagina,
  total,
  porPagina = POR_PAGINA,
}: {
  pathname: string;
  query?: Query;
  pagina: number;
  total: number;
  porPagina?: number;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  if (total === 0 || totalPaginas <= 1) return null;

  const actual = Math.min(pagina, totalPaginas);
  const desde = (actual - 1) * porPagina + 1;
  const hasta = Math.min(actual * porPagina, total);

  const href = (p: number) => {
    const limpio = Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== ""),
    ) as Record<string, string>;
    return { pathname, query: { ...limpio, pagina: String(p) } };
  };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Mostrando {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-2">
        {actual > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(actual - 1)}>Anterior</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
        )}
        <span className="px-1 text-xs">
          Página {actual} de {totalPaginas}
        </span>
        {actual < totalPaginas ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(actual + 1)}>Siguiente</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
}
