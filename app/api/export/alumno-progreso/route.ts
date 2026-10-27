import { NextRequest, NextResponse } from "next/server";

import { buildProgresoPdf } from "@/lib/export/progreso-pdf";
import { getPerfilActual } from "@/lib/perfil";
import { agruparSesiones } from "@/lib/progreso";
import { createClient } from "@/lib/supabase/server";
import { NOMBRES_MES } from "@/lib/turnos";
import type { Alumno, Avance, RegistroRutina, Rutina } from "@/lib/types";

/** Spec 14: PDF de progreso de un alumno por año (`?anio=`) o por mes (`&mes=1-12`),
 * con gráficos y tablas de detalle. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const alumnoId = params.get("alumno") ?? "";
  const anio = Number(params.get("anio"));
  const mesParam = params.get("mes");
  const mes = mesParam ? Number(mesParam) : null;

  if (!alumnoId || !Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
    return NextResponse.json({ error: "Mes inválido" }, { status: 400 });
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", alumnoId)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .maybeSingle();
  if (!alumno) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  const a = alumno as Alumno;

  const mm = mes ? String(mes).padStart(2, "0") : null;
  const desde = mm ? `${anio}-${mm}-01` : `${anio}-01-01`;
  const hasta = mm
    ? `${anio}-${mm}-${String(new Date(Date.UTC(anio, mes!, 0)).getUTCDate()).padStart(2, "0")}`
    : `${anio}-12-31`;

  const [{ data: registros }, { data: rutinas }, { data: avances }] = await Promise.all([
    supabase
      .from("registros_rutina")
      .select("*")
      .eq("alumno_id", a.id)
      .gte("fecha", desde)
      .lte("fecha", hasta),
    supabase.from("rutinas").select("*").eq("alumno_id", a.id),
    supabase
      .from("avances")
      .select("*")
      .eq("alumno_id", a.id)
      .gte("fecha", desde)
      .lte("fecha", hasta),
  ]);

  const sesiones = agruparSesiones(
    (registros ?? []) as RegistroRutina[],
    (rutinas ?? []) as Rutina[],
  );

  // Barras: 12 meses si es el año completo; semanas (días 1-7, 8-14…) si es un mes.
  const sesionesPorPeriodo = mes
    ? Array.from({ length: Math.ceil(Number(hasta.slice(8)) / 7) }, (_, i) => ({
        etiqueta: `Sem ${i + 1}`,
        valor: sesiones.filter((s) => Math.floor((Number(s.fecha.slice(8)) - 1) / 7) === i).length,
      }))
    : NOMBRES_MES.map((nombre, i) => ({
        etiqueta: nombre.slice(0, 3),
        valor: sesiones.filter((s) => Number(s.fecha.slice(5, 7)) === i + 1).length,
      }));

  const pdf = await buildProgresoPdf({
    alumno: `${a.nombres} ${a.apellidos}`,
    gimnasio: perfilData.gimnasio.nombre,
    periodo: mes ? `${NOMBRES_MES[mes - 1]} ${anio}` : `Año ${anio}`,
    sesionesPorPeriodo,
    sesiones,
    avances: (avances ?? []) as Avance[],
  });

  const nombreArchivo = `progreso_${a.apellidos}_${anio}${mm ? `-${mm}` : ""}`
    .normalize("NFD")
    .replace(/[^\w-]+/g, "_");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.pdf"`,
    },
  });
}
