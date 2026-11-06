/** Spec 68: política de contraseña común a registro y cambio de contraseña.
 * Debe coincidir con la configuración de Supabase Auth (mínimo 8, letras y números). */
export const PASSWORD_MIN = 8;

export function errorContrasena(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir letras y números.";
  }
  return null;
}
