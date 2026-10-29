import { createAvancePropio, guardarRegistroEjercicioPropio } from "@/app/portal/actions";
import { AvanceForm } from "@/components/avances/avance-form";
import { BitacoraHistorialPortal } from "@/components/bitacora/bitacora-historial-portal";
import { SesionTabla, type RegistroGuardado } from "@/components/bitacora/sesion-tabla";
import { ResumenEvolucionRutina } from "@/components/bitacora/resumen-evolucion-rutina";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type { RegistroRutina, Rutina } from "@/lib/types";

/** Sprint 15, Parte F: renombrada desde `/portal/rutina` — la tarjeta superior deja
 * de mostrar el detalle completo de la rutina y el desplegable de rutinas
 * anteriores, mostrando solo el nombre de la vigente (el detalle de ejercicios
 * planificados lo sigue viendo el alumno al abrir "Registrar sesión de hoy"). */
export default async function PortalBitacoraPage() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login

  if (alumno.estado_aprobacion !== "aprobado") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Portal del alumno
          </div>
          <h2 className="text-2xl">Bitácora</h2>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tu solicitud todavía no fue aprobada por tu estudio.
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: rutinas }, { data: registros }] = await Promise.all([
    supabase
      .from("rutinas")
      .select("*")
      .eq("alumno_id", alumno.id)
      .order("fecha_asignacion", { ascending: false }),
    supabase
      .from("registros_rutina")
      .select("*")
      .eq("alumno_id", alumno.id)
      .order("fecha", { ascending: false }),
  ]);

  const listaRutinas = (rutinas ?? []) as Rutina[];
  const rutinaActiva = listaRutinas.find((r) => r.activa);
  const listaRegistros = (registros ?? []) as RegistroRutina[];
  const nombresRutina = Object.fromEntries(listaRutinas.map((r) => [r.id, r.nombre]));

  // Ejercicios ya guardados hoy en la rutina vigente (Spec 33: guardado fila por fila).
  const hoy = hoyIso();
  const guardados: Record<number, RegistroGuardado> = {};
  for (const reg of listaRegistros) {
    if (reg.fecha !== hoy || reg.rutina_id !== rutinaActiva?.id) continue;
    guardados[reg.ejercicio_index] = {
      series: String(reg.series_realizadas ?? ""),
      reps: String(reg.reps_realizadas ?? ""),
      peso: String(reg.peso_kg ?? ""),
      notas: reg.notas ?? "",
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Portal del alumno
        </div>
        <h2 className="text-2xl">Bitácora</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Rutina vigente
          </h3>
          <p className="mt-2 text-base text-foreground">
            {rutinaActiva ? rutinaActiva.nombre : "Tu entrenador aún no te asignó una rutina vigente."}
          </p>
        </CardContent>
      </Card>

      {rutinaActiva && alumno.puede_registrar_bitacora && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registrar sesión de hoy
            </h3>
            <SesionTabla
              key={`${rutinaActiva.id}-${hoy}`}
              rutina={rutinaActiva}
              guardar={guardarRegistroEjercicioPropio.bind(null, rutinaActiva.id)}
              guardados={guardados}
              fechaFutura={false}
            />
          </CardContent>
        </Card>
      )}

      {alumno.medicion_corporal_habilitada && alumno.puede_registrar_avances && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registrar un avance corporal
            </h3>
            <AvanceForm action={createAvancePropio} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de bitácora
          </h3>
          {listaRegistros.length === 0 && !alumno.puede_registrar_bitacora ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tu entrenador aún no registró sesiones de bitácora para ti.
            </p>
          ) : (
            <BitacoraHistorialPortal registros={listaRegistros} rutinas={nombresRutina} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mi progreso de rutina
          </h3>
          <ResumenEvolucionRutina registros={listaRegistros} rutinas={listaRutinas} />
        </CardContent>
      </Card>
    </div>
  );
}
