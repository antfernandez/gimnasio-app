import type { RegistroRutina, Rutina } from "@/lib/types";

export type SesionProgreso = {
  clave: string;
  fecha: string;
  rutinaNombre: string;
  notas: string;
  registros: RegistroRutina[];
};

export type DetalleSesion = {
  fecha: string;
  rutinaNombre: string;
  /** Ejercicios que tenía la rutina, con lo registrado ese día (si lo hubo). */
  filas: { ejercicio: string; planificado: string; realizado: string; notas: string }[];
};

function textoPlan(s: number | null, r: number | null, peso: string | null): string {
  if (!s && !r && !peso) return "—";
  const base = `${s ?? "—"} × ${r ?? "—"}`;
  return peso ? `${base} · ${peso}` : base;
}

export function textoRealizado(r: RegistroRutina): string {
  if (!r.series_realizadas && !r.reps_realizadas && !r.peso_kg) return "—";
  const base = `${r.series_realizadas ?? "—"} × ${r.reps_realizadas ?? "—"}`;
  return r.peso_kg ? `${base} · ${r.peso_kg} kg` : base;
}

export function textoPlanificado(r: RegistroRutina): string {
  return textoPlan(r.series_planificadas, r.reps_planificadas, r.peso_planificado);
}

/** Una sesión = los registros de una misma fecha y rutina; más reciente primero. */
export function agruparSesiones(registros: RegistroRutina[], rutinas: Rutina[]): SesionProgreso[] {
  const nombrePorRutina = new Map(rutinas.map((r) => [r.id, r.nombre]));
  const mapa = new Map<string, SesionProgreso>();
  for (const reg of registros) {
    const clave = `${reg.fecha}|${reg.rutina_id}`;
    const s = mapa.get(clave) ?? {
      clave,
      fecha: reg.fecha,
      rutinaNombre: nombrePorRutina.get(reg.rutina_id) ?? "Rutina",
      notas: "",
      registros: [],
    };
    s.registros.push(reg);
    mapa.set(clave, s);
  }
  return [...mapa.values()]
    .map((s) => ({
      ...s,
      registros: [...s.registros].sort((a, b) => a.ejercicio_index - b.ejercicio_index),
      notas: s.registros
        .map((r) => r.notas)
        .filter(Boolean)
        .join(" · "),
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

/** Cruza lo que contenía la rutina con lo registrado en la sesión. */
export function detalleSesion(sesion: SesionProgreso, rutina: Rutina | undefined): DetalleSesion {
  const porIndice = new Map(sesion.registros.map((r) => [r.ejercicio_index, r]));
  const filas: DetalleSesion["filas"] = (rutina?.contenido ?? []).map((ej, i) => {
    const reg = porIndice.get(i);
    porIndice.delete(i);
    return {
      ejercicio: ej.ejercicio,
      planificado: reg ? textoPlanificado(reg) : textoPlan(ej.series, ej.reps, ej.peso ?? null),
      realizado: reg ? textoRealizado(reg) : "Sin registro",
      notas: reg?.notas ?? "",
    };
  });
  // Registros cuyo ejercicio ya no está en la rutina (p. ej. ajustada después).
  for (const reg of porIndice.values()) {
    filas.push({
      ejercicio: reg.ejercicio,
      planificado: textoPlanificado(reg),
      realizado: textoRealizado(reg),
      notas: reg.notas ?? "",
    });
  }
  return { fecha: sesion.fecha, rutinaNombre: sesion.rutinaNombre, filas };
}
