import Link from "next/link";

import { createAvancePropio } from "@/app/portal/actions";
import { AvanceForm } from "@/components/avances/avance-form";
import { LineChart } from "@/components/charts/line-chart";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { ContactoForm } from "@/components/portal/contacto-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { formatFecha } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import {
  diaSemanaDeFecha,
  diasDelMes,
  formatHora,
  hoyIso,
  NOMBRES_DIA_CORTO,
} from "@/lib/turnos";
import type {
  Avance,
  EstadoPagoAlumno,
  EstadoPaqueteAlumno,
  MedidasAvance,
  Plan,
  RegistroRutina,
  Reserva,
  Rutina,
} from "@/lib/types";

function formatMedidas(medidas: MedidasAvance): string {
  const partes: string[] = [];
  if (medidas.cintura_cm) partes.push(`Cintura ${medidas.cintura_cm}cm`);
  if (medidas.cadera_cm) partes.push(`Cadera ${medidas.cadera_cm}cm`);
  if (medidas.pecho_cm) partes.push(`Pecho ${medidas.pecho_cm}cm`);
  if (medidas.brazo_cm) partes.push(`Brazo ${medidas.brazo_cm}cm`);
  if (medidas.cuello_cm) partes.push(`Cuello ${medidas.cuello_cm}cm`);
  if (medidas.muslos_cm) partes.push(`Muslos ${medidas.muslos_cm}cm`);
  if (medidas.pantorrillas_cm) partes.push(`Pantorrillas ${medidas.pantorrillas_cm}cm`);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

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

  const mesDias = diasDelMes(hoyIso());
  const inicioMes = mesDias[0];
  const finMes = mesDias[mesDias.length - 1];

  const supabase = await createClient();
  const [
    { data: estadoRow },
    { data: paqueteRow },
    { data: avances },
    { data: planRow },
    { data: rutinaRow },
    { data: registrosMes },
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
    supabase
      .from("avances")
      .select("*")
      .eq("alumno_id", alumno.id)
      .order("fecha", { ascending: false }),
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
      .gte("fecha", inicioMes)
      .lte("fecha", finMes),
  ]);

  const estado = estadoRow as EstadoPagoAlumno | null;
  const plan = planRow as Plan | null;
  const paquete = paqueteRow as EstadoPaqueteAlumno | null;
  const rutinaActiva = rutinaRow as Rutina | null;
  const sesionesBitacoraMes = new Set(
    ((registrosMes ?? []) as Pick<RegistroRutina, "fecha">[]).map((r) => r.fecha),
  ).size;

  let ultimaSesionBitacora: string | null = null;
  if (rutinaActiva) {
    const { data: ultimoRegistro } = await supabase
      .from("registros_rutina")
      .select("fecha")
      .eq("alumno_id", alumno.id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();
    ultimaSesionBitacora = (ultimoRegistro as Pick<RegistroRutina, "fecha"> | null)?.fecha ?? null;
  }

  // Sprint 13, Parte E: acotado al período del paquete vigente (evita que la lista
  // crezca sin límite si el alumno tiene muchos períodos con muchos turnos). Sin
  // paquete vigente, se mantiene el límite de 5 como fallback razonable.
  let proximasReservasQuery = supabase
    .from("reservas")
    .select("*")
    .eq("alumno_id", alumno.id)
    .eq("estado", "reservada")
    .gte("fecha", hoyIso())
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });
  const tienePaqueteVigente =
    paquete?.estado_paquete === "vigente" || paquete?.estado_paquete === "por_vencer";
  proximasReservasQuery =
    tienePaqueteVigente && paquete?.vencimiento_actual
      ? proximasReservasQuery.lte("fecha", paquete.vencimiento_actual)
      : proximasReservasQuery.limit(5);
  const { data: proximasReservas } = await proximasReservasQuery;

  const listaProximasReservas = (proximasReservas ?? []) as Reserva[];
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
                Mis próximos turnos
              </h3>
              <Link
                href="/portal/turnos"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver / reservar
              </Link>
            </div>
            {listaProximasReservas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tienes turnos reservados próximamente.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {listaProximasReservas.map((reserva) => (
                  <li
                    key={reserva.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {NOMBRES_DIA_CORTO[diaSemanaDeFecha(reserva.fecha)]}{" "}
                      {formatFecha(reserva.fecha)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatHora(reserva.hora_inicio)} h
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Mi Plan
              </h3>
              <div className="flex items-center gap-2">
                {paquete && (
                  <Badge variant={tienePaqueteVigente ? "success" : "secondary"}>
                    {tienePaqueteVigente ? "Vigente" : "No vigente"}
                  </Badge>
                )}
                {estado && (
                  <Badge variant={estado.estado_pago === "al_dia" ? "success" : "destructive"}>
                    {estado.estado_pago === "al_dia" ? "Pagado" : "No pagado"}
                  </Badge>
                )}
              </div>
            </div>
            <p className="mb-2 text-sm font-medium text-foreground">
              {plan ? plan.nombre : "Sin plan asignado"}
            </p>
            {!tienePaqueteVigente ? (
              <p className="text-sm text-muted-foreground">
                No tienes un paquete de clases vigente. Contacta a tu estudio para
                renovarlo.
              </p>
            ) : (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-foreground">
                  {paquete.clases_restantes} de {paquete.clases_incluidas} clases
                  disponibles
                </span>
                <span className="text-muted-foreground">
                  Vence el {formatFecha(paquete.vencimiento_actual!)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sprint 15, Parte G: nuevos resúmenes de rutina y progreso, sin entrar en el
          detalle que ya vive en Bitácora. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Mi rutina
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
                  {ultimaSesionBitacora
                    ? `Última sesión: ${formatFecha(ultimaSesionBitacora)}`
                    : "Todavía no registras sesiones."}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tu entrenador aún no te asignó una rutina vigente.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Mi progreso
              </h3>
              <Link
                href="/portal/bitacora"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver detalle
              </Link>
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
              <span className="text-muted-foreground">
                {sesionesBitacoraMes} {sesionesBitacoraMes === 1 ? "sesión" : "sesiones"} de
                bitácora este mes
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {alumno.puede_registrar_avances && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registrar un avance
            </h3>
            <AvanceForm action={createAvancePropio} />
          </CardContent>
        </Card>
      )}

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Medidas</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialAvances.map((avance) => (
                    <TableRow key={avance.id}>
                      <TableCell>{formatFecha(avance.fecha)}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        {avance.peso_kg ? `${avance.peso_kg} kg` : "—"}
                      </TableCell>
                      <TableCell>{formatMedidas(avance.medidas)}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {avance.notas || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
