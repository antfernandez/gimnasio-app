import { DollarSign, type LucideIcon, Package, Users } from "lucide-react";
import Link from "next/link";

import { OcupacionSemanal } from "@/components/turnos/ocupacion-semanal";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonto } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { construirSlots, diasDeLaSemana, diasDelMes, hoyIso } from "@/lib/turnos";
import type { HorarioDisponible, ReservaConAlumno } from "@/lib/types";

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

/** Sprint 19, Parte 3: separado del Dashboard ("Hoy") — auditoría UX 2026-09-04,
 * sección 6, propone que las métricas de escritorio (cobros del mes, ocupación
 * semanal completa) dejen de ser la portada y pasen a ser una vista de análisis
 * bajo demanda, ya que un coach las consulta con mucha menos frecuencia que la
 * agenda del día. Mismas consultas que antes vivían en `app/protected/page.tsx`. */
export default async function EstadisticasPage() {
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
    { data: pagosDelMes },
    { count: planesVendidos },
    { count: alumnosActivos },
    { count: alumnosInactivos },
  ] = await Promise.all([
    supabase.from("horarios_disponibles").select("*").eq("gimnasio_id", gimnasioId),
    supabase
      .from("reservas")
      .select("*, alumno:alumnos(nombres, apellidos)")
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha", semana[0])
      .lte("fecha", semana[6]),
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
      .from("alumnos")
      .select("*", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true),
    supabase
      .from("alumnos")
      .select("*", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", false),
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
        <h2 className="text-2xl">Estadísticas</h2>
      </div>

      <StatCard
        icon={Users}
        label="Alumnos"
        value={`${alumnosActivos ?? 0} activos · ${alumnosInactivos ?? 0} inactivos`}
      />

      <StatCard icon={DollarSign} label="Cobrado este mes" value={formatMonto(ingresosMes)} />

      <StatCard icon={Package} label="Planes vendidos este mes" value={planesVendidos ?? 0} />

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
