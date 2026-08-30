import type { Alumno } from "@/lib/types";

/** Misma regla que `v_clasificacion_alumnos.ficha_salud_pendiente` en la base — se
 * repite acá para no depender de una consulta extra cuando ya se tiene la fila del
 * alumno cargada (p. ej. el listado de `/protected/alumnos`, que hace `select("*")`). */
export function fichaSaludPendiente(
  alumno: Pick<Alumno, "activo" | "alergias" | "enfermedades" | "lesiones">,
): boolean {
  if (!alumno.activo) return false;
  const vacio = (v: string | null) => !v || v.trim() === "";
  return vacio(alumno.alergias) || vacio(alumno.enfermedades) || vacio(alumno.lesiones);
}
