/** Spec 58: validación de los datos de contacto del alumno (teléfono y correo). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO_CHARS_RE = /^\+?[\d\s()-]+$/;

/** Quita todo lo que no sea dígito, espacio, paréntesis, guion o "+" inicial. */
export function limpiarTelefono(v: string): string {
  return v.replace(/(?!^\+)[^\d\s()-]/g, "");
}

/** Devuelve el mensaje de error, o null si el teléfono es válido (vacío es válido). */
export function validarTelefono(v: string): string | null {
  if (!v) return null;
  if (!TELEFONO_CHARS_RE.test(v)) {
    return "El teléfono solo puede tener números, espacios, guiones, paréntesis y un + inicial.";
  }
  const digitos = v.replace(/\D/g, "").length;
  if (digitos < 8 || digitos > 15) return "El teléfono debe tener entre 8 y 15 dígitos.";
  return null;
}

/** Devuelve el mensaje de error, o null si el correo es válido (vacío es válido). */
export function validarEmail(v: string): string | null {
  if (!v) return null;
  if (v.length > 200 || !EMAIL_RE.test(v)) return "Ingresa un correo electrónico válido.";
  return null;
}
