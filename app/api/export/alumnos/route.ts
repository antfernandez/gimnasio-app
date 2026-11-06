import { after, NextRequest, NextResponse } from "next/server";

import { formatFecha } from "@/lib/format";
import type { PdfColumn } from "@/lib/export/pdf";
import { buildExportResponse, parseExportFormat } from "@/lib/export/response";
import type { XlsxColumn } from "@/lib/export/xlsx";
import { registrarEvento } from "@/lib/seguridad-eventos";
import { getPerfilExistente, requerirRol } from "@/lib/perfil";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import type { Alumno } from "@/lib/types";

type AlumnoConPlan = Alumno & { plan: { nombre: string } | null };

const COLUMNS: (XlsxColumn & PdfColumn)[] = [
  { header: "Nombres", key: "nombres", width: 20 },
  { header: "Apellidos", key: "apellidos", width: 20 },
  { header: "RUT", key: "rut", width: 14 },
  { header: "Email", key: "email", width: 26 },
  { header: "Teléfono", key: "telefono", width: 16 },
  { header: "Plan", key: "plan", width: 18 },
  { header: "Fecha inicio", key: "fecha_inicio", width: 14 },
  { header: "Estado", key: "estado", width: 12 },
];

/**
 * Exportación de respaldo (Sprint 20): siempre incluye TODOS los alumnos del
 * gimnasio (activos y de baja), sin importar el filtro que esté activo en
 * pantalla — es una red de seguridad, no un espejo de la vista actual.
 */
export async function GET(request: NextRequest) {
  const format = parseExportFormat(request.nextUrl.searchParams.get("format"));
  if (!format) {
    return NextResponse.json(
      { error: "Formato inválido, usa ?format=xlsx o ?format=pdf" },
      { status: 400 },
    );
  }

  const acceso = requerirRol(await getPerfilExistente(), ["dueño", "entrenador"]);
  if (acceso instanceof Response) return acceso;
  const perfilData = acceso;
  after(() =>
    registrarEvento("export_descargado", {
      gimnasioId: perfilData.perfil.gimnasio_id,
      usuarioId: perfilData.perfil.id,
      detalle: { export: "alumnos" },
    }),
  );

  const supabase = await createClient();
  const { data } = await supabase
    .from("alumnos")
    .select("*, plan:planes(nombre)")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("apellidos", { ascending: true });

  const alumnos = (data ?? []) as AlumnoConPlan[];
  const rows = alumnos.map((a) => ({
    nombres: a.nombres,
    apellidos: a.apellidos,
    rut: formatRut(a.rut, a.dig_ver),
    email: a.email ?? "",
    telefono: a.telefono ?? "",
    plan: a.plan?.nombre ?? "",
    fecha_inicio: formatFecha(a.fecha_inicio),
    estado: a.activo ? "Activo" : "De baja",
  }));

  return buildExportResponse({
    format,
    filename: `alumnos_${perfilData.gimnasio.slug ?? "gimnasio"}`,
    sheetName: "Alumnos",
    title: "Alumnos",
    subtitle: perfilData.gimnasio.nombre,
    columns: COLUMNS,
    rows,
  });
}
