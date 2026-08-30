"use client";

import Link from "next/link";
import { Fragment, useActionState, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  diaSemanaDeFecha,
  esMismoMes,
  formatHora,
  grillaMes,
  NOMBRES_DIA,
  NOMBRES_DIA_CORTO,
  NOMBRES_MES,
  sumarDias,
  sumarMinutos,
  yaPaso,
} from "@/lib/turnos";
import type { ReservaConAlumno } from "@/lib/types";
import type { SlotBase } from "@/lib/turnos";

export type Vista = "mes" | "semana" | "dia";
export type ReservaFormState = { error?: string };

export interface SlotOcupado extends SlotBase {
  cuposOcupados: number;
  reservas: ReservaConAlumno[];
}

type AlumnoOpcion = { id: string; nombres: string; apellidos: string };

type Props = {
  rol: "dueño" | "alumno";
  vista: Vista;
  fecha: string;
  slots: SlotOcupado[];
  alumnoActualId?: string;
  alumnos?: AlumnoOpcion[];
  crearReserva: (
    state: ReservaFormState,
    formData: FormData,
  ) => Promise<ReservaFormState>;
  cancelarReserva: (id: string) => Promise<void>;
  reprogramarReserva: (
    state: ReservaFormState,
    formData: FormData,
  ) => Promise<ReservaFormState>;
  marcarVisto?: (id: string) => Promise<void>;
  marcarRealizada?: (id: string) => Promise<void>;
};

function hrefVista(vista: Vista, fecha: string) {
  return `?vista=${vista}&fecha=${fecha}`;
}

function ocupacionColor(pct: number): string {
  if (pct === 0) return "bg-secondary/40";
  if (pct < 0.4) return "bg-success/25";
  if (pct < 0.8) return "bg-highlight/30";
  return "bg-destructive/30";
}

function claveSlot(fecha: string, horaInicio: string): string {
  return `${fecha}|${horaInicio}`;
}

export function CalendarioTurnos(props: Props) {
  const { vista, fecha, slots } = props;
  // Se guarda solo la CLAVE del slot elegido (no el objeto), y se recalcula desde
  // `slots` en cada render — así, cuando una acción (reservar/cancelar/reprogramar)
  // dispara `revalidatePath` y el servidor manda `slots` frescos, el panel de
  // detalle muestra el estado actualizado en vez de quedar pegado con el snapshot
  // de cuando se hizo clic.
  const [claveSeleccionada, setClaveSeleccionada] = useState<string | null>(null);
  const slotSeleccionado =
    claveSeleccionada != null
      ? (slots.find((s) => claveSlot(s.fecha, s.horaInicio) === claveSeleccionada) ?? null)
      : null;

  return (
    <div className="flex flex-col gap-5">
      <NavegacionCalendario vista={vista} fecha={fecha} />

      {vista === "mes" && <VistaMes fecha={fecha} slots={slots} />}
      {vista === "semana" && (
        <VistaSemana
          fecha={fecha}
          slots={slots}
          rol={props.rol}
          alumnoActualId={props.alumnoActualId}
          claveSeleccionada={claveSeleccionada}
          onSeleccionar={(s) => setClaveSeleccionada(claveSlot(s.fecha, s.horaInicio))}
        />
      )}
      {vista === "dia" && (
        <VistaDia
          fecha={fecha}
          slots={slots}
          rol={props.rol}
          alumnoActualId={props.alumnoActualId}
          claveSeleccionada={claveSeleccionada}
          onSeleccionar={(s) => setClaveSeleccionada(claveSlot(s.fecha, s.horaInicio))}
        />
      )}

      {(vista === "semana" || vista === "dia") && slotSeleccionado && (
        <PanelDetalle
          slot={slotSeleccionado}
          rol={props.rol}
          alumnoActualId={props.alumnoActualId}
          alumnos={props.alumnos}
          crearReserva={props.crearReserva}
          cancelarReserva={props.cancelarReserva}
          reprogramarReserva={props.reprogramarReserva}
          marcarVisto={props.marcarVisto}
          marcarRealizada={props.marcarRealizada}
          onCerrar={() => setClaveSeleccionada(null)}
        />
      )}
    </div>
  );
}

