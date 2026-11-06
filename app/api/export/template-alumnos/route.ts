import { after, NextResponse } from "next/server";

import { buildTemplateBuffer } from "@/lib/carga-alumnos";
import { planesVigentes } from "@/lib/carga-alumnos-server";
import { registrarEvento } from "@/lib/seguridad-eventos";
import { getPerfilExistente, requerirRol } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";

/** Spec 34: template Excel de carga masiva, con los planes vigentes reales del gimnasio. Solo dueño. */
export async function GET() {
  const acceso = requerirRol(await getPerfilExistente(), ["dueño"]);
  if (acceso instanceof Response) return acceso;
  const perfilData = acceso;
  after(() =>
    registrarEvento("export_descargado", {
      gimnasioId: perfilData.perfil.gimnasio_id,
      usuarioId: perfilData.perfil.id,
      detalle: { export: "template-alumnos" },
    }),
  );

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
