import { DollarSign, type LucideIcon, Package } from "lucide-react";
import Link from "next/link";

import { EstadoPaqueteBadge } from "@/components/pagos/estado-paquete-badge";
import { OcupacionSemanal } from "@/components/turnos/ocupacion-semanal";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha, formatMonto } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import {
  construirSlots,
  diasDeLaSemana,
  diasDelMes,
  hoyIso,
} from "@/lib/turnos";
import type {
  EstadoPaqueteAlumno,
  HorarioDisponible,
  ReservaConAlumno,
} from "@/lib/types";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-secondary-foreground">
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
    { data: estadoPaquetes },
    { data: pagosDelMes },
    { count: planesVendidos },
  ] = await Promise.all([
    supabase.from("horarios_disponibles").select("*").eq("gimnasio_id", gimnasioId),
    supabase
      .from("reservas")
      .select("*, alumno:alumnos(nombres, apellidos)")
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha", semana[0])
      .lte("fecha", semana[6]),
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

  const paquetesPendientes = ((estadoPaquetes ?? []) as EstadoPaqueteAlumno[]).sort(
    (a, b) =>
      ORDEN_PAQUETE[a.estado_paquete as "por_vencer" | "sin_paquete"] -
      ORDEN_PAQUETE[b.estado_paquete as "por_vencer" | "sin_paquete"],
  );

  const ingresosMes = (pagosDelMes ?? []).reduce(
    (acc, p) => acc + Number((p as { monto: number }).monto),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Dashboard</h2>
      </div>

      {/* 1. Indicadores de pagos */}
      <StatCard icon={DollarSign} label="Cobrado este mes" value={formatMonto(ingresosMes)} />

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

      {/* 2. Planes vendidos este mes */}
      <StatCard icon={Package} label="Planes vendidos este mes" value={planesVendidos ?? 0} />

      {/* 3. Ocupación semanal */}
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
    </div>
  );
}
