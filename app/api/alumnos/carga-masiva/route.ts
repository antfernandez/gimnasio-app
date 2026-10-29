import { NextRequest, NextResponse } from "next/server";

import {
  leerArchivo,
  MAX_BYTES,
  validarFilas,
  type ErrorCarga,
  type FilaResultado,
} from "@/lib/carga-alumnos";
import { planesVigentes } from "@/lib/carga-alumnos-server";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";

/** Spec 34: validación previa (modo=validar, no escribe nada) e importación (modo=importar)
 * de alumnos desde el template. Ambas revalidan el archivo completo en el servidor; el
 * gimnasio sale siempre del perfil del usuario. */
export async function POST(request: NextRequest) {
  const perfilData = await getPerfilActual();
  if (!perfilData) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (perfilData.perfil.rol !== "dueño") {
    return NextResponse.json({ error: "Solo el dueño puede cargar alumnos" }, { status: 403 });
  }

  const form = await request.formData();
  const archivo = form.get("archivo");
  const modo = form.get("modo") === "importar" ? "importar" : "validar";
  const actualizar = form.get("actualizar") === "1";

  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Sube un archivo .xlsx." }, { status: 400 });
  }
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "El archivo debe ser .xlsx." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 5 MB." }, { status: 400 });
  }

  const lectura = await leerArchivo(Buffer.from(await archivo.arrayBuffer()));
  if (!lectura.ok) return NextResponse.json({ error: lectura.error }, { status: 400 });

  const supabase = await createClient();
  const gimnasioId = perfilData.perfil.gimnasio_id;
  const hoy = hoyIso();

  const [planes, { data: alumnos }, { data: tramos }, { count: activos }] = await Promise.all([
    planesVigentes(supabase, gimnasioId, hoy),
    supabase.from("alumnos").select("rut, email").eq("gimnasio_id", gimnasioId),
    supabase.from("planes_sistema").select("max_alumnos").eq("activo", true),
    supabase
      .from("alumnos")
      .select("id", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true),
  ]);

  const existentes = new Map<number, string | null>();
  const emailsExistentes = new Map<string, number>();
  for (const a of (alumnos ?? []) as { rut: number; email: string | null }[]) {
    existentes.set(a.rut, a.email);
    if (a.email) emailsExistentes.set(a.email.toLowerCase(), a.rut);
  }

  const resultados = validarFilas(lectura.filas, {
    planes,
    existentes,
    emailsExistentes,
    actualizar,
    hoy,
  });

  // Tope del sistema (spec 30): el último tramo es el techo; si alguno no tiene tope, no hay límite.
  const topes = ((tramos ?? []) as { max_alumnos: number | null }[]).map((t) => t.max_alumnos);
  const tope = topes.length > 0 && !topes.includes(null) ? Math.max(...(topes as number[])) : null;
  const nuevosActivos = resultados.filter((r) => r.estado === "valida" && r.datos?.activo).length;
  const bloqueo =
    tope !== null && (activos ?? 0) + nuevosActivos > tope
      ? `La carga deja ${(activos ?? 0) + nuevosActivos} alumnos activos y el máximo del sistema es ${tope}. Reduce el archivo para continuar.`
      : null;

  const resumen = {
    validas: resultados.filter((r) => r.estado === "valida").length,
    actualizar: resultados.filter((r) => r.estado === "actualizar").length,
    errores: resultados.filter((r) => r.estado === "error").length,
    duplicadas: resultados.filter((r) => r.estado === "duplicada").length,
  };

  if (modo === "validar") {
    // `datos` no viaja al cliente: la importación revalida el archivo.
    const filas = resultados.map((r: FilaResultado) => ({
      fila: r.fila,
      rut: r.rut,
      nombre: r.nombre,
      estado: r.estado,
      motivos: r.motivos,
    }));
    return NextResponse.json({ filas, resumen, bloqueo });
  }

  if (bloqueo) return NextResponse.json({ error: bloqueo }, { status: 409 });
  const importables = resultados.filter((r) => r.datos);
  if (importables.length === 0) {
    return NextResponse.json({ error: "No hay filas válidas para importar." }, { status: 400 });
  }

  const errores: ErrorCarga[] = resultados
    .filter((r) => r.estado === "error" || r.estado === "duplicada")
    .map((r) => ({
      fila: r.fila,
      rut: r.rut,
      nombre: r.nombre,
      estado: r.estado === "duplicada" ? "Duplicada" : "Con error",
      motivo: r.motivos.join("; "),
    }));

  const { data, error } = await supabase.rpc("importar_alumnos", {
    p_filas: importables.map((r) => r.datos),
    p_actualizar: actualizar,
    p_archivo: archivo.name,
    p_errores: errores,
  });
  if (error) {
    console.error("No se pudo importar alumnos", error);
    return NextResponse.json(
      { error: "No se pudo importar el lote; no se guardó ningún alumno. Intenta de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ resultado: data });
}
