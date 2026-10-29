import { ArrowLeft, Banknote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  actualizarMembresia,
  createAvance,
  updateAlumno,
} from "@/app/protected/alumnos/actions";
import { personalizarRutinaAlumno } from "@/app/protected/rutinas/actions";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { MembresiaForm } from "@/components/alumnos/membresia-form";
import { ProgresoPdfSelector } from "@/components/alumnos/progreso-pdf-selector";
import { ToggleActivoButton } from "@/components/alumnos/toggle-activo-button";
import { AvanceForm } from "@/components/avances/avance-form";
import { MedidasDialog } from "@/components/avances/medidas-dialog";
import { ProgresoRutina } from "@/components/bitacora/progreso-rutina";
import { SesionDetalleDialog } from "@/components/bitacora/sesion-detalle-dialog";
import { LineChart } from "@/components/charts/line-chart";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { PersonalizarRutinaForm } from "@/components/rutinas/personalizar-rutina-form";
import { RutinaCard } from "@/components/rutinas/rutina-card";
import { Acordeon } from "@/components/ui/acordeon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FiltrosFecha, leerFecha } from "@/components/ui/filtros-fecha";
import { IconAction } from "@/components/ui/icon-action";
import { Paginador } from "@/components/ui/paginador";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchEjercicios, fetchZonas } from "@/lib/ejercicios";
import { formatFecha, formatMonto } from "@/lib/format";
import { leerPagina, rangoPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { estadoPlan } from "@/lib/planes";
import { agruparSesiones, detalleSesion } from "@/lib/progreso";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type {
  Alumno,
  Avance,
  EstadoCobranzaAlumno,
  Pago,
  Plan,
  RegistroRutina,
  Rutina,
  RutinaPlantilla,
} from "@/lib/types";

type Vista = "datos" | "membresia" | "progreso";

const VISTAS: { value: Vista; label: string }[] = [
  { value: "datos", label: "Datos Personales" },
  { value: "membresia", label: "Membresía" },
  { value: "progreso", label: "Progreso" },
];

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
      {children}
    </div>
  );
}

export default async function FichaAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; ok?: string; ajuste?: string; avance?: string; desde?: string; hasta?: string; pagina?: string }>;
}) {
  const { id } = await params;
  const { vista: vistaParam, ok, ajuste, avance: avanceOk, ...filtrosPagos } = await searchParams;
  const vista: Vista = VISTAS.some((v) => v.value === vistaParam)
    ? (vistaParam as Vista)
    : "datos";

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
  const hoy = hoyIso();
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const [{ data: estadoCobranzaRow }, { data: planes }, { data: rutinas }] = await Promise.all([
    // Spec 01, R1: mismo estado de pago que ve el listado de Pagos y el panel Hoy.
    supabase.from("v_estado_cobranza_alumnos").select("*").eq("alumno_id", a.id).maybeSingle(),
    supabase
      .from("planes")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .order("dias_por_semana", { ascending: true }),
    supabase
      .from("rutinas")
      .select("*")
      .eq("alumno_id", a.id)
      .order("fecha_asignacion", { ascending: false }),
  ]);
  const estadoCobranza = estadoCobranzaRow as EstadoCobranzaAlumno | null;
  const listaPlanes = (planes ?? []) as Plan[];
  const listaRutinas = (rutinas ?? []) as Rutina[];
  const rutinaActiva = listaRutinas.find((r) => r.activa);

  const updateAlumnoConId = updateAlumno.bind(null, a.id);

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
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Ficha de alumno
        </div>
        <h2 className="text-2xl">
          {a.nombres} {a.apellidos}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-1 self-start rounded-full border border-border p-1">
        {VISTAS.map((v) => (
          <Button key={v.value} asChild size="sm" variant={vista === v.value ? "default" : "ghost"}>
            <Link href={v.value === "datos" ? `/protected/alumnos/${a.id}` : `/protected/alumnos/${a.id}?vista=${v.value}`}>
              {v.label}
            </Link>
          </Button>
        ))}
      </div>

      {vista === "datos" && (
        <>
          <Card>
            <CardContent className="pt-6">
              <AlumnoForm
                action={updateAlumnoConId}
                alumno={a}
                submitLabel="Guardar cambios"
                acciones={
                  <ToggleActivoButton
                    id={a.id}
                    activo={a.activo}
                    nombreCompleto={`${a.nombres} ${a.apellidos}`}
                  />
                }
              />
            </CardContent>
          </Card>
        </>
      )}

      {vista === "membresia" && (
        <MembresiaVista
          alumno={a}
          hoy={hoy}
          gimnasioId={gimnasioId}
          estadoCobranza={estadoCobranza}
          planes={listaPlanes}
          rutinaActiva={rutinaActiva}
          ok={ok === "1"}
          ajuste={ajuste === "1"}
          desde={leerFecha(filtrosPagos.desde)}
          hasta={leerFecha(filtrosPagos.hasta)}
          pagina={leerPagina(filtrosPagos.pagina)}
        />
      )}

      {vista === "progreso" && (
        <ProgresoVista
          alumno={a}
          rutinas={listaRutinas}
          avanceOk={avanceOk === "1"}
          hoy={hoy}
        />
      )}
    </div>
  );
}

