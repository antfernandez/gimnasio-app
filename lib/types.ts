// Tipos manuales alineados con `supabase/migrations/0001_modelo_negocio.sql`.
// Ver diseño completo en `.claude/diagramas y modelos/modelo-datos-negocio.md`.

export type PlanGimnasio = "prueba" | "inicial" | "crecimiento";
export type EstadoGimnasio = "activo" | "cancelado";
export type RolPerfil = "dueño" | "entrenador";

export interface Gimnasio {
  id: string;
  nombre: string;
  slug: string | null;
  plan: PlanGimnasio;
  estado: EstadoGimnasio;
  fecha_inicio_plan: string;
  /** Sprint 9: opción configurable, no obligatoria (Valinor prefiere transferencia
   * por la comisión que cobra Mercado Pago). El cobro real llega en el Sprint 13. */
  mercado_pago_habilitado: boolean;
  created_at: string;
}

export interface Perfil {
  id: string;
  gimnasio_id: string;
  nombre_completo: string;
  rol: RolPerfil;
  created_at: string;
}

/** Fila en `superadmins` (Sprint 12) — sin `gimnasio_id`: no pertenece a ningún
 * tenant, ver rationale en `supabase/migrations/0008_roles_superadmin_aprobacion.sql`. */
export interface Superadmin {
  id: string;
  created_at: string;
}

export type EstadoAprobacionAlumno = "pendiente" | "aprobado" | "rechazado";

export interface Alumno {
  id: string;
  gimnasio_id: string;
  user_id: string | null;
  rut: number;
  dig_ver: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  /** Sprint 13: FK a `planes` — reemplaza el texto libre `plan_contratado`. */
  plan_id: string | null;
  fecha_inicio: string;
  fecha_nacimiento: string | null;
  activo: boolean;
  puede_registrar_avances: boolean;
  /** Sprint 13: permiso independiente de `puede_registrar_avances` — habilita el
   * registro propio de sesiones de la bitácora de rutina. */
  puede_registrar_bitacora: boolean;
  /** Aprobación manual del Admin (Sprint 12) — 'aprobado' por defecto para altas
   * hechas por el dueño; 'pendiente' solo en el autorregistro del propio alumno. */
  estado_aprobacion: EstadoAprobacionAlumno;
  /** Ficha de salud (Sprint 9) — todas opcionales, `null` cuando aún no se cargan. */
  alergias: string | null;
  enfermedades: string | null;
  lesiones: string | null;
  objetivos_salud: string | null;
  created_at: string;
  updated_at: string;
}

/** Sprint 13: catálogo de planes por gimnasio (Básico/Intermedio/Avanzado), separado
 * de la Rutina — define cuántos días a la semana entrena el alumno, no el contenido
 * de entrenamiento. */
export type NivelPlan = "basico" | "intermedio" | "avanzado";

export interface Plan {
  id: string;
  gimnasio_id: string;
  nombre: string;
  nivel: NivelPlan;
  precio: number | null;
  dias_por_semana: number;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string | null;
  creado_por: string | null;
  modificado_por: string | null;
  created_at: string;
  updated_at: string;
}

/** Resultado de la RPC `listar_planes_publico`: solo columnas no sensibles, para el
 * selector del registro de alumno. */
export interface PlanPublico {
  id: string;
  nombre: string;
  nivel: NivelPlan;
  precio: number | null;
  dias_por_semana: number;
}

/** Resultado de la función `buscar_gimnasios` (RPC): solo columnas no
 * sensibles, para el selector público del registro de alumno. */
