import { after, NextRequest, NextResponse } from "next/server";

import { buildReporteErroresBuffer, type ErrorCarga } from "@/lib/carga-alumnos";
import { registrarEvento } from "@/lib/seguridad-eventos";
import { getPerfilExistente, requerirRol } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

/** Spec 34: Excel con las filas fallidas de una carga, para corregirlas y reintentar. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Carga inválida" }, { status: 400 });
  }

  const acceso = requerirRol(await getPerfilExistente(), ["dueño"]);
  if (acceso instanceof Response) return acceso;
  const perfilData = acceso;
  after(() =>
    registrarEvento("export_descargado", {
      gimnasioId: perfilData.perfil.gimnasio_id,
      usuarioId: perfilData.perfil.id,
      detalle: { export: "reporte-carga-alumnos" },
    }),
  );

  const supabase = await createClient();
  const { data } = await supabase
    .from("cargas_alumnos")
    .select("errores")
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Carga no encontrada" }, { status: 404 });

  const buffer = await buildReporteErroresBuffer((data.errores ?? []) as ErrorCarga[]);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="errores_carga_alumnos.xlsx"',
    },
  });
}
