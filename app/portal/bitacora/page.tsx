import { guardarRegistroEjercicioPropio } from "@/app/portal/actions";
import { SesionTabla, type RegistroGuardado } from "@/components/bitacora/sesion-tabla";
import { RutinaCard } from "@/components/rutinas/rutina-card";
import { Acordeon } from "@/components/ui/acordeon";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type { RegistroRutina, Rutina } from "@/lib/types";

// Contenido dinámico por usuario (sesión y datos del gimnasio); mismo criterio que el layout.
export const instant = false;

/** Spec 59: la bitácora solo permite ingresar el registro de hoy; la rutina vigente se
 * amplía en un acordeón y el historial y el progreso viven en `/portal/progreso`. */
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
          {rutinaActiva ? (
            // Spec 59: el acordeón amplía el detalle de la rutina vigente.
            <Acordeon
              className="mt-2"
              titulo={<p className="flex min-h-11 items-center text-base text-foreground">{rutinaActiva.nombre}</p>}
            >
              <RutinaCard rutina={rutinaActiva} />
            </Acordeon>
          ) : (
            <p className="mt-2 text-base text-foreground">
              Tu entrenador aún no te asignó una rutina vigente.
            </p>
          )}
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
    </div>
  );
}
