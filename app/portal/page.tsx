import Link from "next/link";

import { BarChart } from "@/components/charts/bar-chart";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { AvanceRutinaChart, type PuntoMensual } from "@/components/portal/avance-rutina-chart";
import { ContactoDialog } from "@/components/portal/contacto-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { etiquetaMes, formatFecha } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { NOMBRES_DIA, diaSemanaDeFecha, formatHora, hoyIso, sumarDias } from "@/lib/turnos";
import type {
  Avance,
  EstadoPagoAlumno,
  EstadoPaqueteAlumno,
  Plan,
  RegistroRutina,
} from "@/lib/types";

// Contenido dinámico por usuario (sesión y datos del gimnasio); mismo criterio que el layout.
export const instant = false;

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

  const hoy = hoyIso();
  // Spec 58: ventana de 12 meses (mes actual incluido) para los dos gráficos.
  const [anioHoy, mesHoy] = hoy.split("-").map(Number);
  const meses: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(anioHoy, mesHoy - 1 - i, 1));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const desdeVentana = `${meses[0]}-01`;

  const supabase = await createClient();
  const [
    { data: estadoRow },
    { data: paqueteRow },
    { data: avances },
    { data: planRow },
    { data: registrosRows },
    { data: proximasRows },
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
          .gte("fecha", desdeVentana)
          .order("fecha", { ascending: true })
      : Promise.resolve({ data: [] }),
    alumno.plan_id
      ? supabase.from("planes").select("*").eq("id", alumno.plan_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("registros_rutina")
      .select("fecha, reps_realizadas, peso_kg")
      .eq("alumno_id", alumno.id)
      .gte("fecha", desdeVentana),
    supabase
      .from("reservas")
      .select("fecha, hora_inicio")
      .eq("alumno_id", alumno.id)
      .eq("estado", "reservada")
      .gte("fecha", hoy)
      .lte("fecha", sumarDias(hoy, 60))
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .limit(10),
  ]);

  const estado = estadoRow as EstadoPagoAlumno | null;
  const plan = planRow as Plan | null;
  const paquete = paqueteRow as EstadoPaqueteAlumno | null;

  const contactoAlDia = Boolean(alumno.email?.trim() && alumno.telefono?.trim());

  const tienePaqueteVigente =
    paquete?.estado_paquete === "vigente" || paquete?.estado_paquete === "por_vencer";

  // Próximo entrenamiento: la primera reserva que todavía no empezó.
  const ahora = new Date();
  const horaAhora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  const proximo =
    ((proximasRows ?? []) as { fecha: string; hora_inicio: string }[]).find(
      (r) => r.fecha > hoy || formatHora(r.hora_inicio) >= horaAhora,
    ) ?? null;

  // Avance corporal: último peso medido de cada mes.
  const pesoPorMes = new Map<string, number>();
  for (const av of (avances ?? []) as Avance[]) {
    if (av.peso_kg != null) pesoPorMes.set(av.fecha.slice(0, 7), Number(av.peso_kg));
  }
  const puntosCuerpo: PuntoMensual[] = meses
    .filter((m) => pesoPorMes.has(m))
    .map((m) => ({ x: m, y: pesoPorMes.get(m)! }));

  // Avance en rutina: promedio mensual de repeticiones y de peso registrados.
  const repsPorMes = new Map<string, number[]>();
  const pesoRutinaPorMes = new Map<string, number[]>();
  for (const r of (registrosRows ?? []) as Pick<RegistroRutina, "fecha" | "reps_realizadas" | "peso_kg">[]) {
    const m = r.fecha.slice(0, 7);
    if (r.reps_realizadas != null) repsPorMes.set(m, [...(repsPorMes.get(m) ?? []), r.reps_realizadas]);
    if (r.peso_kg != null && Number(r.peso_kg) > 0) {
      pesoRutinaPorMes.set(m, [...(pesoRutinaPorMes.get(m) ?? []), Number(r.peso_kg)]);
    }
  }
  const promedios = (mapa: Map<string, number[]>): PuntoMensual[] =>
    meses
      .filter((m) => mapa.has(m))
      .map((m) => {
        const v = mapa.get(m)!;
        return { x: m, y: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 };
      });

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

      {/* Spec 58: cuatro indicadores arriba. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                Ver suscripción
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
                Estado de suscripción
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
                Próximo entrenamiento
              </h3>
              <Link
                href="/portal/turnos"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver turnos
              </Link>
            </div>
            {proximo ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-base font-semibold text-foreground">
                  {NOMBRES_DIA[diaSemanaDeFecha(proximo.fecha)]} {formatFecha(proximo.fecha)}
                </span>
                <span className="text-muted-foreground">{formatHora(proximo.hora_inicio)} h</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tienes turnos agendados.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Datos de contacto
              </h3>
              <ContactoDialog email={alumno.email} telefono={alumno.telefono} />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <Badge variant={contactoAlDia ? "success" : "secondary"}>
                  {contactoAlDia ? "Al día" : "Por completar"}
                </Badge>
              </div>
              <span className="text-muted-foreground">
                {contactoAlDia
                  ? "Teléfono y correo registrados."
                  : "Falta registrar tu teléfono o correo."}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spec 58: dos secciones con un gráfico cada una (últimos 12 meses). */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Avance corporal por meses
              </h3>
              {alumno.medicion_corporal_habilitada && (
                <Link
                  href="/portal/progreso?tab=medicion"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Ver medición
                </Link>
              )}
            </div>
            {alumno.medicion_corporal_habilitada ? (
              <BarChart data={puntosCuerpo} unidad=" kg" medida="peso" formatoX={etiquetaMes} />
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-[9px] border border-dashed border-border text-center text-sm text-muted-foreground">
                La medición corporal no está habilitada en tu plan.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Avance en rutina
              </h3>
              <Link
                href="/portal/progreso"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver progreso
              </Link>
            </div>
            <AvanceRutinaChart reps={promedios(repsPorMes)} peso={promedios(pesoRutinaPorMes)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
