/** Tamaño de página estándar de todas las grillas (spec 37). */
export const POR_PAGINA = 10;

/** Número de página desde `searchParams` (mínimo 1). */
export function leerPagina(valor: string | undefined): number {
  return Math.max(1, Number.parseInt(valor ?? "1", 10) || 1);
}

/** Rango inclusivo `[desde, hasta]` para el `.range()` de Supabase. */
export function rangoPagina(pagina: number, porPagina = POR_PAGINA): [number, number] {
  return [(pagina - 1) * porPagina, pagina * porPagina - 1];
}

/** Corta una lista ya filtrada en memoria (solo cuando el filtro es calculado, no SQL). */
export function cortarPagina<T>(lista: T[], pagina: number, porPagina = POR_PAGINA): T[] {
  return lista.slice((pagina - 1) * porPagina, pagina * porPagina);
}
