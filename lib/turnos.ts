import type { DiaSemana, HorarioDisponible } from "@/lib/types";

export const NOMBRES_DIA: Record<DiaSemana, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export const NOMBRES_DIA_CORTO: Record<DiaSemana, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

export const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "YYYY-MM-DD" -> día de la semana 0-6 (domingo-sábado), igual a `extract(dow)` en
 * Postgres. Usa UTC para no depender de la zona horaria del navegador/servidor. */
export function diaSemanaDeFecha(fechaIso: string): DiaSemana {
  const [y, m, d] = fechaIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as DiaSemana;
}

/** "HH:MM:SS" (formato de Postgres `time`) -> "HH:MM" para mostrar. */
export function formatHora(hora: string): string {
  return hora.slice(0, 5);
}

export function sumarMinutos(horaInicio: string, minutos: number): string {
  const [hh, mm] = horaInicio.split(":").map(Number);
  const total = hh * 60 + mm + minutos;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" +/- días, en UTC (evita corrimientos por zona horaria). */
export function sumarDias(fechaIso: string, dias: number): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

/** Domingo de la semana que contiene `fechaIso` (mismo criterio 0=domingo que
 * `diaSemanaDeFecha`). */
export function inicioDeSemana(fechaIso: string): string {
  return sumarDias(fechaIso, -diaSemanaDeFecha(fechaIso));
}

export function diasDeLaSemana(fechaIso: string): string[] {
  const inicio = inicioDeSemana(fechaIso);
  return Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));
}

/** Todas las fechas "YYYY-MM-DD" del mes de `fechaIso` (día 1 al último). */
export function diasDelMes(fechaIso: string): string[] {
  const [y, m] = fechaIso.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from(
    { length: ultimoDia },
    (_, i) => `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
  );
}

/** Grilla de 6 semanas (42 días) para la vista Mes, empezando el domingo previo (o
 * igual) al día 1 y terminando el sábado que cierra la última semana del mes. */
export function grillaMes(fechaIso: string): string[] {
  const [y, m] = fechaIso.split("-").map(Number);
  const primerDia = `${y}-${String(m).padStart(2, "0")}-01`;
  const inicio = inicioDeSemana(primerDia);
  return Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
}

export function esMismoMes(fechaIso: string, referenciaIso: string): boolean {
  return fechaIso.slice(0, 7) === referenciaIso.slice(0, 7);
}

/** Hoy como "YYYY-MM-DD" en la zona horaria local del navegador/servidor. Para el
 * cálculo autoritativo de la ventana de 24 h manda siempre la base de datos
 * (`reservas_before_update`, migración 0006) — esto es solo para resaltar "hoy" en
 * el calendario y para hints de UI antes de confirmar una acción. */
export function hoyIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Hint de UI: ¿esta reserva todavía está dentro de la ventana de 24 h de Valinor?
 * Aproximado (usa la hora local del navegador, no 'America/Santiago' explícito) —
 * suficiente para mostrar/ocultar el aviso de penalidad antes de confirmar; el
 * resultado real siempre lo decide el trigger en la base de datos. */
export function dentroDeVentana24hAprox(fechaIso: string, horaInicio: string): boolean {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const [hh, mm] = horaInicio.split(":").map(Number);
  const inicioTurno = new Date(y, m - 1, d, hh, mm).getTime();
  return inicioTurno - Date.now() >= 24 * 60 * 60 * 1000;
}

/** Hint de UI (Sprint 9): ¿ya pasó la hora de inicio de este turno? Se usa para decidir
 * si mostrar "Marcar realizada" (asistencia normal o inasistencia — el descuento real
 * del paquete lo hace el trigger `consumir_clase_paquete` al cambiar el estado, sin
 * importar por qué camino llegó a 'realizada'). Aproximado, igual que la función de
 * arriba — la reserva se puede marcar realizada igual aunque el navegador desfase unos
 * minutos, no hay regla de negocio que dependa de la precisión acá. */
export function yaPaso(fechaIso: string, horaInicio: string): boolean {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const [hh, mm] = horaInicio.split(":").map(Number);
  const inicioTurno = new Date(y, m - 1, d, hh, mm).getTime();
  return inicioTurno <= Date.now();
}

/** Un turno base (fecha + horario) antes de saber cuántos cupos están ocupados —
 * misma forma para el dueño y para el alumno, cada página arma la ocupación real
 * con su propia fuente de datos (ver `app/protected/turnos/page.tsx` y
 * `app/portal/turnos/page.tsx`) y la combina con esto. */
export interface SlotBase {
  fecha: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  duracionMin: number;
  cupos: number;
  horarioId: string;
}

/** Cruza el rango de fechas visible con la plantilla semanal (`horarios_disponibles`)
 * y devuelve un slot por cada combinación fecha+horario activo — la grilla base del
 * calendario, todavía sin reservas. */
export function construirSlots(
  fechas: string[],
  horarios: HorarioDisponible[],
): SlotBase[] {
  const porDia = new Map<DiaSemana, HorarioDisponible[]>();
  for (const h of horarios) {
    if (!h.activo) continue;
    const lista = porDia.get(h.dia_semana) ?? [];
    lista.push(h);
    porDia.set(h.dia_semana, lista);
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }

  const slots: SlotBase[] = [];
  for (const fecha of fechas) {
    const dia = diaSemanaDeFecha(fecha);
    for (const h of porDia.get(dia) ?? []) {
      slots.push({
        fecha,
        diaSemana: dia,
        horaInicio: h.hora_inicio,
        duracionMin: h.duracion_min,
        cupos: h.cupos,
        horarioId: h.id,
      });
    }
  }
  return slots;
}

/** Horario semanal real de Valinor (informe de la dueña,
 * `.claude/specs/valinor-informacion-recopilada.md`), como preset de conveniencia
 * para el formulario de configuración — no hardcodeado en la base de datos, ver
 * comentario al inicio de `supabase/migrations/0006_turnos_reservas.sql`. */
export const PRESET_HORARIO_VALINOR: {
  dia_semana: DiaSemana;
  hora_inicio: string;
}[] = (() => {
  const horas = [
    "06:00",
    "06:30",
    "08:30",
    "09:00",
    "10:00",
    "10:30",
    "11:00",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
  ];
  const filas: { dia_semana: DiaSemana; hora_inicio: string }[] = [];
  for (const dia of [1, 2, 3, 4] as DiaSemana[]) {
    for (const h of horas) filas.push({ dia_semana: dia, hora_inicio: h });
  }
  // Viernes: mismo patrón, pero el último turno es a las 17:30 (sin el de 18:00).
  for (const h of horas.filter((h) => h !== "18:00")) {
    filas.push({ dia_semana: 5 as DiaSemana, hora_inicio: h });
  }
  return filas;
})();
