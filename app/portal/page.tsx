import Link from "next/link";

import { LineChart } from "@/components/charts/line-chart";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { ContactoForm } from "@/components/portal/contacto-form";
import { TablaAvances } from "@/components/portal/tabla-avances";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { formatFecha } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import { hoyIso, inicioDeSemana, sumarDias } from "@/lib/turnos";
import type {
  Avance,
  EstadoPagoAlumno,
  EstadoPaqueteAlumno,
  Plan,
  RegistroRutina,
  Rutina,
} from "@/lib/types";

export default async function PortalPage() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login

  if (alumno.estado_aprobacion !== "aprobado") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Portal del alumno
          </div>
          <h2 className="text-2xl">
            Hola, {alumno.nombres} {alumno.apellidos}
          </h2>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            {alumno.estado_aprobacion === "pendiente" ? (
              <>
                <p className="text-base font-semibold text-foreground">
                  Tu solicitud está pendiente de aprobación
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tu estudio todavía no aprueba tu registro. Cuando lo haga vas a
                  poder reservar turnos y ver tu paquete acá.
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-foreground">
                  Tu solicitud fue rechazada
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Contacta directamente a tu estudio para más información.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const inicioSemana = inicioDeSemana(hoyIso());

  const supabase = await createClient();
  const [
    { data: estadoRow },
    { data: paqueteRow },
    { data: avances },
    { data: planRow },
    { data: rutinaRow },
    { data: registrosSemana },
  ] = await Promise.all([
    supabase
      .from("v_estado_pago_alumnos")
      .select("*")
      .eq("alumno_id", alumno.id)
      .maybeSingle(),
    supabase
      .from("v_estado_paquetes_alumnos")
      .select("*")
      .eq("alumno_id", alumno.id)
      .maybeSingle(),
    alumno.medicion_corporal_habilitada
      ? supabase
          .from("avances")
          .select("*")
          .eq("alumno_id", alumno.id)
          .order("fecha", { ascending: false })
      : Promise.resolve({ data: [] }),
    alumno.plan_id
      ? supabase.from("planes").select("*").eq("id", alumno.plan_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("rutinas")
      .select("*")
      .eq("alumno_id", alumno.id)
      .eq("activa", true)
      .maybeSingle(),
    supabase
      .from("registros_rutina")
      .select("fecha")
      .eq("alumno_id", alumno.id)
      .gte("fecha", inicioSemana)
      .lte("fecha", sumarDias(inicioSemana, 6)),
  ]);

  const estado = estadoRow as EstadoPagoAlumno | null;
  const plan = planRow as Plan | null;
  const paquete = paqueteRow as EstadoPaqueteAlumno | null;
  const rutinaActiva = rutinaRow as Rutina | null;

  const tienePaqueteVigente =
    paquete?.estado_paquete === "vigente" || paquete?.estado_paquete === "por_vencer";
  const lunes = inicioDeSemana(hoyIso());
  const sesionesSemana = new Set(
    ((registrosSemana ?? []) as Pick<RegistroRutina, "fecha">[])
      .map((r) => r.fecha)
      .filter((f) => f >= lunes && f <= sumarDias(lunes, 6)),
  ).size;

  const historialAvances = (avances ?? []) as Avance[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Portal del alumno
        </div>
        <h2 className="text-2xl">
          Hola, {alumno.nombres} {alumno.apellidos}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Estado de pago
              </h3>
              <Link
                href="/portal/pagar-plan"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver plan
              </Link>
            </div>
            {estado ? (
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <EstadoPagoBadge estado={estado.estado_pago} />
                </div>
                {estado.vencimiento_actual && (
                  <span className="text-muted-foreground">
                    Vence el {formatFecha(estado.vencimiento_actual)}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Mi suscripción
              </h3>
              {paquete && (
                <Badge variant={tienePaqueteVigente ? "success" : "secondary"}>
                  {tienePaqueteVigente ? "Vigente" : "No vigente"}
                </Badge>
              )}
            </div>
            <p className="mb-2 text-sm font-medium text-foreground">
              {plan ? plan.nombre : "Sin plan asignado"}
            </p>
            <div className="flex flex-col gap-1 text-sm">
              {plan && (
                <span className="text-foreground">
                  {plan.dias_por_semana} {plan.dias_por_semana === 1 ? "clase" : "clases"} por semana
                </span>
              )}
              {tienePaqueteVigente && paquete.vencimiento_actual ? (
                <span className="text-muted-foreground">
                  Vigente hasta el {formatFecha(paquete.vencimiento_actual)}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  No tienes un paquete vigente. Contacta a tu estudio para renovarlo.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Avance en rutinas
              </h3>
              <Link
                href="/portal/bitacora"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver Bitácora
              </Link>
            </div>
            {rutinaActiva ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">{rutinaActiva.nombre}</span>
                <span className="text-muted-foreground">
                  {sesionesSemana}
                  {plan ? ` de ${plan.dias_por_semana}` : ""}{" "}
                  {sesionesSemana === 1 ? "sesión registrada" : "sesiones registradas"} esta semana
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tu entrenador aún no te asignó una rutina vigente.
              </p>
            )}
          </CardContent>
        </Card>

        {alumno.medicion_corporal_habilitada && (
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Progreso corporal
                </h3>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                {historialAvances.length === 0 ? (
                  <span className="text-muted-foreground">Sin avances corporales registrados.</span>
                ) : (
                  <span className="text-foreground">
                    Último avance: {formatFecha(historialAvances[0].fecha)}
                    {historialAvances[0].peso_kg != null && ` · ${historialAvances[0].peso_kg} kg`}
                    {historialAvances[0].peso_kg != null &&
                      historialAvances[1]?.peso_kg != null &&
                      ` (${
                        historialAvances[0].peso_kg - historialAvances[1].peso_kg >= 0 ? "+" : ""
                      }${(historialAvances[0].peso_kg - historialAvances[1].peso_kg).toFixed(1)} kg)`}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
              <span>RUT {formatRut(alumno.rut, alumno.dig_ver)}</span>
              <span>Alumno desde {formatFecha(alumno.fecha_inicio)}</span>
              <span>Plan {plan ? plan.nombre : "Sin plan asignado"}</span>
            </div>
            {estado && <EstadoPagoBadge estado={estado.estado_pago} />}
          </div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mis datos de contacto
          </h3>
          <ContactoForm alumno={alumno} />
        </CardContent>
      </Card>

      {alumno.medicion_corporal_habilitada && (
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mis avances
          </h3>
          {historialAvances.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {alumno.puede_registrar_avances
                ? "Aún no tienes avances registrados."
                : "Tu entrenador aún no registró avances para ti."}
            </p>
          ) : (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-primary">
                Ver detalle completo ({historialAvances.length})
              </summary>
              <div className="mt-4 mb-6">
                <LineChart
                  data={historialAvances
                    .filter((av) => av.peso_kg != null)
                    .map((av) => ({ x: av.fecha, y: av.peso_kg! }))}
                  unidad=" kg"
                />
              </div>
              <TablaAvances avances={historialAvances} />
            </details>
          )}
        </CardContent>
      </Card>
      )}
      </div>
    </div>
  );
}
