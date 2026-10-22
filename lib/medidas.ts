import type { MedidasAvance } from "@/lib/types";

/** Medidas que se registran hoy, en el orden en que se muestran. */
export const CAMPOS_MEDIDA = [
  { campo: "cintura_cm", etiqueta: "Cintura", placeholder: "80" },
  { campo: "cadera_cm", etiqueta: "Cadera", placeholder: "95" },
  { campo: "pecho_cm", etiqueta: "Pecho", placeholder: "100" },
  { campo: "cuello_cm", etiqueta: "Cuello", placeholder: "35" },
  { campo: "brazo_izq_cm", etiqueta: "Brazo izq.", placeholder: "32" },
  { campo: "brazo_der_cm", etiqueta: "Brazo der.", placeholder: "32" },
  { campo: "muslo_izq_cm", etiqueta: "Muslo izq.", placeholder: "55" },
  { campo: "muslo_der_cm", etiqueta: "Muslo der.", placeholder: "55" },
  { campo: "pantorrilla_izq_cm", etiqueta: "Pantorrilla izq.", placeholder: "36" },
  { campo: "pantorrilla_der_cm", etiqueta: "Pantorrilla der.", placeholder: "36" },
] as const satisfies readonly {
  campo: keyof MedidasAvance;
  etiqueta: string;
  placeholder: string;
}[];

/** Claves de registros antiguos (sin lado); solo lectura. */
const CAMPOS_MEDIDA_ANTIGUOS = [
  { campo: "brazo_cm", etiqueta: "Brazo (sin lado)" },
  { campo: "muslos_cm", etiqueta: "Muslos (sin lado)" },
  { campo: "pantorrillas_cm", etiqueta: "Pantorrillas (sin lado)" },
] as const satisfies readonly { campo: keyof MedidasAvance; etiqueta: string }[];

/** Pares etiqueta/valor de las medidas cargadas, incluidas las claves antiguas. */
export function listarMedidas(medidas: MedidasAvance): { etiqueta: string; valor: number }[] {
  return [...CAMPOS_MEDIDA, ...CAMPOS_MEDIDA_ANTIGUOS]
    .filter((m) => medidas[m.campo])
    .map((m) => ({ etiqueta: m.etiqueta, valor: medidas[m.campo]! }));
}

export function formatMedidas(medidas: MedidasAvance): string {
  const partes = listarMedidas(medidas).map((m) => `${m.etiqueta} ${m.valor}cm`);
  return partes.length > 0 ? partes.join(" · ") : "—";
}
