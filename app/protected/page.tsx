import { DollarSign, type LucideIcon, Package } from "lucide-react";
import Link from "next/link";

import { AlertasPendientes } from "@/components/turnos/alertas-pendientes";
import { OcupacionSemanal } from "@/components/turnos/ocupacion-semanal";
import { EstadoPaqueteBadge } from "@/components/pagos/estado-paquete-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha, formatMonto } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import {
  construirSlots,
  diasDeLaSemana,
  diasDelMes,
  formatHora,
  hoyIso,
  sumarMinutos,
} from "@/lib/turnos";
import type {
  ClasificacionAlumnoRow,
  EstadoPaqueteAlumno,
  HorarioDisponible,
  ReservaConAlumno,
} from "@/lib/types";

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div
          className={
            tone === "warning"
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-secondary-foreground"
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-2xl font-semibold text-foreground">
            {value}
          </div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

const ORDEN_PAQUETE: Record<"por_vencer" | "sin_paquete", number> = {
  por_vencer: 0,
  sin_paquete: 1,
};

export default async function DashboardPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const gimnasioId = perfilData.perfil.gimnasio_id;
  const hoy = hoyIso();
  const semana = diasDeLaSemana(hoy);
  const mesDias = diasDelMes(hoy);
  const inicioMes = mesDias[0];
  const finMes = mesDias[mesDias.length - 1];

  const supabase = await createClient();

  const [
    { data: horarios },
    { data: reservasSemana },
    { data: alertas },
    { data: estadoPaquetes },
    { data: pagosDelMes },
    { count: paquetesVendidos },
    { data: fichasPendientes },
  ] = await Promise.all([
    supabase.from("horarios_disponibles").select("*").eq("gimnasio_id", gimnasioId),
    supabase
      .from("reservas")
      .select("*, alumno:alumnos(nombres, apellidos)")
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha", semana[0])
      .lte("fecha", semana[6]),
    supabase
      .from("reservas")
      .select("*, alumno:alumnos(nombres, apellidos)")
      .eq("gimnasio_id", gimnasioId)
      .eq("atendido_por_dueno", false)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("v_estado_paquetes_alumnos")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true)
      .in("estado_paquete", ["por_vencer", "sin_paquete"]),
    supabase
      .from("pagos")
      .select("monto")
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha_pago", inicioMes)
      .lte("fecha_pago", finMes),
    supabase
      .from("paquetes")
      .select("*", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha_inicio", inicioMes)
      .lte("fecha_inicio", finMes),
    supabase
      .from("v_clasificacion_alumnos")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .eq("ficha_salud_pendiente", true)
      .order("apellidos", { ascending: true }),
  ]);

  const listaHorarios = (horarios ?? []) as HorarioDisponible[];
  const reservas = (reservasSemana ?? []) as ReservaConAlumno[];
  const slotsSemana = construirSlots(semana, listaHorarios).map((base) => {
    const reservasDelSlot = reservas.filter(
      (r) => r.fecha === base.fecha && r.hora_inicio === base.horaInicio,
    );
    return {
      ...base,
      cuposOcupados: reservasDelSlot.filter((r) => r.estado !== "cancelada").length,
      reservas: reservasDelSlot,
    };
  });
  const slotsHoy = slotsSemana
    .filter((s) => s.fecha === hoy)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const paquetesPendientes = ((estadoPaquetes ?? []) as EstadoPaqueteAlumno[]).sort(
    (a, b) =>
      ORDEN_PAQUETE[a.estado_paquete as "por_vencer" | "sin_paquete"] -
      ORDEN_PAQUETE[b.estado_paquete as "por_vencer" | "sin_paquete"],
  );

  const ingresosMes = (pagosDelMes ?? []).reduce(
    (acc, p) => acc + Number((p as { monto: number }).monto),
    0,
  );

  const fichas = (fichasPendientes ?? []) as ClasificacionAlumnoRow[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Dashboard</h2>
      </div>

      {/* 1. Hoy */}
      <Bloque titulo={`Hoy · ${formatFecha(hoy)}`}>
        {slotsHoy.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tienes turnos configurados para hoy.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {slotsHoy.map((slot) => {
              const vigentes = slot.reservas.filter((r) => r.estado !== "cancelada");
              return (
                <div
                  key={slot.horaInicio}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[7px] border border-border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {formatHora(slot.horaInicio)} –{" "}
                      {formatHora(sumarMinutos(slot.horaInicio, slot.duracionMin))}
                    </span>
                    {vigentes.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Sin alumnas inscritas</span>
                    ) : (
                      vigentes.map((r) => (
                        <span key={r.id} className="text-xs text-muted-foreground">
                          {r.alumno?.nombres} {r.alumno?.apellidos}
                        </span>
                      ))
                    )}
                  </div>
                  <Badge variant={slot.cuposOcupados >= slot.cupos ? "destructive" : "secondary"}>
                    {slot.cuposOcupados}/{slot.cupos} cupos
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
        <Link
          href={`/protected/turnos?vista=dia&fecha=${hoy}`}
          className="text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          Ver el día completo en Turnos →
        </Link>
      </Bloque>

      {/* 2. Alertas de reprogramación */}
      <AlertasPendientes alertas={(alertas ?? []) as ReservaConAlumno[]} />

      {/* 3. Estado de pagos (paquetes) */}
      <Bloque titulo="Estado de pagos">
        {paquetesPendientes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todas las alumnas activas tienen un paquete vigente.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {paquetesPendientes.slice(0, 8).map((row) => (
              <Link
                key={row.alumno_id}
                href={`/protected/pagos/${row.alumno_id}`}
                className="flex items-center justify-between rounded-[7px] px-3 py-2 text-sm hover:bg-primary/10"
              >
                <span className="font-medium text-foreground">
                  {row.nombres} {row.apellidos}
                </span>
                <div className="flex items-center gap-2">
                  {row.vencimiento_actual && (
                    <span className="text-xs text-muted-foreground">
                      vence {formatFecha(row.vencimiento_actual)}
                    </span>
                  )}
                  <EstadoPaqueteBadge estado={row.estado_paquete} />
                </div>
              </Link>
            ))}
            {paquetesPendientes.length > 8 && (
              <Link
                href="/protected/pagos"
                className="mt-1 text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver las {paquetesPendientes.length} alumnas en Pagos →
              </Link>
            )}
          </div>
        )}
      </Bloque>

      {/* 4. Ocupación semanal (reutiliza la vista Semana del Sprint 8) */}
      <Bloque titulo="Ocupación semanal">
        {listaHorarios.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todavía no configuras ningún horario disponible.
          </p>
        ) : (
          <OcupacionSemanal fecha={hoy} slots={slotsSemana} />
        )}
        <Link
          href="/protected/turnos?vista=semana"
          className="text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          Ver calendario completo →
        </Link>
      </Bloque>

      {/* 5. Ingresos del mes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={DollarSign} label="Cobrado este mes" value={formatMonto(ingresosMes)} />
        <StatCard icon={Package} label="Paquetes vendidos este mes" value={paquetesVendidos ?? 0} />
      </div>

      {/* 6. Fichas con datos de salud pendientes */}
      <Bloque titulo="Fichas con datos de salud pendientes">
        {fichas.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todas las alumnas activas tienen su ficha de salud completa.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {fichas.slice(0, 8).map((row) => (
              <Link
                key={row.alumno_id}
                href={`/protected/alumnos/${row.alumno_id}`}
                className="flex items-center justify-between rounded-[7px] px-3 py-2 text-sm hover:bg-primary/10"
              >
                <span className="font-medium text-foreground">
                  {row.nombres} {row.apellidos}
                </span>
                <Badge variant="destructive">Pendiente</Badge>
              </Link>
            ))}
            {fichas.length > 8 && (
              <Link
                href="/protected/alumnos"
                className="mt-1 text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver las {fichas.length} en Alumnos →
              </Link>
            )}
          </div>
        )}
      </Bloque>
    </div>
  );
}