function NavegacionCalendario({ vista, fecha }: { vista: Vista; fecha: string }) {
  const [y, m] = fecha.split("-").map(Number);
  const anterior =
    vista === "mes"
      ? `${y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}-01`
      : sumarDias(fecha, vista === "semana" ? -7 : -1);
  const siguiente =
    vista === "mes"
      ? `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`
      : sumarDias(fecha, vista === "semana" ? 7 : 1);
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const tituloMes = `${NOMBRES_MES[m - 1]} ${y}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={hrefVista(vista, anterior)}>← Anterior</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={hrefVista(vista, hoyIso)}>Hoy</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={hrefVista(vista, siguiente)}>Siguiente →</Link>
        </Button>
        <span className="ml-2 text-sm font-medium text-foreground">
          {vista === "mes" ? tituloMes : formatFechaLarga(fecha)}
        </span>
      </div>
      <div className="flex items-center gap-1 rounded-full border border-border p-1">
        {(["mes", "semana", "dia"] as Vista[]).map((v) => (
          <Button
            key={v}
            asChild
            size="sm"
            variant={v === vista ? "default" : "ghost"}
            className="capitalize"
          >
            <Link href={hrefVista(v, fecha)}>{v === "dia" ? "Día" : v}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

function formatFechaLarga(fechaIso: string): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const dia = diaSemanaDeFecha(fechaIso);
  return `${NOMBRES_DIA[dia]} ${d} de ${NOMBRES_MES[m - 1]} ${y}`;
}

function VistaMes({ fecha, slots }: { fecha: string; slots: SlotOcupado[] }) {
  const dias = grillaMes(fecha);
  const porFecha = new Map<string, SlotOcupado[]>();
  for (const s of slots) {
    const lista = porFecha.get(s.fecha) ?? [];
    lista.push(s);
    porFecha.set(s.fecha, lista);
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-7 gap-1.5 text-xs">
        {([0, 1, 2, 3, 4, 5, 6] as const).map((d) => (
          <div
            key={d}
            className="px-2 pb-1 text-center font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {NOMBRES_DIA_CORTO[d]}
          </div>
        ))}
        {dias.map((dia) => {
          const slotsDelDia = porFecha.get(dia) ?? [];
          const cupos = slotsDelDia.reduce((acc, s) => acc + s.cupos, 0);
          const ocupados = slotsDelDia.reduce((acc, s) => acc + s.cuposOcupados, 0);
          const pct = cupos > 0 ? ocupados / cupos : 0;
          const [, , dNum] = dia.split("-");

          return (
            <Link
              key={dia}
              href={hrefVista("dia", dia)}
              className={`flex flex-col gap-1 rounded-[9px] border border-border p-2 transition-colors hover:border-primary ${
                esMismoMes(dia, fecha) ? "" : "opacity-40"
              } ${ocupacionColor(pct)}`}
            >
              <span className="font-medium text-foreground">{Number(dNum)}</span>
              {slotsDelDia.length > 0 && (
                <span className="text-[0.65rem] text-muted-foreground">
                  {ocupados}/{cupos} cupos
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        El color de cada día muestra qué tan lleno está: más intenso = más ocupado.
        Haz clic en un día para ver el detalle.
      </p>
    </div>
  );
}

/** Exportada para reutilizarse tal cual (sin duplicar la grilla) en el bloque
 * "Ocupación semanal" del dashboard (Sprint 10) — ver
 * `components/turnos/ocupacion-semanal.tsx`. */
export function VistaSemana({
  fecha,
  slots,
  rol,
  alumnoActualId,
  claveSeleccionada,
  onSeleccionar,
}: {
  fecha: string;
  slots: SlotOcupado[];
  rol: "dueño" | "alumno";
  alumnoActualId?: string;
  claveSeleccionada: string | null;
  onSeleccionar: (s: SlotOcupado) => void;
}) {
  const dia0 = diaSemanaDeFecha(fecha);
  const inicioSemana = sumarDias(fecha, -dia0);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana, i));

  const horas = Array.from(new Set(slots.map((s) => s.horaInicio))).sort();

  if (horas.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay horarios configurados para esta semana.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[720px] gap-1 text-xs"
        style={{ gridTemplateColumns: `5rem repeat(7, 1fr)` }}
      >
        <div />
        {dias.map((d) => (
          <div key={d} className="px-1 pb-1 text-center font-semibold text-foreground">
            {NOMBRES_DIA_CORTO[diaSemanaDeFecha(d)]}{" "}
            <span className="text-muted-foreground">{d.slice(8, 10)}</span>
          </div>
        ))}
        {horas.map((hora) => (
          <Fragment key={hora}>
            <div className="flex items-center justify-end pr-2 text-muted-foreground">
              {formatHora(hora)}
            </div>
            {dias.map((d) => {
              const slot = slots.find((s) => s.fecha === d && s.horaInicio === hora);
              if (!slot) return <div key={`${d}-${hora}`} />;
              const esPropio =
                rol === "alumno" &&
                slot.reservas.some(
                  (r) => r.alumno_id === alumnoActualId && r.estado !== "cancelada",
                );
              const seleccionado = claveSeleccionada === claveSlot(slot.fecha, slot.horaInicio);
              return (
                <button
                  key={`${d}-${hora}`}
                  type="button"
                  onClick={() => onSeleccionar(slot)}
                  className={`rounded-[7px] border p-1.5 text-center outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring ${
                    seleccionado ? "border-primary" : "border-border hover:border-primary"
                  } ${ocupacionColor(slot.cupos > 0 ? slot.cuposOcupados / slot.cupos : 0)}`}
                >
                  <div className="font-medium text-foreground">
                    {slot.cuposOcupados}/{slot.cupos}
                  </div>
                  {esPropio && (
                    <Badge variant="default" className="mt-0.5 px-1.5 py-0 text-[0.55rem]">
                      Tu turno
                    </Badge>
                  )}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function VistaDia({
  fecha,
  slots,
  rol,
  alumnoActualId,
  claveSeleccionada,
  onSeleccionar,
}: {
  fecha: string;
  slots: SlotOcupado[];
  rol: "dueño" | "alumno";
  alumnoActualId?: string;
  claveSeleccionada: string | null;
  onSeleccionar: (s: SlotOcupado) => void;
}) {
  const delDia = slots
    .filter((s) => s.fecha === fecha)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  if (delDia.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay turnos configurados para este día.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {delDia.map((slot) => {
        const seleccionado = claveSeleccionada === claveSlot(slot.fecha, slot.horaInicio);
        const esPropio =
          rol === "alumno" &&
          slot.reservas.some(
            (r) => r.alumno_id === alumnoActualId && r.estado !== "cancelada",
          );
        return (
          <button
            key={slot.horaInicio}
            type="button"
            onClick={() => onSeleccionar(slot)}
            className={`flex items-center justify-between rounded-[9px] border p-3 text-left outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring ${
              seleccionado ? "border-primary" : "border-border hover:border-primary"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground">
                {formatHora(slot.horaInicio)} – {formatHora(sumarMinutos(slot.horaInicio, slot.duracionMin))}
              </span>
              {rol === "dueño" &&
                slot.reservas
                  .filter((r) => r.estado !== "cancelada")
                  .map((r) => (
                    <span key={r.id} className="text-xs text-muted-foreground">
                      {r.alumno?.nombres} {r.alumno?.apellidos}
                    </span>
                  ))}
              {esPropio && <Badge>Tu turno</Badge>}
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ocupacionColor(
                slot.cupos > 0 ? slot.cuposOcupados / slot.cupos : 0,
              )}`}
            >
              {slot.cuposOcupados}/{slot.cupos} cupos
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PanelDetalle({
  slot,
  rol,
  alumnoActualId,
  alumnos,
  crearReserva,
  cancelarReserva,
  reprogramarReserva,
  marcarVisto,
  marcarRealizada,
  onCerrar,
}: {
  slot: SlotOcupado;
  rol: "dueño" | "alumno";
  alumnoActualId?: string;
  alumnos?: AlumnoOpcion[];
  crearReserva: Props["crearReserva"];
  cancelarReserva: Props["cancelarReserva"];
  reprogramarReserva: Props["reprogramarReserva"];
  marcarVisto?: Props["marcarVisto"];
  marcarRealizada?: Props["marcarRealizada"];
  onCerrar: () => void;
}) {
  const [reservaEnReprogramacion, setReservaEnReprogramacion] = useState<string | null>(
    null,
  );
  const vigentes = slot.reservas.filter((r) => r.estado !== "cancelada");
  const hayCupo = slot.cuposOcupados < slot.cupos;
  const miReserva =
    rol === "alumno"
      ? vigentes.find((r) => r.alumno_id === alumnoActualId)
      : undefined;

  return (
    <div className="rounded-[9px] border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {formatFechaLarga(slot.fecha)} · {formatHora(slot.horaInicio)}
        </h4>
        <Button type="button" variant="ghost" size="sm" onClick={onCerrar}>
          Cerrar
        </Button>
      </div>

      {rol === "dueño" && (
        <div className="mb-4 flex flex-col gap-2">
          {vigentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin reservas todavía.</p>
          ) : (
            vigentes.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-[7px] border border-border bg-card px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {r.alumno?.nombres} {r.alumno?.apellidos}
                  </span>
                  {r.estado === "realizada" && (
                    <Badge variant="secondary">Realizada</Badge>
                  )}
                  {!r.atendido_por_dueno && (
                    <Badge variant="destructive">Cambio del alumno</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.estado === "reservada" ? (
                    reservaEnReprogramacion === r.id ? (
                      <ReprogramarForm
                        reservaId={r.id}
                        reprogramarReserva={reprogramarReserva}
                        onListo={() => setReservaEnReprogramacion(null)}
                      />
                    ) : (
                      <>
                        {marcarRealizada && yaPaso(slot.fecha, slot.horaInicio) && (
                          <MarcarRealizadaButton
                            id={r.id}
                            marcarRealizada={marcarRealizada}
                          />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReservaEnReprogramacion(r.id)}
                        >
                          Reprogramar
                        </Button>
                        <CancelarButton id={r.id} cancelarReserva={cancelarReserva} />
                      </>
                    )
                  ) : null}
                  {!r.atendido_por_dueno && marcarVisto && (
                    <MarcarVistoButton id={r.id} marcarVisto={marcarVisto} />
                  )}
                </div>
              </div>
            ))
          )}

          {hayCupo && (
            <ReservarDuenoForm
              slot={slot}
              alumnos={alumnos ?? []}
              crearReserva={crearReserva}
            />
          )}
        </div>
      )}

      {rol === "alumno" && (
        <div className="flex flex-col gap-3">
          {miReserva ? (
            <div className="flex items-center justify-between rounded-[7px] border border-border bg-card px-3 py-2">
              <span className="text-sm text-foreground">
                {miReserva.estado === "realizada"
                  ? "Esta sesión ya quedó registrada como realizada."
                  : "Tienes una reserva en este turno."}
              </span>
              {miReserva.estado === "reservada" && (
                <div className="flex items-center gap-2">
                  {reservaEnReprogramacion === miReserva.id ? (
                    <ReprogramarForm
                      reservaId={miReserva.id}
                      reprogramarReserva={reprogramarReserva}
                      onListo={() => setReservaEnReprogramacion(null)}
                    />
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReservaEnReprogramacion(miReserva.id)}
                      >
                        Reprogramar
                      </Button>
                      <CancelarButton id={miReserva.id} cancelarReserva={cancelarReserva} />
                    </>
                  )}
                </div>
              )}
            </div>
          ) : hayCupo ? (
            <ReservarAlumnoForm slot={slot} crearReserva={crearReserva} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No quedan cupos disponibles para este turno.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Cancelar o reprogramar con 24 h o más de anticipación no tiene costo. Con
            menos de 24 h, o si no asistes, la sesión se descuenta igual.
          </p>
        </div>
      )}
    </div>
  );
}

function CancelarButton({
  id,
  cancelarReserva,
}: {
  id: string;
  cancelarReserva: Props["cancelarReserva"];
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => cancelarReserva(id))}
    >
      {isPending ? "…" : "Cancelar"}
    </Button>
  );
}

function MarcarRealizadaButton({
  id,
  marcarRealizada,
}: {
  id: string;
  marcarRealizada: NonNullable<Props["marcarRealizada"]>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => marcarRealizada(id))}
    >
      {isPending ? "…" : "Marcar realizada"}
    </Button>
  );
}

function MarcarVistoButton({
  id,
  marcarVisto,
}: {
  id: string;
  marcarVisto: NonNullable<Props["marcarVisto"]>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => marcarVisto(id))}
    >
      {isPending ? "…" : "Marcar visto"}
    </Button>
  );
}

function ReprogramarForm({
  reservaId,
  reprogramarReserva,
  onListo,
}: {
  reservaId: string;
  reprogramarReserva: Props["reprogramarReserva"];
  onListo: () => void;
}) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmar = () => {
    if (!fecha || !hora) {
      setError("Completa la nueva fecha y hora.");
      return;
    }
    const formData = new FormData();
    formData.set("reserva_id", reservaId);
    formData.set("fecha", fecha);
    formData.set("hora_inicio", hora);
    startTransition(async () => {
      const result = await reprogramarReserva({}, formData);
      if (result?.error) setError(result.error);
      else onListo();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="h-9 w-[9.5rem]"
      />
      <Input
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        className="h-9 w-[6.5rem]"
      />
      <Button type="button" size="sm" disabled={isPending} onClick={confirmar}>
        {isPending ? "…" : "Confirmar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onListo}>
        Cancelar
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

function ReservarDuenoForm({
  slot,
  alumnos,
  crearReserva,
}: {
  slot: SlotOcupado;
  alumnos: AlumnoOpcion[];
  crearReserva: Props["crearReserva"];
}) {
  const [state, formAction, isPending] = useActionState(crearReserva, {});
  const disponibles = alumnos.filter(
    (a) => !slot.reservas.some((r) => r.alumno_id === a.id && r.estado !== "cancelada"),
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="fecha" value={slot.fecha} />
      <input type="hidden" name="hora_inicio" value={slot.horaInicio} />
      <input type="hidden" name="duracion_min" value={slot.duracionMin} />
      <div className="grid gap-1">
        <Label htmlFor={`alumno-${slot.fecha}-${slot.horaInicio}`} className="text-xs">
          Reservar para
        </Label>
        <Select
          id={`alumno-${slot.fecha}-${slot.horaInicio}`}
          name="alumno_id"
          required
          className="h-9"
        >
          <option value="">Selecciona un alumno…</option>
          {disponibles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombres} {a.apellidos}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={isPending || disponibles.length === 0}>
        {isPending ? "Reservando…" : "Reservar"}
      </Button>
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}

function ReservarAlumnoForm({
  slot,
  crearReserva,
}: {
  slot: SlotOcupado;
  crearReserva: Props["crearReserva"];
}) {
  const [state, formAction, isPending] = useActionState(crearReserva, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="fecha" value={slot.fecha} />
      <input type="hidden" name="hora_inicio" value={slot.horaInicio} />
      <input type="hidden" name="duracion_min" value={slot.duracionMin} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Reservando…" : "Reservar este turno"}
      </Button>
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
