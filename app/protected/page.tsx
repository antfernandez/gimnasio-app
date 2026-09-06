import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { EstadoPaqueteBadge } from "@/components/pagos/estado-paquete-badge";
import { Card, CardContent } from "@/components/ui/card";
import { fichaSaludPendiente } from "@/lib/ficha-salud";
import { formatFecha } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { construirSlots, formatHora, hoyIso } from "@/lib/turnos";
import type { Alumno, EstadoPaqueteAlumno, HorarioDisponible, ReservaConAlumno } from "@/lib/types";

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

const ORDEN_PAQUETE: Record<"atrasado" | "por_vencer", number> = {
  atrasado: 0,
  por_vencer: 1,
};

export default async function HoyPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const gimnasioId = perfilData.perfil.gimnasio_id;
  const hoy = hoyIso();

  const supabase = await createClient();

  const [
    { data: horariosHoy },
    { data: reservasHoy },
    { data: estadoPaquetes },
    { data: alumnosParaFichaSalud },
  ] = await Promise.all([
    supabase.from("horarios_disponibles").select("*").eq("gimnasio_id", gimnasioId).eq("activo", true),
    supabase
      .from("reservas")
      .select("*, alumno:alumnos(nombres, apellidos)")
      .eq("gimnasio_id", gimnasioId)
      .eq("fecha", hoy)
      .neq("estado", "cancelada"),
    supabase
      .from("v_estado_paquetes_alumnos")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true)
      .in("estado_paquete", ["atrasado", "por_vencer"]),
    // Sprint 18, Parte 6: implementa la alerta que la ficha de salud (Sprint 9) ya
    // promete ("alergias y enfermedades quedan visibles como pendientes en el
    // panel") pero que hasta ahora no aparecía en ningún lado — misma regla que
    // `fichaSaludPendiente` usa en la ficha de alumno y el listado de Alumnos.
    supabase
      .from("alumnos")
      .select("id, nombres, apellidos, activo, alergias, enfermedades, lesiones")
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true),
  ]);

  const listaHorarios = (horariosHoy ?? []) as HorarioDisponible[];
  const reservas = (reservasHoy ?? []) as ReservaConAlumno[];
  const slotsHoy = construirSlots([hoy], listaHorarios)
    .map((base) => {
      const reservasDelSlot = reservas.filter((r) => r.hora_inicio === base.horaInicio);
      return {
        ...base,
        cuposOcupados: reservasDelSlot.length,
        reservas: reservasDelSlot,
      };
    })
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const paquetesPendientes = ((estadoPaquetes ?? []) as EstadoPaqueteAlumno[]).sort(
    (a, b) =>
      ORDEN_PAQUETE[a.estado_paquete as "atrasado" | "por_vencer"] -
      ORDEN_PAQUETE[b.estado_paquete as "atrasado" | "por_vencer"],
  );

  const fichasSaludPendientes = (
    (alumnosParaFichaSalud ?? []) as Pick<
      Alumno,
      "id" | "nombres" | "apellidos" | "activo" | "alergias" | "enfermedades" | "lesiones"
    >[]
  ).filter((a) => fichaSaludPendiente(a));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Hoy</h2>
      </div>

      {/* Sprint 18, Parte 4: lo primero que ve el coach es la agenda del día, no
          una grilla semanal de más de 80 celdas — con acceso directo a la
          bitácora de cada bloque (auditoría UX 2026-09-04, punto 3.4). */}
      <Bloque titulo={`Agenda del día · ${formatFecha(hoy)}`}>
        {slotsHoy.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tienes bloques configurados para hoy.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {slotsHoy.map((slot) => (
              <Link
                key={slot.horarioId}
                href={`/protected/bitacora?fecha=${hoy}&hora=${slot.horaInicio}`}
                className="flex items-center justify-between gap-3 rounded-[7px] border border-border px-3 py-2.5 text-sm hover:bg-primary/10"
              >
                <span className="font-medium text-foreground">
                  {formatHora(slot.horaInicio)} h
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {slot.reservas.length === 0
                    ? "Sin alumnos citados"
                    : slot.reservas
                        .map((r) => `${r.alumno?.nombres} ${r.alumno?.apellidos}`)
                        .join(", ")}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {slot.cuposOcupados}/{slot.cupos} cupos
                </span>
              </Link>
            ))}
          </div>
        )}
      </Bloque>

      {/* Sprint 18, Parte 5: lista real de atrasados + por vencer en 7 días — antes
          mezclaba "sin paquete" (alumno de prueba) con paquetes vencidos. */}
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
                      {row.estado_paquete === "atrasado" ? "venció" : "vence"}{" "}
                      {formatFecha(row.vencimiento_actual)}
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

      {/* Sprint 18, Parte 6: implementa la alerta que el texto de la ficha de
          salud ya prometía pero no aparecía en ningún lado. */}
      <Bloque titulo="Fichas de salud incompletas">
        {fichasSaludPendientes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todas las alumnas activas tienen su ficha de salud completa.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {fichasSaludPendientes.slice(0, 8).map((a) => (
              <Link
                key={a.id}
                href={`/protected/alumnos/${a.id}`}
                className="flex items-center justify-between rounded-[7px] px-3 py-2 text-sm hover:bg-primary/10"
              >
                <span className="font-medium text-foreground">
                  {a.nombres} {a.apellidos}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Alergias/enfermedades/lesiones sin completar
                </span>
              </Link>
            ))}
            {fichasSaludPendientes.length > 8 && (
              <Link
                href="/protected/alumnos"
                className="mt-1 text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Ver las {fichasSaludPendientes.length} alumnas en Alumnos →
              </Link>
            )}
          </div>
        )}
      </Bloque>

      {/* Sprint 19, Parte 3: cobros del mes, planes vendidos y ocupación semanal
          completa se movieron a /protected/estadisticas — un coach los consulta
          con mucha menos frecuencia que la agenda del día. */}
      <Link
        href="/protected/estadisticas"
        className="text-xs text-muted-foreground hover:text-primary hover:underline"
      >
        Ver estadísticas del mes →
      </Link>
    </div>
  );
}
