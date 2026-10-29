/** Planes del sistema que paga la dueña (Spec 30). Fuente única de precios y límites. */
export const IVA = 0.19;

export const PLANES_SISTEMA = [
  { nombre: "Inicial", maxAlumnos: 150, precioNeto: 29990, orden: 1 },
  { nombre: "Crecimiento", maxAlumnos: 300, precioNeto: 49990, orden: 2 },
  { nombre: "Escala", maxAlumnos: 450, precioNeto: 69990, orden: 3 },
] as const;

export type PlanSistemaDef = (typeof PLANES_SISTEMA)[number];

export function planSistemaPorNombre(nombre: string | null | undefined): PlanSistemaDef | null {
  return PLANES_SISTEMA.find((p) => p.nombre === nombre) ?? null;
}

/** Precio mensual con IVA incluido. */
export function precioMensualConIva(precioNeto: number): number {
  return Math.round(precioNeto * (1 + IVA));
}

/** Total a pagar por `meses` meses, con IVA. Sin descuento por pago anticipado. */
export function calcularMontoSuscripcion(precioNeto: number, meses: number): number {
  return precioMensualConIva(precioNeto) * meses;
}

export const FUNCIONES_SISTEMA = [
  { titulo: "Membresía", detalle: "Fichas, planes, vencimientos, congelamientos, pases de prueba y grupos familiares." },
  { titulo: "Calendario de clases", detalle: "Cupos, profesores, inscripción online." },
  { titulo: "Pagos online", detalle: "Mercado Pago, transferencia con comprobante, desde el portal." },
  { titulo: "Portal del socio", detalle: "Membresía, clases, rutinas y pagos; versión web adaptada a móviles." },
  { titulo: "Nutrición", detalle: "Planes y recetas con macros automáticos; cada socio ve sus calorías del día y anota lo que come." },
  { titulo: "Inscripción online", detalle: "Página pública con fotos y planes para que socios nuevos se registren solos." },
  { titulo: "Usuarios y permisos", detalle: "Staff con permisos por módulo y bitácora de acciones." },
  { titulo: "Carga masiva", detalle: "Importa socios y productos desde Excel." },
] as const;

export const FUNCIONES_VISIBLES = 4;
