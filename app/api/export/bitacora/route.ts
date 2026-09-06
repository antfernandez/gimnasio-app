import { NextRequest, NextResponse } from "next/server";

import { formatFecha } from "@/lib/format";
import type { PdfColumn } from "@/lib/export/pdf";
import { buildExportResponse, parseExportFormat } from "@/lib/export/response";
import type { XlsxColumn } from "@/lib/export/xlsx";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { RegistroRutina } from "@/lib/types";

type RegistroConAlumno = RegistroRutina & {
  alumno: { nombres: string; apellidos: string } | null;
};

const ORIGEN_LABEL: Record<string, string> = {
  dueño: "Dueño/a",
  alumno: "Alumno",
};

const COLUMNS: (XlsxColumn & PdfColumn)[] = [
  { header: "Fecha", key: "fecha", width: 12 },
  { header: "Alumno", key: "alumno", width: 22 },
  { header: "Ejercicio", key: "ejercicio", width: 22 },
  { header: "Series plan.", key: "series_planificadas", width: 10, align: "right" },
  { header: "Reps plan.", key: "reps_planificadas", width: 10, align: "right" },
  { header: "Series real.", key: "series_realizadas", width: 10, align: "right" },
  { header: "Reps real.", key: "reps_realizadas", width: 10, align: "right" },
  { header: "Peso (kg)", key: "peso_kg", width: 10, align: "right" },
  { header: "Registrado por", key: "origen", width: 14 },
  { header: "Notas", key: "notas", width: 24 },
];

/**
 * Exportación de respaldo (Sprint 20): historial completo de la bitácora de rutina
 * (registros_rutina, Sprint 13) del gimnasio — no solo el bloque/día que esté
 * abierto en /protected/bitacora.
 */
export async function GET(request: NextRequest) {
  const format = parseExportFormat(request.nextUrl.searchParams.get("format"));
  if (!format) {
    return NextResponse.json(
      { error: "Formato inválido, usa ?format=xlsx o ?format=pdf" },
      { status: 400 },
    );
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("registros_rutina")
    .select("*, alumno:alumnos(nombres, apellidos)")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("fecha", { ascending: false });

  const registros = (data ?? []) as RegistroConAlumno[];
  const rows = registros.map((r) => ({
    fecha: formatFecha(r.fecha),
    alumno: r.alumno ? `${r.alumno.nombres} ${r.alumno.apellidos}` : "",
    ejercicio: r.ejercicio,
    series_planificadas: r.series_planificadas ?? "",
    reps_planificadas: r.reps_planificadas ?? "",
    series_realizadas: r.series_realizadas ?? "",
    reps_realizadas: r.reps_realizadas ?? "",
    peso_kg: r.peso_kg ?? "",
    origen: ORIGEN_LABEL[r.origen] ?? r.origen,
    notas: r.notas ?? "",
  }));

  return buildExportResponse({
    format,
    filename: `bitacora_${perfilData.gimnasio.slug ?? "gimnasio"}`,
    sheetName: "Bitácora",
    title: "Bitácora de rutina",
    subtitle: perfilData.gimnasio.nombre,
    columns: COLUMNS,
    rows,
  });
}
