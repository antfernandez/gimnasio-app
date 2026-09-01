import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createPago } from "@/app/protected/pagos/actions";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { EstadoPaqueteBadge } from "@/components/pagos/estado-paquete-badge";
import { PagoForm } from "@/components/pagos/pago-form";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha, formatMonto } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type {
  Alumno,
  EstadoPagoAlumno,
  EstadoPaqueteAlumno,
  Pago,
  Paquete,
} from "@/lib/types";

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export default async function PagosAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ alumnoId: string }>;
  searchParams: Promise<{ registrado?: string }>;
}) {
  const { alumnoId } = await params;
  const { registrado } = await searchParams;

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", alumnoId)
    .maybeSingle();

  if (!alumno) notFound();
  const a = alumno as Alumno;

  const [
    { data: pagos },
    { data: estadoRow },
    { data: paquetes },
    { data: estadoPaqueteRow },
    { data: planRow },
  ] = await Promise.all([
    supabase
      .from("pagos")
      .select("*")
      .eq("alumno_id", alumnoId)
      .order("periodo_hasta", { ascending: false }),
    supabase
      .from("v_estado_pago_alumnos")
      .select("*")
      .eq("alumno_id", alumnoId)
      .maybeSingle(),
    supabase
      .from("paquetes")
      .select("*")
      .eq("alumno_id", alumnoId)
      .order("fecha_vencimiento", { ascending: false }),
    supabase
      .from("v_estado_paquetes_alumnos")
      .select("*")
      .eq("alumno_id", alumnoId)
      .maybeSingle(),
    a.plan_id
      ? supabase
          .from("planes")
          .select("dias_por_semana")
          .eq("id", a.plan_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const historial = (pagos ?? []) as Pago[];
  const estado = estadoRow as EstadoPagoAlumno | null;
  const historialPaquetes = (paquetes ?? []) as Paquete[];
  const estadoPaquete = estadoPaqueteRow as EstadoPaqueteAlumno | null;
  const diasPorSemana = (planRow as { dias_por_semana: number } | null)?.dias_por_semana ?? null;
  const createPagoConId = createPago.bind(null, a.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/pagos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a pagos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Pagos de
            </div>
            <h2 className="text-2xl">
              {a.nombres} {a.apellidos}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {estado && <EstadoPagoBadge estado={estado.estado_pago} />}
            {estadoPaquete && <EstadoPaqueteBadge estado={estadoPaquete.estado_paquete} />}
          </div>
        </div>
      </div>

      {registrado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Pago registrado correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Registrar pago
          </h3>
          <PagoForm action={createPagoConId} diasPorSemana={diasPorSemana} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de pagos
          </h3>
          {historial.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay pagos registrados para este alumno.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha de pago</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell>{formatFecha(pago.fecha_pago)}</TableCell>
                    <TableCell>
                      {formatFecha(pago.periodo_desde)} –{" "}
                      {formatFecha(pago.periodo_hasta)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatMonto(pago.monto)}
                    </TableCell>
                    <TableCell>{METODO_LABEL[pago.metodo]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Paquetes de clases
          </h3>
          {historialPaquetes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este alumno todavía no tiene ningún paquete de clases. Márcalo al
              registrar un pago con la opción &quot;Este pago origina un paquete de
              clases nuevo&quot;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Clases</TableHead>
                  <TableHead>Consumidas</TableHead>
                  <TableHead>Restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historialPaquetes.map((paquete) => (
                  <TableRow key={paquete.id}>
                    <TableCell>{formatFecha(paquete.fecha_inicio)}</TableCell>
                    <TableCell>{formatFecha(paquete.fecha_vencimiento)}</TableCell>
                    <TableCell>{paquete.clases_incluidas}</TableCell>
                    <TableCell>{paquete.clases_consumidas}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      {paquete.clases_incluidas - paquete.clases_consumidas}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
