import {
  Banknote,
  DollarSign,
  type LucideIcon,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { WhatsAppCobranzaButton } from "@/components/pagos/whatsapp-cobranza-button";
import { Card, CardContent } from "@/components/ui/card";
import { IconAction } from "@/components/ui/icon-action";
import { formatFecha, formatMonto } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import {
  construirSlots,
  diasDeLaSemana,
  diasDelMes,
  formatHora,
  hoyIso,
  NOMBRES_MES,
} from "@/lib/turnos";
import type {
  EstadoCobranzaAlumno,
  HorarioDisponible,
  ReservaConAlumno,
} from "@/lib/types";

function Bloque({
  titulo,
  fecha,
  children,
}: {
  titulo: string;
  /** Texto de fecha que acompaña al título, con su mismo estilo. */
  fecha?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
          {fecha && <span> · {fecha}</span>}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  iconClass,
}: {
  icon: LucideIcon;
  /** Clases de color del círculo del icono. */
  iconClass: string;
  label: string;
  value: number | string;
  detail?: string;
  /** 0-100; si viene, dibuja una barra de avance bajo el valor. */
  progress?: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-semibold text-foreground">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
          {progress !== undefined && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
          {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Barra({ etiqueta, valor, max, texto }: { etiqueta: string; valor: number; max: number; texto: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-muted-foreground">{etiqueta}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${max > 0 ? (valor / max) * 100 : 0}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right text-xs text-foreground">{texto}</span>
    </div>
  );
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

/** "YYYY-MM" de hace `n` meses respecto de `hoy` (YYYY-MM-DD). */
function mesAnterior(hoy: string, n: number): { clave: string; mes: number } {
  const [y, m] = hoy.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  const mes = d.getUTCMonth();
  return { clave: `${d.getUTCFullYear()}-${String(mes + 1).padStart(2, "0")}`, mes };
}

// Spec 01, R3: el panel responde en 10 segundos tres preguntas — ¿cuánta plata entró
// y cuánta falta?, ¿qué tengo que hacer hoy?, ¿cómo vienen las tendencias? — en ese
// orden: indicadores arriba, pendientes de hoy en el medio, tendencias abajo. La
// grilla semanal completa vive solo en `/protected/turnos`. `/protected` sigue siendo
// la URL única (destino de login y target de `revalidatePath("/protected")`).
export default async function DashboardPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const gimnasioId = perfilData.perfil.gimnasio_id;
  const hoy = hoyIso();
  const semana = diasDeLaSemana(hoy);
  const mesDias = diasDelMes(hoy);
  const inicioMes = mesDias[0];
  const finMes = mesDias[mesDias.length - 1];
  const meses = [5, 4, 3, 2, 1, 0].map((n) => mesAnterior(hoy, n));
  const inicio6Meses = `${meses[0].clave}-01`;

  const supabase = await createClient();

  const [
    { data: horarios },
    { data: reservasHoy },
    { data: cobranza },
    { data: reservasSemana },
    { data: pagos6Meses },
    { count: altasMes },
    { count: alumnosEnBaja },
    { count: cambiosPlanPendientes },
  ] = await Promise.all([
    supabase.from("horarios_disponibles").select("*").eq("gimnasio_id", gimnasioId),
    supabase
      .from("reservas")
      .select("*, alumno:alumnos(nombres, apellidos)")
      .eq("gimnasio_id", gimnasioId)
      .eq("fecha", hoy)
      .neq("estado", "cancelada"),
    // Spec 01, R1: misma fuente que el listado de Pagos y la ficha de alumno.
    supabase
      .from("v_estado_cobranza_alumnos")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true),
    supabase
      .from("reservas")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha", semana[0])
      .lte("fecha", semana[6])
      .neq("estado", "cancelada"),
    supabase
      .from("pagos")
      .select("monto, fecha_pago")
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha_pago", inicio6Meses)
      .lte("fecha_pago", finMes),
    supabase
      .from("alumnos")
      .select("*", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha_inicio", inicioMes)
      .lte("fecha_inicio", finMes),
    supabase
      .from("alumnos")
      .select("*", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", false),
    // Spec 44: solicitudes de cambio de plan por resolver.
    supabase
      .from("solicitudes_cambio_plan")
      .select("*", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .eq("estado", "pendiente"),
  ]);

  const listaHorarios = (horarios ?? []) as HorarioDisponible[];
  const reservas = (reservasHoy ?? []) as ReservaConAlumno[];
  const slotsHoy = construirSlots([hoy], listaHorarios)
    .map((base) => {
      const reservasDelSlot = reservas.filter((r) => r.hora_inicio === base.horaInicio);
      return { ...base, cuposOcupados: reservasDelSlot.length, reservas: reservasDelSlot };
    })
    .filter((slot) => slot.reservas.length > 0)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const alumnosCitadosHoy = new Set(reservas.map((r) => r.alumno_id)).size;

  // Cobranza (R1 + R3 fila 1 y 2)
  const alumnos = (cobranza ?? []) as EstadoCobranzaAlumno[];
  const atrasados = alumnos
    .filter((a) => a.estado_pago === "atrasado")
    .sort((a, b) => b.dias_atraso - a.dias_atraso);
  const porVencer = alumnos
    .filter((a) => a.estado_pago === "por_vencer")
    .sort((a, b) => (a.vencimiento_actual ?? "").localeCompare(b.vencimiento_actual ?? ""));
  const cobranzaPendiente = [...atrasados, ...porVencer];
  const esperadoMes = alumnos.reduce((acc, a) => acc + Number(a.plan_precio ?? 0), 0);
  const porCobrarMonto = atrasados.reduce((acc, a) => acc + Number(a.plan_precio ?? 0), 0);

  const pagos = (pagos6Meses ?? []) as { monto: number; fecha_pago: string }[];
  const ingresosPorMes = meses.map(({ clave, mes }) => ({
    etiqueta: NOMBRES_MES[mes].slice(0, 3),
    total: pagos
      .filter((p) => p.fecha_pago.startsWith(clave))
      .reduce((acc, p) => acc + Number(p.monto), 0),
  }));
  const cobradoMes = ingresosPorMes[ingresosPorMes.length - 1].total;
  const maxIngreso = Math.max(...ingresosPorMes.map((m) => m.total));

  // Ocupación (semanal agregada y por bloque horario)
  const reservasEnSemana = (reservasSemana ?? []) as ReservaConAlumno[];
  const slotsSemana = construirSlots(semana, listaHorarios).map((base) => ({
    ...base,
    cuposOcupados: reservasEnSemana.filter(
      (r) => r.fecha === base.fecha && r.hora_inicio === base.horaInicio,
    ).length,
  }));
  const porBloque = new Map<string, { usados: number; cupos: number }>();
  for (const s of slotsSemana) {
    const b = porBloque.get(s.horaInicio) ?? { usados: 0, cupos: 0 };
    b.usados += s.cuposOcupados;
    b.cupos += s.cupos;
    porBloque.set(s.horaInicio, b);
  }
  const bloques = [...porBloque.entries()]
    .map(([hora, b]) => ({ hora, ...b, pct: pct(b.usados, b.cupos) }))
    .sort((a, b) => b.pct - a.pct || a.hora.localeCompare(b.hora));
  const masLlenos = bloques.slice(0, 3);
  const masVacios = bloques
    .filter((b) => !masLlenos.includes(b))
    .slice(-3)
    .reverse();

  const porPlan = new Map<string, number>();
  for (const a of alumnos) {
    const nombre = a.plan_nombre ?? "Sin plan";
    porPlan.set(nombre, (porPlan.get(nombre) ?? 0) + 1);
  }
  const alumnosPorPlan = [...porPlan.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Dashboard</h2>
      </div>

      {!!cambiosPlanPendientes && (
        <Link
          href="/protected/alumnos/cambios-plan?estado=pendiente"
          className="w-fit rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-primary/20"
        >
          {cambiosPlanPendientes} solicitud{cambiosPlanPendientes === 1 ? "" : "es"} de cambio de plan por resolver
        </Link>
      )}

      {/* Fila 1 — indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={DollarSign}
          iconClass="bg-sky-100 text-sky-600"
          label="Cobrado este mes"
          value={formatMonto(cobradoMes)}
          progress={pct(cobradoMes, esperadoMes)}
          detail={`de ${formatMonto(esperadoMes)} esperados`}
        />
        <StatCard
          icon={Users}
          iconClass="bg-emerald-100 text-emerald-600"
          label="Alumnos activos"
          value={alumnos.length}
          detail={`${altasMes ?? 0} alta${altasMes === 1 ? "" : "s"} este mes`}
        />
        <StatCard icon={UserMinus} iconClass="bg-red-100 text-red-500" label="Alumnos en baja" value={alumnosEnBaja ?? 0} />
        <StatCard
          icon={Wallet}
          iconClass="bg-red-100 text-red-500"
          label="Alumnos morosos"
          value={atrasados.length}
          detail={`${formatMonto(porCobrarMonto)} por cobrar`}
        />
      </div>

      {/* Fila 2 — pendientes de hoy */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo="Clases de hoy" fecha={formatFecha(hoy)}>
          <p className="text-sm text-muted-foreground">
            {slotsHoy.length} clase{slotsHoy.length === 1 ? "" : "s"}, {alumnosCitadosHoy} alumno
            {alumnosCitadosHoy === 1 ? "" : "s"}
          </p>
          {slotsHoy.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay alumnos citados para hoy.
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
                    {slot.reservas
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

        <Bloque titulo="ESTADO DE PAGOS">
          {cobranzaPendiente.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay alumnos atrasados ni por vencer esta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {cobranzaPendiente.slice(0, 8).map((row) => (
                <div
                  key={row.alumno_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[7px] border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/protected/pagos/${row.alumno_id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {row.nombres} {row.apellidos}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.estado_pago === "atrasado"
                        ? `venció ${formatFecha(row.vencimiento_actual!)} · ${row.dias_atraso} día${row.dias_atraso === 1 ? "" : "s"} de atraso`
                        : `vence ${formatFecha(row.vencimiento_actual!)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EstadoPagoBadge estado={row.estado_pago} />
                    <WhatsAppCobranzaButton alumno={row} />
                    <IconAction
                      icon={Banknote}
                      label="Registrar pago"
                      href={`/protected/pagos/${row.alumno_id}#registrar-pago`}
                    />
                  </div>
                </div>
              ))}
              {cobranzaPendiente.length > 8 && (
                <Link
                  href="/protected/pagos"
                  className="mt-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Ver {cobranzaPendiente.length} alumnos pendientes →
                </Link>
              )}
            </div>
          )}
        </Bloque>
      </div>

      {/* Fila 3 — tendencias */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloque titulo="Ingresos · últimos 6 meses">
          <div className="flex flex-col gap-2">
            {ingresosPorMes.map((m) => (
              <Barra
                key={m.etiqueta + m.total}
                etiqueta={m.etiqueta}
                valor={m.total}
                max={maxIngreso}
                texto={formatMonto(m.total)}
              />
            ))}
          </div>
        </Bloque>

        <Bloque titulo="Ocupación por bloque horario">
          {bloques.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Todavía no configuras ningún horario disponible.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground">Más llenos</div>
              {masLlenos.map((b) => (
                <Barra key={b.hora} etiqueta={`${formatHora(b.hora)} h`} valor={b.pct} max={100} texto={`${b.pct}%`} />
              ))}
              {masVacios.length > 0 && (
                <>
                  <div className="mt-1 text-xs text-muted-foreground">Más vacíos</div>
                  {masVacios.map((b) => (
                    <Barra key={b.hora} etiqueta={`${formatHora(b.hora)} h`} valor={b.pct} max={100} texto={`${b.pct}%`} />
                  ))}
                </>
              )}
            </div>
          )}
          <Link
            href="/protected/turnos?vista=semana"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Ver calendario completo →
          </Link>
        </Bloque>

        <Bloque titulo="Alumnos por plan">
          {alumnosPorPlan.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin alumnos activos.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {alumnosPorPlan.map(([nombre, n]) => (
                <div key={nombre} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{nombre}</span>
                  <span className="font-medium text-foreground">{n}</span>
                </div>
              ))}
            </div>
          )}
        </Bloque>
      </div>
    </div>
  );
}
