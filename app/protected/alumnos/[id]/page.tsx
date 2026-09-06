import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  asignarRutina,
  createAvance,
  updateAlumno,
} from "@/app/protected/alumnos/actions";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { ClasificacionBadge } from "@/components/alumnos/clasificacion-badge";
import { FichaSaludBadge } from "@/components/alumnos/ficha-salud-badge";
import { ToggleActivoButton } from "@/components/alumnos/toggle-activo-button";
import { ToggleAvancesButton } from "@/components/alumnos/toggle-avances-button";
import { ToggleBitacoraButton } from "@/components/alumnos/toggle-bitacora-button";
import { AvanceForm } from "@/components/avances/avance-form";
import { BitacoraHistorial } from "@/components/bitacora/bitacora-historial";
import { ProgresoRutina } from "@/components/bitacora/progreso-rutina";
import { LineChart } from "@/components/charts/line-chart";
import { EstadoPaqueteBadge } from "@/components/pagos/estado-paquete-badge";
import { AsignarRutinaForm } from "@/components/rutinas/asignar-rutina-form";
import { RutinaCard } from "@/components/rutinas/rutina-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fichaSaludPendiente } from "@/lib/ficha-salud";
import { formatFecha } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import type {
  Alumno,
  Avance,
  ClasificacionAlumnoRow,
  EstadoPaqueteAlumno,
  MedidasAvance,
  Plan,
  RegistroRutina,
  Rutina,
  RutinaPlantilla,
} from "@/lib/types";

