/** Convierte un nombre libre (ej. "Gimnasio Fuerza Total!") en un slug de URL
 * (ej. "gimnasio-fuerza-total"): minúsculas, sin tildes, solo `[a-z0-9-]`. */
export function slugify(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "gimnasio";
}

/** Sufijo corto para reintentar un slug tras un choque de unicidad (ej.
 * "gimnasio-fuerza-total-x7k2"). No es criptográfico, solo desambigua. */
export function withRandomSuffix(slug: string): string {
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`;
}
