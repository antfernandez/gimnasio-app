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
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type {
  Alumno,
  EstadoPagoAlumno,
  EstadoPaqueteAlumno,
  Pago,
  Plan,
} from "@/lib/types";

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

type PagoConPlan = Pago & { plan: { nombre: string } | null };

export default async function PagosAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ alumnoId: string }>;
  searchParams: Promise<{ registrado?: string }>;
}) {
  const { alumnoId } = await params;
  const { registrado } = await searchParams;

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", alumnoId)
    .maybeSingle();

  if (!alumno) notFound();
  const a = alumno as Alumno;

  const [{ data: pagos }, { data: estadoRow }, { data: estadoPaqueteRow }, { data: planes }] =
    await Promise.all([
      supabase
        .from("pagos")
        .select("*, plan:planes(nombre)")
        .eq("alumno_id", alumnoId)
        .order("fecha_pago", { ascending: false }),
      supabase
        .from("v_estado_pago_alumnos")
        .select("*")
        .eq("alumno_id", alumnoId)
        .maybeSingle(),
      supabase
        .from("v_estado_paquetes_alumnos")
        .select("*")
        .eq("alumno_id", alumnoId)
        .maybeSingle(),
      supabase
        .from("planes")
        .select("*")
        .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
        .order("dias_por_semana", { ascending: true }),
    ]);

  const historial = (pagos ?? []) as PagoConPlan[];
  const estado = estadoRow as EstadoPagoAlumno | null;
  const estadoPaquete = estadoPaqueteRow as EstadoPaqueteAlumno | null;
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
          <PagoForm
            action={createPagoConId}
            planes={(planes ?? []) as Plan[]}
            planActualId={a.plan_id}
          />
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
                  <TableHead>Forma de pago</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell>{formatFecha(pago.fecha_pago)}</TableCell>
                    <TableCell>{METODO_LABEL[pago.metodo]}</TableCell>
                    <TableCell>{pago.plan?.nombre ?? "—"}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatMonto(pago.monto)}
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
