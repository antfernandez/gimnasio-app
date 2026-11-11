import { guardarRegistroEjercicio, marcarAsistencia } from "@/app/protected/bitacora/actions";
import { RegistroSesionPanel } from "@/components/bitacora/registro-sesion-panel";
import type { RegistroGuardado } from "@/components/bitacora/sesion-tabla";
import { ExportMenu } from "@/components/export/export-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { formatHora, hoyIso } from "@/lib/turnos";
import type { ReservaConAlumno, Rutina } from "@/lib/types";

// Contenido dinámico por usuario (sesión y datos del gimnasio); mismo criterio que el layout.
export const instant = false;

/** Spec 74: bitácora del dueño = filtro de fecha + alumnos agendados ese día + formulario
 * de registro de sesión. Sin bloques de horarios. Mobile first. */
export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const params = await searchParams;
  const fecha =
    params.fecha && /^\d{4}-\d{2}-\d{2}$/.test(params.fecha) ? params.fecha : hoyIso();

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const supabase = await createClient();

  const { data: reservasDelDia } = await supabase
    .from("reservas")
    .select("*, alumno:alumnos(nombres, apellidos)")
    .eq("gimnasio_id", gimnasioId)
    .eq("fecha", fecha)
    .neq("estado", "cancelada")
    .order("hora_inicio", { ascending: true });

  const reservas = (reservasDelDia ?? []) as ReservaConAlumno[];
  const alumnoIds = [...new Set(reservas.map((r) => r.alumno_id))];

  // Rutinas vigentes y lo ya registrado ese día, de una sola vez para todos los alumnos.
  const rutinaPorAlumno = new Map<string, Rutina>();
  const guardadosPorAlumno = new Map<string, Record<number, RegistroGuardado>>();
  if (alumnoIds.length > 0) {
    const [{ data: rutinas }, { data: registros }] = await Promise.all([
      supabase.from("rutinas").select("*").in("alumno_id", alumnoIds).eq("activa", true),
      supabase
        .from("registros_rutina")
        .select("alumno_id, rutina_id, ejercicio_index, series_realizadas, reps_realizadas, peso_kg, notas")
        .in("alumno_id", alumnoIds)
        .eq("fecha", fecha)
        .order("created_at", { ascending: true }),
    ]);
    for (const r of (rutinas ?? []) as Rutina[]) rutinaPorAlumno.set(r.alumno_id, r);
    for (const reg of registros ?? []) {
      if (rutinaPorAlumno.get(reg.alumno_id)?.id !== reg.rutina_id) continue;
      const g = guardadosPorAlumno.get(reg.alumno_id) ?? {};
      g[reg.ejercicio_index] = {
        series: String(reg.series_realizadas ?? ""),
        reps: String(reg.reps_realizadas ?? ""),
        peso: String(reg.peso_kg ?? ""),
        notas: reg.notas ?? "",
      };
      guardadosPorAlumno.set(reg.alumno_id, g);
    }
  }

  const fechaFutura = fecha > hoyIso();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Bitácora</h2>
        </div>
        <ExportMenu resource="bitacora" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-0 flex-1 gap-2 sm:max-w-[220px]">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" name="fecha" type="date" defaultValue={fecha} required className="h-11" />
            </div>
            <Button type="submit" size="lg">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {reservas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay alumnos agendados en esta fecha.
          </CardContent>
        </Card>
      )}

      {reservas.length > 0 && (
        <RegistroSesionPanel
          items={reservas.map((r) => ({
            reservaId: r.id,
            alumnoId: r.alumno_id,
            nombre: `${r.alumno?.nombres ?? ""} ${r.alumno?.apellidos ?? ""}`.trim(),
            hora: formatHora(r.hora_inicio),
            estado: r.estado,
            asistencia: r.asistencia,
            rutina: rutinaPorAlumno.get(r.alumno_id) ?? null,
            guardados: guardadosPorAlumno.get(r.alumno_id) ?? {},
            guardar: guardarRegistroEjercicio.bind(
              null,
              r.alumno_id,
              rutinaPorAlumno.get(r.alumno_id)?.id ?? "",
              fecha,
            ),
          }))}
          fecha={fecha}
          fechaFutura={fechaFutura}
          marcarAsistencia={marcarAsistencia}
        />
      )}
    </div>
  );
}