export interface GimnasioPublico {
  id: string;
  nombre: string;
  slug: string | null;
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
  /** Sprint 14: snapshot del plan elegido en ese pago — `null` para pagos que no
   * generan paquete (ej. un ajuste). */
  plan_id: string | null;
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

export interface Paquete {
  id: string;
  gimnasio_id: string;
  alumno_id: string;
  pago_id: string | null;
  clases_incluidas: number;
  clases_consumidas: number;
  fecha_inicio: string;
  /** Generada en la base: `fecha_inicio` + 1 mes corrido (no ciclo calendario). */
  fecha_vencimiento: string;
  created_at: string;
  updated_at: string;
}

export type EstadoPaquete = "vigente" | "por_vencer" | "sin_paquete";

/** Fila de la vista `v_estado_paquetes_alumnos` — equivalente para paquetes a
 * `EstadoPagoAlumno`. Los campos de paquete son `null` cuando `estado_paquete` es
 * `sin_paquete` y el alumno nunca tuvo ninguno. */
export interface EstadoPaqueteAlumno {
  alumno_id: string;
  gimnasio_id: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  paquete_id: string | null;
  clases_incluidas: number | null;
  clases_consumidas: number | null;
  clases_restantes: number | null;
  fecha_inicio: string | null;
  vencimiento_actual: string | null;
  estado_paquete: EstadoPaquete;
}

export type ClasificacionAlumno = "activo" | "inactivo" | "de_prueba";

/** Fila de la vista `v_clasificacion_alumnos`. */
export interface ClasificacionAlumnoRow {
  alumno_id: string;
  gimnasio_id: string;
  nombres: string;
  apellidos: string;
  activo: boolean;
  clasificacion: ClasificacionAlumno;
  ficha_salud_pendiente: boolean;
}

export interface EjercicioRutina {
  ejercicio: string;
  series: number;
  reps: number;
  /** Sprint 15: peso sugerido/planificado, texto libre corto (ej. "40 kg",
   * "corporal", "barra vacía") — no numérico estricto. Opcional. */
  peso?: string;
  notas: string;
}

/** Sprint 14: catálogo de plantillas de rutina por gimnasio, reutilizable entre
 * alumnos — separado de `Rutina`, que sigue siendo el registro de asignación
 * (snapshot copiado de una plantilla a un alumno en una fecha). */
export type CategoriaRutinaPlantilla = "musculacion" | "cardio" | "general";

export interface RutinaPlantilla {
  id: string;
  gimnasio_id: string;
  nombre: string;
  categoria: CategoriaRutinaPlantilla;
  objetivo: string | null;
  contenido: EjercicioRutina[];
  creado_por: string | null;
  modificado_por: string | null;
  created_at: string;
  updated_at: string;
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
  /** Sprint 14: trazabilidad de qué plantilla originó esta asignación — `null`
   * para rutinas creadas antes de este sprint o sin plantilla de origen. */
  plantilla_id: string | null;
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

/** Sprint 13: bitácora de rutina — una fila por ejercicio y sesión. `*_planificadas`
 * es un snapshot de la rutina al momento del registro (no se reescribe si luego se
 * edita la rutina); `*_realizadas`/`peso_kg` es lo que efectivamente se hizo. */
export interface RegistroRutina {
  id: string;
  gimnasio_id: string;
  alumno_id: string;
  rutina_id: string;
  ejercicio_index: number;
  ejercicio: string;
  series_planificadas: number | null;
  reps_planificadas: number | null;
  series_realizadas: number | null;
  reps_realizadas: number | null;
  peso_kg: number | null;
  /** Sprint 15: snapshot del peso planificado (campo `peso` de la plantilla) al
   * momento de registrar la sesión — mismo criterio que `*_planificadas`. */
  peso_planificado: string | null;
  fecha: string;
  registrado_por: string | null;
  origen: OrigenCambio;
  notas: string | null;
  created_at: string;
}

/** 0 = domingo … 6 = sábado — igual a `extract(dow)` en Postgres y a
 * `Date#getUTCDay()` en JS (ver `lib/turnos.ts`). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HorarioDisponible {
  id: string;
  gimnasio_id: string;
  dia_semana: DiaSemana;
  hora_inicio: string; // "HH:MM:SS"
  duracion_min: number;
  cupos: number;
  activo: boolean;
  created_at: string;
}

export type EstadoReserva = "reservada" | "realizada" | "cancelada";
export type OrigenCambio = "dueño" | "alumno";

export interface Reserva {
  id: string;
  gimnasio_id: string;
  alumno_id: string;
  fecha: string; // "YYYY-MM-DD"
  hora_inicio: string; // "HH:MM:SS"
  duracion_min: number;
  estado: EstadoReserva;
  creado_por: OrigenCambio;
  cancelado_por: OrigenCambio | null;
  cancelado_dentro_ventana: boolean | null;
  atendido_por_dueno: boolean;
  reserva_previa_id: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

/** Reserva con el nombre del alumno ya unido (join solo disponible para el dueño). */
export interface ReservaConAlumno extends Reserva {
  alumno: Pick<Alumno, "nombres" | "apellidos"> | null;
}

/** Fila devuelta por la RPC `turnos_disponibilidad`: ocupación agregada por turno,
 * sin identidad de alumnos (lo que puede ver el rol Alumno de los demás). */
export interface DisponibilidadTurno {
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  cupos: number;
  cupos_ocupados: number;
}
