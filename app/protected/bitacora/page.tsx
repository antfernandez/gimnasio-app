import Link from "next/link";

import { guardarRegistroEjercicio, marcarAsistencia } from "@/app/protected/bitacora/actions";
import { AsistenciaAlumno } from "@/components/bitacora/lista-alumnos-bloque";
import { SesionTabla, type RegistroGuardado } from "@/components/bitacora/sesion-tabla";
import { ExportMenu } from "@/components/export/export-menu";
import { Acordeon } from "@/components/ui/acordeon";
import { RutinaCard } from "@/components/rutinas/rutina-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { formatHora, hoyIso } from "@/lib/turnos";
import type {
  EstadoPaqueteAlumno,
  ReservaConAlumno,
  Rutina,
} from "@/lib/types";

/** Spec 27: bitácora del dueño por horario. Por defecto muestra el día actual; cada
 * horario es un acordeón con los alumnos citados (reservas) y cada alumno, a su vez,
 * un acordeón con la asistencia y el registro de sesión (Spec 13). Mobile first. */
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

  const [{ data: reservasDelDia }, { data: estadoPaquetes }] = await Promise.all([
    supabase
      .from("reservas")
      .select("*, alumno:alumnos(nombres, apellidos)")
      .eq("gimnasio_id", gimnasioId)
      .eq("fecha", fecha)
      .neq("estado", "cancelada")
      .order("hora_inicio", { ascending: true }),
    supabase
      .from("v_estado_paquetes_alumnos")
      .select("alumno_id, clases_restantes")
      .eq("gimnasio_id", gimnasioId),
  ]);

  const clasesRestantesPorAlumno = new Map(
    (
      (estadoPaquetes ?? []) as Pick<EstadoPaqueteAlumno, "alumno_id" | "clases_restantes">[]
    ).map((e) => [e.alumno_id, e.clases_restantes]),
  );

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

  const horarios = [...new Set(reservas.map((r) => r.hora_inicio))].sort();
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

      {horarios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay alumnos citados en esta fecha.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {horarios.map((hora) => {
            const delBloque = reservas.filter((r) => r.hora_inicio === hora);
            return (
              <Card key={hora}>
                <CardContent className="p-4">
                  <Acordeon
                    defaultOpen={horarios.length === 1}
                    titulo={
                      <div className="flex min-h-11 items-center gap-3">
                        <span className="text-lg font-semibold">{formatHora(hora)} h</span>
                        <span className="text-sm text-muted-foreground">
                          {delBloque.length} {delBloque.length === 1 ? "alumno" : "alumnos"}
                        </span>
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-3">
                      {delBloque.map((r) => {
                        const rutina = rutinaPorAlumno.get(r.alumno_id) ?? null;
                        const guardados = guardadosPorAlumno.get(r.alumno_id) ?? {};
                        const registrado = Object.keys(guardados).length > 0;
                        const restantes = clasesRestantesPorAlumno.get(r.alumno_id);
                        return (
                          <div
                            key={r.id}
                            className="rounded-[9px] border border-border px-3.5 py-1"
                          >
                            <Acordeon
                              titulo={
                                <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="font-medium">
                                    {r.alumno?.nombres} {r.alumno?.apellidos}
                                  </span>
                                  {registrado && (
                                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                                      Sesión registrada
                                    </span>
                                  )}
                                  {restantes != null && (
                                    <span className="text-xs text-muted-foreground">
                                      {restantes} clase{restantes === 1 ? "" : "s"} restante
                                      {restantes === 1 ? "" : "s"}
                                    </span>
                                  )}
                                </div>
                              }
                            >
                              <div className="flex flex-col gap-4 pb-3">
                                <AsistenciaAlumno
                                  reservaId={r.id}
                                  estado={r.estado}
                                  asistencia={r.asistencia}
                                  marcarAsistencia={marcarAsistencia}
                                />

                                {!rutina ? (
                                  <div className="flex flex-col items-start gap-2">
                                    <p className="text-sm text-muted-foreground">
                                      Sin rutina vigente asignada.
                                    </p>
                                    <Link
                                      href={`/protected/alumnos/${r.alumno_id}`}
                                      className="flex min-h-11 items-center text-sm text-primary hover:underline"
                                    >
                                      Ir a su ficha para asignarle una →
                                    </Link>
                                  </div>
                                ) : (
                                  <>
                                    <Acordeon
                                      titulo={
                                        <p className="flex min-h-11 items-center text-base font-semibold">
                                          {rutina.nombre}
                                        </p>
                                      }
                                    >
                                      <RutinaCard rutina={rutina} />
                                    </Acordeon>

                                    <div className="border-t border-border pt-4">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                          Registrar sesión de bitácora
                                        </h4>
                                        <Link
                                          href={`/protected/alumnos/${r.alumno_id}?vista=progreso`}
                                          className="flex min-h-11 shrink-0 items-center text-xs text-muted-foreground hover:text-primary hover:underline"
                                        >
                                          Historial →
                                        </Link>
                                      </div>
                                      <SesionTabla
                                        key={`${r.alumno_id}-${fecha}`}
                                        rutina={rutina}
                                        guardar={guardarRegistroEjercicio.bind(
                                          null,
                                          r.alumno_id,
                                          rutina.id,
                                          fecha,
                                        )}
                                        guardados={guardados}
                                        fechaFutura={fechaFutura}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </Acordeon>
                          </div>
                        );
                      })}
                    </div>
                  </Acordeon>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
