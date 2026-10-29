/** Un mes de gracia sobre `suscripcion_hasta` (AAAA-MM-DD); fin de mes si el día no existe. */
export function limiteGracia(hasta: string): string {
  const [y, m, d] = hasta.split("-").map(Number);
  const f = new Date(Date.UTC(y, m, d));
  if (f.getUTCDate() !== d) f.setUTCDate(0);
  return f.toISOString().slice(0, 10);
}

/** Con plan y vencimiento informado, vencido hace más de 1 mes (spec 49 §3). */
export function suscripcionCongelada(
  g: { plan_sistema_id?: string | null; suscripcion_hasta?: string | null },
  hoy: string,
): boolean {
  if (!g.plan_sistema_id || !g.suscripcion_hasta) return false;
  return hoy > limiteGracia(g.suscripcion_hasta);
}

/** Nadie (dueño ni alumnos) opera si el gimnasio está cancelado o congelado. */
export function gimnasioBloqueado(
  g: { estado: string; plan_sistema_id?: string | null; suscripcion_hasta?: string | null },
  hoy: string,
): boolean {
  return g.estado === "cancelado" || suscripcionCongelada(g, hoy);
}
