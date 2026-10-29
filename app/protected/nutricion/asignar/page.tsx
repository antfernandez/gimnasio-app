import { Card, CardContent } from "@/components/ui/card";
import { AsignarForm } from "@/components/nutricion/asignar-form";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function AsignarAlumnoPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const supabase = await createClient();
  const [{ data: alumnos }, { data: planes }, { data: responsables }] = await Promise.all([
    supabase
      .from("alumnos")
      .select("id, nombres, apellidos")
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true)
      .eq("estado_aprobacion", "aprobado")
      .eq("plan_nutricional_habilitado", true)
      .order("nombres"),
    // Un plan archivado no se puede asignar.
    supabase
      .from("planes_nutricionales")
      .select("id, nombre")
      .eq("gimnasio_id", gimnasioId)
      .neq("estado", "archivado")
      .order("nombre"),
    supabase.from("perfiles").select("id, nombre_completo").eq("gimnasio_id", gimnasioId),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="mb-4 text-base">Asignar alumno</h3>
        <AsignarForm
          alumnos={(alumnos ?? []).map((a) => ({
            id: a.id as string,
            nombre: `${a.nombres} ${a.apellidos}`.trim(),
          }))}
          planes={(planes ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }))}
          responsables={(responsables ?? []).map((r) => ({
            id: r.id as string,
            nombre: r.nombre_completo as string,
          }))}
          responsableActual={perfilData.perfil.id}
          hoy={new Date().toISOString().slice(0, 10)}
        />
      </CardContent>
    </Card>
  );
}
