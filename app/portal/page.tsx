import Link from "next/link";

import { createAvancePropio } from "@/app/portal/actions";
import { AvanceForm } from "@/components/avances/avance-form";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { ContactoForm } from "@/components/portal/contacto-form";
import { RutinaCard } from "@/components/rutinas/rutina-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoPaqueteBadge } from "@/components/pagos/estado-paquete-badge";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { formatFecha } from "@/lib/format";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import {
  diaSemanaDeFecha,
  formatHora,
  hoyIso,
  NOMBRES_DIA_CORTO,
} from "@/lib/turnos";
import type {
  Avance,
  EstadoPagoAlumno,
  EstadoPaqueteAlumno,
  MedidasAvance,
  Reserva,
  Rutina,
} from "@/lib/types";

function formatMedidas(medidas: MedidasAvance): string {
  const partes: string[] = [];
  if (medidas.cintura_cm) partes.push(`Cintura ${medidas.cintura_cm}cm`);
  if (medidas.cadera_cm) partes.push(`Cadera ${medidas.cadera_cm}cm`);
  if (medidas.pecho_cm) partes.push(`Pecho ${medidas.pecho_cm}cm`);
  if (medidas.brazo_cm) partes.push(`Brazo ${medidas.brazo_cm}cm`);
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

  const supabase = await createClient();
  const [
    { data: estadoRow },
    { data: paqueteRow },
    { data: proximasReservas },
    { data: rutinas },
    { data: avances },
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
      .from("reservas")
      .select("*")
      .eq("alumno_id", alumno.id)
      .eq("estado", "reservada")
      .gte("fecha", hoyIso())
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .limit(5),
    supabase
      .from("rutinas")
      .select("*")
      .eq("alumno_id", alumno.id)
      .order("fecha_asignacion", { ascending: false }),
    supabase
      .from("avances")
      .select("*")
      .eq("alumno_id", alumno.id)
      .order("fecha", { ascending: false }),
  ]);

  const estado = estadoRow as EstadoPagoAlumno | null;
  const paquete = paqueteRow as EstadoPaqueteAlumno | null;
  const listaProximasReservas = (proximasReservas ?? []) as Reserva[];
  const listaRutinas = (rutinas ?? []) as Rutina[];
  const rutinaActiva = listaRutinas.find((r) => r.activa);
  const rutinasAnteriores = listaRutinas.filter((r) => !r.activa);
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
                Mi paquete
              </h3>
              {paquete && <EstadoPaqueteBadge estado={paquete.estado_paquete} />}
            </div>
            {!paquete || paquete.estado_paquete === "sin_paquete" ? (
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

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
              <span>RUT {formatRut(alumno.rut, alumno.dig_ver)}</span>
              <span>Alumno desde {formatFecha(alumno.fecha_inicio)}</span>
              <span>Plan {alumno.plan_contratado}</span>
            </div>
            {estado && <EstadoPagoBadge estado={estado.estado_pago} />}
          </div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mis datos de contacto
          </h3>
          <ContactoForm alumno={alumno} />
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mi rutina
        </h3>
        {rutinaActiva ? (
          <RutinaCard rutina={rutinaActiva} />
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Tu entrenador aún no te asignó una rutina vigente.
            </CardContent>
          </Card>
        )}
        {rutinasAnteriores.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-primary">
              Ver rutinas anteriores ({rutinasAnteriores.length})
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {rutinasAnteriores.map((r) => (
                <RutinaCard key={r.id} rutina={r} />
              ))}
            </div>
          </details>
        )}
      </div>

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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
