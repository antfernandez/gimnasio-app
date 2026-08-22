// Tipos manuales alineados con `supabase/migrations/0001_modelo_negocio.sql`.
// Ver diseño completo en `.claude/diagramas y modelos/modelo-datos-negocio.md`.

export type PlanGimnasio = "prueba" | "inicial" | "crecimiento";
export type EstadoGimnasio = "activo" | "cancelado";
export type RolPerfil = "dueño" | "entrenador";

export interface Gimnasio {
  id: string;
  nombre: string;
  plan: PlanGimnasio;
  estado: EstadoGimnasio;
  fecha_inicio_plan: string;
  created_at: string;
}

export interface Perfil {
  id: string;
  gimnasio_id: string;
  nombre_completo: string;
  rol: RolPerfil;
  created_at: string;
}

export interface Alumno {
  id: string;
  gimnasio_id: string;
  rut: number;
  dig_ver: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  plan_contratado: string;
  fecha_inicio: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "otro";

export interface Pago {
  id: string;
  gimnasio_id: string;
  alumno_id: string;
  monto: number;
  fecha_pago: string;
  metodo: MetodoPago;
  periodo_desde: string;
  periodo_hasta: string;
  created_at: string;
}

export type EstadoPago = "al_dia" | "atrasado" | "sin_pagos";

export interface EstadoPagoAlumno {
  alumno_id: string;
  gimnasio_id: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  vencimiento_actual: string | null;
  estado_pago: EstadoPago;
}

export interface EjercicioRutina {
  ejercicio: string;
  series: number;
  reps: number;
  notas: string;
}

export interface Rutina {
  id: string;
  gimnasio_id: string;
  alumno_id: string;
  creado_por: string | null;
  nombre: string;
  objetivo: string | null;
  contenido: EjercicioRutina[];
  fecha_asignacion: string;
  activa: boolean;
  created_at: string;
}

export interface MedidasAvance {
  cintura_cm?: number;
  cadera_cm?: number;
  pecho_cm?: number;
  brazo_cm?: number;
}

export interface Avance {
  id: string;
  gimnasio_id: string;
  alumno_id: string;
  registrado_por: string | null;
  fecha: string;
  peso_kg: number | null;
  medidas: MedidasAvance;
  notas: string | null;
  created_at: string;
}
