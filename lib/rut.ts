// RUT chileno: se guarda como `rut` (entero, sin puntos ni dígito verificador) + `dig_ver`
// ('0'-'9' o 'K'). Ver modelo de datos en `.claude/diagramas y modelos/modelo-datos-negocio.md`.

export function computeDv(rut: number): string {
  let suma = 0;
  let multiplicador = 2;
  for (const digito of String(rut).split("").reverse()) {
    suma += Number(digito) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

export function isValidRut(rut: number, dv: string): boolean {
  if (!Number.isInteger(rut) || rut <= 0) return false;
  if (!/^[0-9K]$/.test(dv)) return false;
  return computeDv(rut) === dv;
}

/** Acepta "12.345.678-9", "12345678-9", "12345678 9", etc. */
export function parseRut(
  input: string,
): { rut: number; dv: string } | null {
  const clean = input.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  const match = clean.match(/^(\d{1,8})-?([0-9K])$/);
  if (!match) return null;
  const rut = Number(match[1]);
  const dv = match[2];
  if (!isValidRut(rut, dv)) return null;
  return { rut, dv };
}

export function formatRut(rut: number, dv: string): string {
  const withDots = String(rut).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}
