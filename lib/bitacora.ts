import type { EjercicioRutina } from "@/lib/types";

export type FilaRegistroRutina = {
  ejercicio_index: number;
  ejercicio: string;
  series_planificadas: number | null;
  reps_planificadas: number | null;
  peso_planificado: string | null;
  series_realizadas: number | null;
  reps_realizadas: number | null;
  peso_kg: number | null;
  notas: string | null;
};

function numeroONulo(v: string): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Zipea los ejercicios de la rutina (snapshot de lo planificado, leído fresco de
 * la base — nunca confiado del cliente) con los valores realizados que llegan del
 * formulario (mismo patrón `formData.getAll` que `rutinas/actions.ts`), y descarta
 * las filas sin ningún valor cargado. */
export function buildFilasRegistroRutina(
  contenido: EjercicioRutina[],
  formData: FormData,
): FilaRegistroRutina[] {
  const seriesRealizadas = formData.getAll("series_realizadas").map((v) => String(v).trim());
  const repsRealizadas = formData.getAll("reps_realizadas").map((v) => String(v).trim());
  const pesoKg = formData.getAll("peso_kg").map((v) => String(v).trim());
  const notas = formData.getAll("notas").map((v) => String(v).trim());

  return contenido
    .map((ej, i) => ({
      ejercicio_index: i,
      ejercicio: ej.ejercicio,
      series_planificadas: ej.series || null,
      reps_planificadas: ej.reps || null,
      peso_planificado: ej.peso ?? null,
      series_realizadas: numeroONulo(seriesRealizadas[i] ?? ""),
      reps_realizadas: numeroONulo(repsRealizadas[i] ?? ""),
      peso_kg: numeroONulo(pesoKg[i] ?? ""),
      notas: notas[i] || null,
    }))
    .filter(
      (f) =>
        f.series_realizadas !== null ||
        f.reps_realizadas !== null ||
        f.peso_kg !== null ||
        f.notas !== null,
    );
}
