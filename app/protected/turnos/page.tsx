import Link from "next/link";

import {
  cancelarReservaDueno,
  crearReservaDueno,
  marcarAlertaVista,
  marcarReservaRealizada,
  reprogramarReservaDueno,
} from "@/app/protected/turnos/actions";
import { AlertasPendientes } from "@/components/turnos/alertas-pendientes";
import {
  CalendarioTurnos,
  type SlotOcupado,
  type Vista,
} from "@/components/turnos/calendario-turnos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { construirSlots, diasDeLaSemana, grillaMes, hoyIso } from "@/lib/turnos";
import type { Alumno, HorarioDisponible, ReservaConAlumno } from "@/lib/types";

function rangoDeFechas(vista: Vista, fecha: string): string[] {
  if (vista === "mes") return grillaMes(fecha);
  if (vista === "semana") return diasDeLaSemana(fecha);
  return [fecha];
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>;
}) {
  const params = await searchParams;
  const vista: Vista =
    params.vista === "mes" || params.vista === "dia" ? params.vista : "semana";
  const fecha = params.fecha && /^\d{4}-\d{2}-\d{2}$/.test(params.fecha) ? params.fecha : hoyIso();

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const rango = rangoDeFechas(vista, fecha);
  const supabase = await createClient();

  const [{ data: horarios }, { data: reservasRango }, { data: alumnos }, { data: alertas }] =
    await Promise.all([
      supabase
        .from("horarios_disponibles")
        .select("*")
        .eq("gimnasio_id", perfilData.perfil.gimnasio_id),
      supabase
        .from("reservas")
        .select("*, alumno:alumnos(nombres, apellidos)")
        .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
        .gte("fecha", rango[0])
        .lte("fecha", rango[rango.length - 1]),
      supabase
        .from("alumnos")
        .select("id, nombres, apellidos")
        .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
        .eq("activo", true)
        .order("apellidos", { ascending: true }),
      supabase
        .from("reservas")
        .select("*, alumno:alumnos(nombres, apellidos)")
        .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
        .eq("atendido_por_dueno", false)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

  const listaHorarios = (horarios ?? []) as HorarioDisponible[];
  const reservas = (reservasRango ?? []) as ReservaConAlumno[];

  const slots: SlotOcupado[] = construirSlots(rango, listaHorarios).map((base) => {
    const reservasDelSlot = reservas.filter(
      (r) => r.fecha === base.fecha && r.hora_inicio === base.horaInicio,
    );
    return {
      ...base,
      cuposOcupados: reservasDelSlot.filter((r) => r.estado !== "cancelada").length,
      reservas: reservasDelSlot,
    };
  });

  if (listaHorarios.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Encabezado />
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Todavía no configuras ningún horario disponible, así que no hay nada que
              reservar. Empieza por definir tus días y horas de atención.
            </p>
            <Button asChild>
              <Link href="/protected/turnos/horario">Configurar horario</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Encabezado />

      <AlertasPendientes alertas={(alertas ?? []) as ReservaConAlumno[]} />

      <Card>
        <CardContent className="pt-6">
          <CalendarioTurnos
            rol="dueño"
            vista={vista}
            fecha={fecha}
            slots={slots}
            alumnos={(alumnos ?? []) as Pick<Alumno, "id" | "nombres" | "apellidos">[]}
            crearReserva={crearReservaDueno}
            cancelarReserva={cancelarReservaDueno}
            reprogramarReserva={reprogramarReservaDueno}
            marcarVisto={marcarAlertaVista}
            marcarRealizada={marcarReservaRealizada}
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
          Panel del dueño
        </div>
        <h2 className="text-2xl">Turnos</h2>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/protected/turnos/horario">Configurar horario</Link>
      </Button>
    </div>
  );
}