async function MembresiaVista({
  alumno: a,
  hoy,
  gimnasioId,
  estadoCobranza,
  planes,
  rutinaActiva,
  ok,
  ajuste,
  desde,
  hasta,
  pagina,
}: {
  alumno: Alumno;
  hoy: string;
  gimnasioId: string;
  estadoCobranza: EstadoCobranzaAlumno | null;
  planes: Plan[];
  rutinaActiva: Rutina | undefined;
  ok: boolean;
  ajuste: boolean;
  desde?: string;
  hasta?: string;
  pagina: number;
}) {
  const supabase = await createClient();
  let consultaPagos = supabase
    .from("pagos")
    .select("*, plan:planes(nombre)", { count: "exact" })
    .eq("alumno_id", a.id)
    .order("fecha_pago", { ascending: false })
    .range(...rangoPagina(pagina));
  if (desde) consultaPagos = consultaPagos.gte("fecha_pago", desde);
  if (hasta) consultaPagos = consultaPagos.lte("fecha_pago", hasta);

  const [{ data: catalogo }, { data: pagos, count: totalPagos }, zonas, ejercicios, { count: asignacionesNutricion }] = await Promise.all([
    supabase
      .from("rutina_plantillas")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .order("nombre", { ascending: true }),
    consultaPagos,
    fetchZonas(),
    fetchEjercicios({ soloActivos: true }),
    supabase
      .from("asignaciones_nutricionales")
      .select("id", { count: "exact", head: true })
      .eq("alumno_id", a.id)
      .eq("estado", "activo"),
  ]);
  const rutinasCatalogo = (catalogo ?? []) as RutinaPlantilla[];
  const listaPagos = (pagos ?? []) as (Pago & { plan: { nombre: string } | null })[];

  const vencimiento = estadoCobranza?.vencimiento_actual ?? null;
  const cicloEnCurso = !!vencimiento && vencimiento >= hoy;
  // Se ofrecen los planes vigentes y, siempre, el que el alumno ya tiene.
  const planesOpcion = planes
    .filter((p) => p.id === a.plan_id || estadoPlan(p, hoy) !== "de_baja")
    .map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <>
      <Seccion titulo="Membresía">
        {ok && <Aviso>Membresía actualizada correctamente.</Aviso>}
        <MembresiaForm
          action={actualizarMembresia.bind(null, a.id)}
          planes={planesOpcion}
          rutinas={rutinasCatalogo
            .filter((r) => r.activa !== false || r.id === rutinaActiva?.plantilla_id)
            .map((r) => ({ id: r.id, nombre: r.nombre }))}
          planActualId={a.plan_id}
          rutinaActualId={rutinaActiva?.plantilla_id ?? null}
          tieneRutina={!!rutinaActiva}
          cicloEnCurso={cicloEnCurso}
          fechaAsignacion={rutinaActiva?.fecha_asignacion ?? hoy}
          medicionCorporal={a.medicion_corporal_habilitada}
          planNutricional={a.plan_nutricional_habilitado}
          tieneAsignacionNutricional={!!asignacionesNutricion}
        />

        {rutinaActiva && (
          <>
            {ajuste && <div className="mt-4"><Aviso>Ajustes de la rutina guardados.</Aviso></div>}
            <Acordeon
              className="mt-5"
              titulo={
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Rutina asignada
                  </div>
                  <div className="text-base font-semibold text-foreground">{rutinaActiva.nombre}</div>
                </div>
              }
            >
              <RutinaCard rutina={rutinaActiva} />
            </Acordeon>
            <Acordeon
              className="mt-5"
              titulo={
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ajustes personalizados
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cambia ejercicios o cargas solo para este alumno.
                  </div>
                </div>
              }
            >
              <PersonalizarRutinaForm
                key={rutinaActiva.id}
                action={personalizarRutinaAlumno.bind(null, a.id, rutinaActiva.id)}
                contenido={rutinaActiva.contenido}
                zonas={zonas}
                ejercicios={ejercicios}
              />
            </Acordeon>
          </>
        )}
      </Seccion>

      <Seccion titulo="Pagos">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Estado:</span>
              {estadoCobranza ? <EstadoPagoBadge estado={estadoCobranza.estado_pago} /> : "—"}
            </span>
            <span>
              <span className="text-muted-foreground">Vencimiento: </span>
              {vencimiento ? formatFecha(vencimiento) : "—"}
            </span>
          </div>
          <IconAction
            icon={Banknote}
            label="Registrar pago"
            href={`/protected/pagos/${a.id}#registrar-pago`}
          />
        </div>
        <FiltrosFecha
          pathname={`/protected/alumnos/${a.id}`}
          desde={desde}
          hasta={hasta}
          fijos={{ vista: "membresia" }}
        />
        {listaPagos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {desde || hasta
              ? "No hay pagos en ese rango de fechas."
              : "Este alumno aún no tiene pagos registrados."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha de pago</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Forma de pago</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaPagos.map((pago) => (
                <TableRow key={pago.id}>
                  <TableCell>{formatFecha(pago.fecha_pago)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatFecha(pago.periodo_desde)} – {formatFecha(pago.periodo_hasta)}
                  </TableCell>
                  <TableCell>{METODO_LABEL[pago.metodo] ?? pago.metodo}</TableCell>
                  <TableCell>{pago.plan?.nombre ?? "—"}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    {formatMonto(pago.monto)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Paginador
          pathname={`/protected/alumnos/${a.id}`}
          query={{ vista: "membresia", desde, hasta }}
          pagina={pagina}
          total={totalPagos ?? 0}
        />
      </Seccion>
    </>
  );
}

async function ProgresoVista({
  alumno: a,
  rutinas,
  avanceOk,
  hoy,
}: {
  alumno: Alumno;
  rutinas: Rutina[];
  avanceOk: boolean;
  hoy: string;
}) {
  const supabase = await createClient();
  const [{ data: registros }, { data: avances }] = await Promise.all([
    supabase
      .from("registros_rutina")
      .select("*")
      .eq("alumno_id", a.id)
      .order("fecha", { ascending: false }),
    a.medicion_corporal_habilitada
      ? supabase.from("avances").select("*").eq("alumno_id", a.id).order("fecha", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const listaRegistros = (registros ?? []) as RegistroRutina[];
  const historialAvances = (avances ?? []) as Avance[];
  const sesiones = agruparSesiones(listaRegistros, rutinas);
  const rutinaPorId = new Map(rutinas.map((r) => [r.id, r]));

  const anioActual = Number(hoy.slice(0, 4));
  const anios = [
    ...new Set([
      anioActual,
      ...listaRegistros.map((r) => Number(r.fecha.slice(0, 4))),
      ...historialAvances.map((av) => Number(av.fecha.slice(0, 4))),
    ]),
  ].sort((x, y) => y - x);

  return (
    <>
      <Seccion titulo="Progreso">
        <div className="mb-6">
          <ProgresoPdfSelector alumnoId={a.id} anios={anios} anioInicial={anioActual} />
        </div>
        {sesiones.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay sesiones registradas en la bitácora.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Rutina</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-px text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sesiones.map((s) => (
                <TableRow key={s.clave}>
                  <TableCell className="whitespace-nowrap">{formatFecha(s.fecha)}</TableCell>
                  <TableCell className="font-medium text-foreground">{s.rutinaNombre}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground" title={s.notas || undefined}>
                    {s.notas || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <SesionDetalleDialog
                        detalle={detalleSesion(s, rutinaPorId.get(s.registros[0].rutina_id))}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Seccion>

      <Seccion titulo="Progreso por ejercicio">
        <ProgresoRutina registros={listaRegistros} />
      </Seccion>

      {a.medicion_corporal_habilitada && (
      <Seccion titulo="Avance corporal">
        {avanceOk && <Aviso>Avance registrado correctamente.</Aviso>}
        <AvanceForm action={createAvance.bind(null, a.id)} />

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
                    <TableCell>
                      <MedidasDialog
                        fecha={avance.fecha}
                        pesoKg={avance.peso_kg}
                        medidas={avance.medidas}
                      />
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {avance.notas || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Seccion>
      )}
    </>
  );
}
