import Link from "next/link";

import {
  cancelarReservaAlumno,
  crearReservaAlumno,
  reprogramarReservaAlumno,
} from "@/app/portal/turnos/actions";
import {
  CalendarioTurnos,
  type SlotOcupado,
  type Vista,
} from "@/components/turnos/calendario-turnos";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";
import { construirSlots, diasDeLaSemana, grillaMes, hoyIso } from "@/lib/turnos";
import type { DisponibilidadTurno, HorarioDisponible, Reserva } from "@/lib/types";

function rangoDeFechas(vista: Vista, fecha: string): string[] {
  if (vista === "mes") return grillaMes(fecha);
  if (vista === "semana") return diasDeLaSemana(fecha);
  return [fecha];
}

export default async function PortalTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>;
}) {
  const params = await searchParams;
  const vista: Vista =
    params.vista === "mes" || params.vista === "dia" ? params.vista : "semana";
  const fecha = params.fecha && /^\d{4}-\d{2}-\d{2}$/.test(params.fecha) ? params.fecha : hoyIso();

  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login

  const rango = rangoDeFechas(vista, fecha);
  const supabase = await createClient();

  const [{ data: horarios }, { data: disponibilidad }, { data: misReservas }] =
    await Promise.all([
      supabase.from("horarios_disponibles").select("*").eq("gimnasio_id", alumno.gimnasio_id),
      supabase.rpc("turnos_disponibilidad", {
        p_gimnasio_id: alumno.gimnasio_id,
        p_desde: rango[0],
        p_hasta: rango[rango.length - 1],
      }),
      supabase
        .from("reservas")
        .select("*")
        .eq("alumno_id", alumno.id)
        .gte("fecha", rango[0])
        .lte("fecha", rango[rango.length - 1]),
    ]);

  const listaHorarios = (horarios ?? []) as HorarioDisponible[];
  const dispPorSlot = new Map<string, DisponibilidadTurno>();
  for (const d of (disponibilidad ?? []) as DisponibilidadTurno[]) {
    dispPorSlot.set(`${d.fecha}|${d.hora_inicio}`, d);
  }
  const misReservasList = (misReservas ?? []) as Reserva[];

  const slots: SlotOcupado[] = construirSlots(rango, listaHorarios).map((base) => {
    const d = dispPorSlot.get(`${base.fecha}|${base.horaInicio}`);
    const propias = misReservasList
      .filter((r) => r.fecha === base.fecha && r.hora_inicio === base.horaInicio)
      .map((r) => ({ ...r, alumno: null }));
    return {
      ...base,
      cuposOcupados: d
        ? Number(d.cupos_ocupados)
        : propias.filter((r) => r.estado !== "cancelada").length,
      reservas: propias,
    };
  });

  if (listaHorarios.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Encabezado />
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Tu gimnasio todavía no configuró horarios de reserva. Contáctalo
            directamente mientras tanto.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Encabezado />
      <Card>
        <CardContent className="pt-6">
          <CalendarioTurnos
            rol="alumno"
            vista={vista}
            fecha={fecha}
            slots={slots}
            alumnoActualId={alumno.id}
            crearReserva={crearReservaAlumno}
            cancelarReserva={cancelarReservaAlumno}
            reprogramarReserva={reprogramarReservaAlumno}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Encabezado() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Portal del alumno
        </div>
        <h2 className="text-2xl">Mis turnos</h2>
      </div>
      <Link href="/portal" className="text-xs text-muted-foreground hover:text-primary hover:underline">
        ← Volver a mi perfil
      </Link>
    </div>
  );
}
