import { NextRequest, NextResponse } from "next/server";

import { formatFecha, formatMonto } from "@/lib/format";
import type { PdfColumn } from "@/lib/export/pdf";
import { buildExportResponse, parseExportFormat } from "@/lib/export/response";
import type { XlsxColumn } from "@/lib/export/xlsx";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_PAGO } from "@/lib/estados-pago";
import type { EstadoPago, Pago } from "@/lib/types";

type PagoConDetalle = Pago & {
  alumno: { nombres: string; apellidos: string } | null;
  plan: { nombre: string } | null;
};

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

const COLUMNS: (XlsxColumn & PdfColumn)[] = [
  { header: "Alumno", key: "alumno", width: 24 },
  { header: "Monto", key: "monto", width: 14, align: "right" },
  { header: "Fecha de pago", key: "fecha_pago", width: 14 },
  { header: "Método", key: "metodo", width: 14 },
  { header: "Período desde", key: "periodo_desde", width: 14 },
  { header: "Período hasta", key: "periodo_hasta", width: 14 },
  { header: "Plan", key: "plan", width: 18 },
];

/**
 * Exportación de respaldo (Sprint 20): historial completo de pagos del gimnasio,
 * no solo el estado actual que muestra /protected/pagos.
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

  // Mismos filtros que la pantalla de Pagos (`q` y `estado`): se resuelven contra la
  // vista de cobranza y se exportan todos los pagos de esos alumnos, sin paginar.
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const estado = request.nextUrl.searchParams.get("estado");
  let alumnoIds: string[] | null = null;
  if (q || ESTADOS_PAGO.includes(estado as EstadoPago)) {
    let filtro = supabase
      .from("v_estado_cobranza_alumnos")
      .select("alumno_id")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .eq("activo", true);
    if (estado && ESTADOS_PAGO.includes(estado as EstadoPago)) {
      filtro = filtro.eq("estado_pago", estado);
    }
    if (q) {
      const qSafe = q.replace(/[,%]/g, "");
      filtro = filtro.or(`nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`);
    }
    const { data: filtrados } = await filtro;
    alumnoIds = (filtrados ?? []).map((r) => r.alumno_id as string);
  }

  let query = supabase
    .from("pagos")
    .select("*, alumno:alumnos(nombres, apellidos), plan:planes(nombre)")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("fecha_pago", { ascending: false });
  if (alumnoIds) query = query.in("alumno_id", alumnoIds);
  const { data } = await query;

  const pagos = (data ?? []) as PagoConDetalle[];
  const rows = pagos.map((p) => ({
    alumno: p.alumno ? `${p.alumno.nombres} ${p.alumno.apellidos}` : "",
    monto: formatMonto(p.monto),
    fecha_pago: formatFecha(p.fecha_pago),
    metodo: METODO_LABEL[p.metodo] ?? p.metodo,
    periodo_desde: formatFecha(p.periodo_desde),
    periodo_hasta: formatFecha(p.periodo_hasta),
    plan: p.plan?.nombre ?? "",
  }));

  return buildExportResponse({
    format,
    filename: `pagos_${perfilData.gimnasio.slug ?? "gimnasio"}`,
    sheetName: "Pagos",
    title: "Pagos",
    subtitle: perfilData.gimnasio.nombre,
    columns: COLUMNS,
    rows,
  });
}
