import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { GimnasioForm } from "@/components/superadmin/gimnasio-form";
import { PagoManualForm } from "@/components/superadmin/pago-manual-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Paginador } from "@/components/ui/paginador";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha, formatMonto, formatPeriodo } from "@/lib/format";
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { precioMensualConIva } from "@/lib/planes-sistema";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";
import { listarGimnasiosAdmin } from "@/lib/superadmin-datos";
import { ESTADO_SUSCRIPCION_LABEL, estadoSuscripcion } from "@/lib/superadmin-metricas";
import { hoyIso } from "@/lib/turnos";

export const instant = false;

const METODO = { mercado_pago: "Mercado Pago", transferencia: "Transferencia", manual: "Manual" };
const ESTADO = { pendiente: "Pendiente", confirmado: "Validado", rechazado: "Rechazado" };

export default async function GimnasioFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { id } = await params;
  const pagina = leerPagina((await searchParams).pagina);
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const admin = createAdminClient();
  const hoy = hoyIso();
  const [gimnasios, { data: planes }, { data: pagos }] = await Promise.all([
    listarGimnasiosAdmin(),
    admin
      .from("planes_sistema")
      .select("id, nombre, max_alumnos, precio_mensual, iva_pct, activo, vigente_desde, vigente_hasta")
      .order("orden"),
    admin
      .from("solicitudes_pago")
      .select("*, planes_sistema(nombre)")
      .eq("gimnasio_id", id)
      .eq("flujo", "suscripcion")
      .order("created_at", { ascending: false }),
  ]);

  const g = gimnasios.find((x) => x.id === id);
  if (!g) notFound();
  const estado = estadoSuscripcion(g, hoy);

  // Planes ofrecibles: vigentes hoy, más el actual del gimnasio aunque haya vencido.
  const vigentes = (planes ?? []).filter(
    (p) =>
      p.id === g.plan_sistema_id ||
      (p.activo && p.vigente_desde <= hoy && (!p.vigente_hasta || p.vigente_hasta >= hoy)),
  );

  const lista = pagos ?? [];
  const filas = await Promise.all(
    cortarPagina(lista, pagina).map(async (s) => {
      const { data: firmada } = s.comprobante_path
        ? await admin.storage.from("comprobantes-pago").createSignedUrl(s.comprobante_path, 600)
        : { data: null };
      return { ...s, comprobante_url: firmada?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/superadmin/gimnasios" className="text-xs text-muted-foreground hover:underline">
          ← Gimnasios
        </Link>
        <h2 className="text-2xl">{g.nombre}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Badge variant={estado === "activo" ? "success" : estado === "moroso" ? "destructive" : "secondary"}>
            {ESTADO_SUSCRIPCION_LABEL[estado]}
          </Badge>{" "}
          {g.suscripcion_hasta && <>Suscripción hasta {formatFecha(g.suscripcion_hasta)}</>}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Datos del gimnasio
          </h3>
          <GimnasioForm
            gimnasioId={g.id}
            duenoId={g.dueno_id}
            nombreGimnasio={g.nombre}
            nombreDueno={g.dueno_nombre === "—" ? "" : g.dueno_nombre}
            email={g.email === "—" ? "" : g.email}
            planId={g.plan_sistema_id}
            suscripcionHasta={g.suscripcion_hasta}
            planes={vigentes.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              etiqueta: `${p.nombre} · ${p.max_alumnos ?? "∞"} alumnos · ${formatMonto(
                precioMensualConIva(Number(p.precio_mensual), Number(p.iva_pct)),
              )}/mes`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Registrar pago manual
          </h3>
          <PagoManualForm
            gimnasioId={g.id}
            planInicial={g.plan_sistema_id}
            suscripcionHasta={g.suscripcion_hasta}
            planes={vigentes.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              mensualConIva: precioMensualConIva(Number(p.precio_mensual), Number(p.iva_pct)),
            }))}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pagos de suscripción
        </h3>
        {filas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Este gimnasio aún no tiene pagos de suscripción.
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Período</TableHead>
              <TableHead>Meses</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatFecha(s.created_at.slice(0, 10))}</TableCell>
                  <TableCell>{s.planes_sistema?.nombre ?? "—"}</TableCell>
                  <TableCell>{s.periodo_desde ? formatPeriodo(s.periodo_desde, s.meses) : "—"}</TableCell>
                <TableCell>{s.meses}</TableCell>
                  <TableCell>{formatMonto(Number(s.monto))}</TableCell>
                  <TableCell>{METODO[s.metodo as keyof typeof METODO] ?? s.metodo}
                  {s.registro_manual && <div className="text-xs text-muted-foreground">Registro manual</div>}</TableCell>
                  <TableCell>
                    {ESTADO[s.estado as keyof typeof ESTADO] ?? s.estado}
                    {s.estado === "pendiente" && s.metodo === "transferencia" && (
                      <div className="text-xs">
                        <Link href="/superadmin/suscripciones" className="text-primary underline">
                          Validar
                        </Link>
                      </div>
                    )}
                    {s.motivo_rechazo && (
                      <div className="text-xs text-muted-foreground">{s.motivo_rechazo}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.comprobante_url ? (
                      <a href={s.comprobante_url} target="_blank" rel="noreferrer" className="text-primary underline">
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{s.nota ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Paginador
          pathname={`/superadmin/gimnasios/${id}`}
          pagina={pagina}
          total={lista.length}
        />
      </div>
    </div>
  );
}