function formatMedidas(medidas: MedidasAvance): string {
  const partes: string[] = [];
  if (medidas.cintura_cm) partes.push(`Cintura ${medidas.cintura_cm}cm`);
  if (medidas.cadera_cm) partes.push(`Cadera ${medidas.cadera_cm}cm`);
  if (medidas.pecho_cm) partes.push(`Pecho ${medidas.pecho_cm}cm`);
  if (medidas.brazo_cm) partes.push(`Brazo ${medidas.brazo_cm}cm`);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

export default async function FichaAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rutina?: string; avance?: string; vista?: string }>;
}) {
  const { id } = await params;
  const { rutina: rutinaOk, avance: avanceOk, vista: vistaParam } = await searchParams;
  const vista = vistaParam === "progreso" ? "progreso" : "datos";

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!alumno) notFound();

  const a = alumno as Alumno;
  const updateAlumnoConId = updateAlumno.bind(null, a.id);
  const asignarRutinaConId = asignarRutina.bind(null, a.id);
  const createAvanceConId = createAvance.bind(null, a.id);

  const [
    { data: clasificacionRow },
    { data: estadoPaqueteRow },
    { data: planes },
    { data: plantillas },
    { data: rutinas },
    { data: avances },
  ] = await Promise.all([
    supabase
      .from("v_clasificacion_alumnos")
      .select("clasificacion")
      .eq("alumno_id", a.id)
      .maybeSingle(),
    // Sprint 19, Parte 2: contador de clases restantes del paquete vigente.
    supabase
      .from("v_estado_paquetes_alumnos")
      .select("*")
      .eq("alumno_id", a.id)
      .maybeSingle(),
    supabase
      .from("planes")
      .select("*")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .order("dias_por_semana", { ascending: true }),
    supabase
      .from("rutina_plantillas")
      .select("*")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .order("nombre", { ascending: true }),
    supabase
      .from("rutinas")
      .select("*")
      .eq("alumno_id", a.id)
      .order("fecha_asignacion", { ascending: false }),
    supabase
      .from("avances")
      .select("*")
      .eq("alumno_id", a.id)
      .order("fecha", { ascending: false }),
  ]);
  const clasificacion = (
    clasificacionRow as Pick<ClasificacionAlumnoRow, "clasificacion"> | null
  )?.clasificacion;
  const estadoPaquete = estadoPaqueteRow as EstadoPaqueteAlumno | null;

  const listaPlantillas = (plantillas ?? []) as RutinaPlantilla[];
  const listaRutinas = (rutinas ?? []) as Rutina[];
  const rutinaActiva = listaRutinas.find((r) => r.activa);
  const historialAvances = (avances ?? []) as Avance[];

  // Sprint 18, Parte 2: historial y gráficos por ejercicio se mueven a esta ficha
  // (antes vivían apilados en la pantalla de Bitácora) — solo se consultan cuando
  // se abre la pestaña "Progreso", no en la carga normal de la ficha.
  let listaRegistros: RegistroRutina[] = [];
  if (vista === "progreso") {
    const { data: registros } = await supabase
      .from("registros_rutina")
      .select("*")
      .eq("alumno_id", a.id)
      .order("fecha", { ascending: false });
    listaRegistros = (registros ?? []) as RegistroRutina[];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/alumnos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a alumnos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Ficha de alumno
            </div>
            <h2 className="text-2xl">
              {a.nombres} {a.apellidos}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/protected/pagos/${a.id}`}
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Ver pagos
            </Link>
            {/* Sprint 19, Parte 5: antes se veían dos etiquetas "Activo" seguidas
                (esta y `ClasificacionBadge`) — representan cosas distintas (cuenta
                habilitada vs. actividad reciente real), pero se ven idénticas. Se
                deja solo "De baja" acá (estado de cuenta, accionable) y se le pasa
                el resto del significado a `ClasificacionBadge`. */}
            {!a.activo && <Badge variant="secondary">De baja</Badge>}
            {clasificacion && <ClasificacionBadge clasificacion={clasificacion} />}
            {estadoPaquete && estadoPaquete.estado_paquete !== "sin_paquete" && (
              <>
                <span className="text-xs text-muted-foreground">
                  {estadoPaquete.clases_restantes} clase
                  {estadoPaquete.clases_restantes === 1 ? "" : "s"} restante
                  {estadoPaquete.clases_restantes === 1 ? "" : "s"}
                </span>
                <EstadoPaqueteBadge estado={estadoPaquete.estado_paquete} />
              </>
            )}
            <FichaSaludBadge pendiente={fichaSaludPendiente(a)} />
            <ToggleActivoButton
              id={a.id}
              activo={a.activo}
              nombreCompleto={`${a.nombres} ${a.apellidos}`}
            />
          </div>
        </div>
      </div>

      {/* Sprint 18, Parte 2: pestañas "Datos"/"Progreso" — el historial y los
          gráficos por ejercicio (antes en la Bitácora) pasan a vivir acá, para
          consulta posterior en vez de estorbar el registro de la sesión. Mismo
          patrón de tabs por query param que usa `CalendarioTurnos`. */}
      <div className="flex items-center gap-1 self-start rounded-full border border-border p-1">
        <Button asChild size="sm" variant={vista === "datos" ? "default" : "ghost"}>
          <Link href={`/protected/alumnos/${a.id}`}>Datos</Link>
        </Button>
        <Button asChild size="sm" variant={vista === "progreso" ? "default" : "ghost"}>
          <Link href={`/protected/alumnos/${a.id}?vista=progreso`}>Progreso</Link>
        </Button>
      </div>

      {vista === "datos" && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-1 text-xs text-muted-foreground">
                <span>RUT {formatRut(a.rut, a.dig_ver)}</span>
                <span>Alumno desde {formatFecha(a.fecha_inicio)}</span>
                <Badge variant={a.user_id ? "success" : "secondary"}>
                  {a.user_id ? "Cuenta propia vinculada" : "Sin cuenta propia"}
                </Badge>
              </div>
              <AlumnoForm
                action={updateAlumnoConId}
                alumno={a}
                planes={(planes ?? []) as Plan[]}
                submitLabel="Guardar cambios"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Registro de avances propios
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.puede_registrar_avances
                    ? "Este alumno puede registrar sus propios avances desde su portal."
                    : "Solo tú puedes registrar avances para este alumno."}
                </p>
              </div>
              <ToggleAvancesButton
                id={a.id}
                puedeRegistrarAvances={a.puede_registrar_avances}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Registro de bitácora propio
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.puede_registrar_bitacora
                    ? "Este alumno puede registrar sus propias sesiones de rutina desde su portal."
                    : "Solo tú puedes registrar sesiones de rutina para este alumno."}
                </p>
              </div>
              <ToggleBitacoraButton
                id={a.id}
                puedeRegistrarBitacora={a.puede_registrar_bitacora}
              />
            </CardContent>
          </Card>

          {/* Rutina asignada */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Rutina asignada
              </h3>
              {rutinaOk === "1" && (
                <div className="mb-4 rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
                  Rutina asignada correctamente.
                </div>
              )}
              <AsignarRutinaForm action={asignarRutinaConId} plantillas={listaPlantillas} />
              {rutinaActiva && (
                <div className="mt-5">
                  <RutinaCard rutina={rutinaActiva} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Avance corporal */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Registrar avance corporal
              </h3>
              {avanceOk === "1" && (
                <div className="mb-4 rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
                  Avance registrado correctamente.
                </div>
              )}
              <AvanceForm action={createAvanceConId} />

              <div className="mt-6 border-t border-border pt-6">
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Historial de avances
                </h4>
                <div className="mb-6">
                  <LineChart
                    data={historialAvances
                      .filter((av) => av.peso_kg != null)
                      .map((av) => ({ x: av.fecha, y: av.peso_kg! }))}
                    unidad=" kg"
                  />
                </div>
                {historialAvances.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aún no hay avances registrados para este alumno.
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
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {vista === "progreso" && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de bitácora
            </h3>
            <BitacoraHistorial registros={listaRegistros} />

            <div className="mt-6 border-t border-border pt-6">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Progreso por ejercicio
              </h4>
              <ProgresoRutina registros={listaRegistros} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
