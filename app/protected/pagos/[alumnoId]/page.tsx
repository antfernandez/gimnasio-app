import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createPago } from "@/app/protected/pagos/actions";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { PagoForm } from "@/components/pagos/pago-form";
import { Card, CardContent } from "@/components/ui/card";
import { FiltrosFecha, leerFecha } from "@/components/ui/filtros-fecha";
import { Paginador } from "@/components/ui/paginador";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha, formatMonto } from "@/lib/format";
import { leerPagina, rangoPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type {
  Alumno,
  EstadoCobranzaAlumno,
  EstadoPaqueteAlumno,
  Pago,
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
  searchParams: Promise<{ registrado?: string; desde?: string; hasta?: string; pagina?: string }>;
}) {
  const { alumnoId } = await params;
  const { registrado, ...filtros } = await searchParams;
  const desde = leerFecha(filtros.desde);
  const hasta = leerFecha(filtros.hasta);
  const pagina = leerPagina(filtros.pagina);

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

  let consultaPagos = supabase
    .from("pagos")
    .select("*, plan:planes(nombre)", { count: "exact" })
    .eq("alumno_id", alumnoId)
    .order("fecha_pago", { ascending: false })
    .range(...rangoPagina(pagina));
  if (desde) consultaPagos = consultaPagos.gte("fecha_pago", desde);
  if (hasta) consultaPagos = consultaPagos.lte("fecha_pago", hasta);

  const [{ data: pagos, count: totalPagos }, { data: estadoRow }, { data: estadoPaqueteRow }] =
    await Promise.all([
      consultaPagos,
      supabase
        .from("v_estado_cobranza_alumnos")
        .select("*")
        .eq("alumno_id", alumnoId)
        .maybeSingle(),
      supabase
        .from("v_estado_paquetes_alumnos")
        .select("*")
        .eq("alumno_id", alumnoId)
        .maybeSingle(),
    ]);

  const historial = (pagos ?? []) as PagoConPlan[];
  const estado = estadoRow as EstadoCobranzaAlumno | null;
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
            {estadoPaquete && estadoPaquete.paquete_id && (
              <span className="text-xs text-muted-foreground">
                {estadoPaquete.clases_restantes} clase
                {estadoPaquete.clases_restantes === 1 ? "" : "s"} restante
                {estadoPaquete.clases_restantes === 1 ? "" : "s"}
              </span>
            )}
            {estado && <EstadoPagoBadge estado={estado.estado_pago} />}
          </div>
        </div>
      </div>

      {registrado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Pago registrado correctamente.
        </div>
      )}

      <Card id="registrar-pago" className="scroll-mt-6">
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Registrar pago
          </h3>
          <PagoForm action={createPagoConId} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de pagos
          </h3>
          <FiltrosFecha pathname={`/protected/pagos/${alumnoId}`} desde={desde} hasta={hasta} />
          {historial.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {desde || hasta
                ? "No hay pagos en ese rango de fechas."
                : "Aún no hay pagos registrados para este alumno."}
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

          <Paginador
            pathname={`/protected/pagos/${alumnoId}`}
            query={{ desde, hasta }}
            pagina={pagina}
            total={totalPagos ?? 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
