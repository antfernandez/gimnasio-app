import { NextResponse } from "next/server";

import { buildTemplateBuffer } from "@/lib/carga-alumnos";
import { planesVigentes } from "@/lib/carga-alumnos-server";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";

/** Spec 34: template Excel de carga masiva, con los planes vigentes reales del gimnasio. Solo dueño. */
export async function GET() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (perfilData.perfil.rol !== "dueño") {
    return NextResponse.json({ error: "Solo el dueño puede cargar alumnos" }, { status: 403 });
  }

  const supabase = await createClient();
  const planes = await planesVigentes(supabase, perfilData.perfil.gimnasio_id, hoyIso());
  const buffer = await buildTemplateBuffer(planes);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template_alumnos.xlsx"',
    },
  });
}
