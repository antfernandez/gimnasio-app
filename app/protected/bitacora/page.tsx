import Link from "next/link";

import { createRegistroRutina, marcarAsistencia } from "@/app/protected/bitacora/actions";
import { BitacoraForm } from "@/components/bitacora/bitacora-form";
import { ListaAlumnosBloque } from "@/components/bitacora/lista-alumnos-bloque";
import { SelectorFechaHora } from "@/components/bitacora/selector-fecha-hora";
import { ExportMenu } from "@/components/export/export-menu";
import { RutinaCard } from "@/components/rutinas/rutina-card";
import { Card, CardContent } from "@/components/ui/card";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { diaSemanaDeFecha, hoyIso } from "@/lib/turnos";
import type {
  EstadoPaqueteAlumno,
  HorarioDisponible,
  ReservaConAlumno,
  Rutina,
} from "@/lib/types";

/** Sprint 15, Parte B: bitácora del dueño organizada por bloque horario del día —
 * se ancla a `reservas` (Sprint 8) en vez de a una lista libre de alumnos, mismo
 * criterio que ya usa `OcupacionSemanal` en el Dashboard. */
export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; hora?: string; alumno?: string; bitacora?: string }>;
}) {
  const params = await searchParams;
  const fecha =
    params.fecha && /^\d{4}-\d{2}-\d{2}$/.test(params.fecha) ? params.fecha : hoyIso();
  const hora = params.hora;
  const alumnoId = params.alumno;

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const supabase = await createClient();

  const [{ data: horarios }, { data: reservasDelDia }, { data: estadoPaquetes }] =
    await Promise.all([
      supabase
        .from("horarios_disponibles")
        .select("*")
        .eq("gimnasio_id", gimnasioId)
        .eq("activo", true),
      supabase
        .from("reservas")
        .select("*, alumno:alumnos(nombres, apellidos)")
        .eq("gimnasio_id", gimnasioId)
        .eq("fecha", fecha)
        .neq("estado", "cancelada"),
      // Sprint 19, Parte 2: contador de clases restantes junto a cada alumno citado.
      supabase
        .from("v_estado_paquetes_alumnos")
        .select("alumno_id, clases_restantes")
        .eq("gimnasio_id", gimnasioId),
    ]);

  const clasesRestantesPorAlumno = new Map(
    (
      (estadoPaquetes ?? []) as Pick<EstadoPaqueteAlumno, "alumno_id" | "clases_restantes">[]
    ).map((e) => [e.alumno_id, e.clases_restantes]),
  );

  const diaSemana = diaSemanaDeFecha(fecha);
  const bloquesDelDia = ((horarios ?? []) as HorarioDisponible[])
    .filter((h) => h.dia_semana === diaSemana)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const reservas = (reservasDelDia ?? []) as ReservaConAlumno[];
  const bloques = bloquesDelDia.map((h) => ({
    horaInicio: h.hora_inicio,
    cantidadAlumnos: reservas.filter((r) => r.hora_inicio === h.hora_inicio).length,
  }));

  const alumnosDelBloque = hora
    ? reservas
        .filter((r) => r.hora_inicio === hora)
        .map((r) => ({
          id: r.alumno_id,
          reservaId: r.id,
          nombres: r.alumno?.nombres ?? "",
          apellidos: r.alumno?.apellidos ?? "",
          estado: r.estado,
          asistencia: r.asistencia,
          clasesRestantes: clasesRestantesPorAlumno.get(r.alumno_id) ?? null,
        }))
    : [];

  const alumnoSeleccionado =
    alumnoId && hora ? (alumnosDelBloque.find((a) => a.id === alumnoId) ?? null) : null;

  let rutinaActiva: Rutina | null = null;

  if (alumnoSeleccionado) {
    const { data: rutina } = await supabase
      .from("rutinas")
      .select("*")
      .eq("alumno_id", alumnoSeleccionado.id)
      .eq("activa", true)
      .maybeSingle();
    rutinaActiva = (rutina as Rutina | null) ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Bitácora</h2>
        </div>
        <ExportMenu resource="bitacora" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <SelectorFechaHora fecha={fecha} hora={hora} bloques={bloques} />
        </CardContent>
      </Card>

      {hora && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Alumnos citados
            </h3>
            <ListaAlumnosBloque
              fecha={fecha}
              hora={hora}
              alumnos={alumnosDelBloque}
              alumnoSeleccionadoId={alumnoId}
              marcarAsistencia={marcarAsistencia}
            />
          </CardContent>
        </Card>
      )}

      {alumnoSeleccionado && !rutinaActiva && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              {alumnoSeleccionado.nombres} {alumnoSeleccionado.apellidos} no tiene una
              rutina vigente asignada.
            </p>
            <Link
              href={`/protected/alumnos/${alumnoSeleccionado.id}`}
              className="text-sm text-primary hover:underline"
            >
              Ir a su ficha para asignarle una →
            </Link>
          </CardContent>
        </Card>
      )}

      {alumnoSeleccionado && rutinaActiva && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {alumnoSeleccionado.nombres} {alumnoSeleccionado.apellidos}
            </h3>
            {params.bitacora === "1" && (
              <div className="mb-4 rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
                Sesión registrada en la bitácora.
              </div>
            )}
            <RutinaCard rutina={rutinaActiva} />

            <div className="mt-6 border-t border-border pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Registrar sesión de bitácora
                </h4>
                <Link
                  href={`/protected/alumnos/${alumnoSeleccionado.id}?vista=progreso`}
                  className="shrink-0 text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Ver historial y progreso →
                </Link>
              </div>
              <BitacoraForm
                action={createRegistroRutina.bind(
                  null,
                  alumnoSeleccionado.id,
                  rutinaActiva.id,
                  fecha,
                  hora!,
                )}
                rutina={rutinaActiva}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
