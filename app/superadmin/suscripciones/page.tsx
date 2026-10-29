import Link from "next/link";
import { redirect } from "next/navigation";

import {
  rechazarSuscripcion,
  validarSuscripcion,
} from "@/app/superadmin/suscripciones/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";
import type { SolicitudPago } from "@/lib/types";

export const instant = false;

type Fila = SolicitudPago & {
  gimnasios: { nombre: string } | null;
  planes_sistema: { nombre: string } | null;
  comprobante_url: string | null;
};

// Usa `service_role` solo sobre `solicitudes_pago` con `flujo = 'suscripcion'` (lo que
// los gimnasios te pagan a ti); nunca los pagos de alumnos.
export default async function SuscripcionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const pagina = leerPagina(params.pagina);
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const admin = createAdminClient();
  const { data } = await admin
    .from("solicitudes_pago")
    .select("*, gimnasios(nombre), planes_sistema(nombre)")
    .eq("flujo", "suscripcion")
    .eq("metodo", "transferencia")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  const coincidentes = ((data ?? []) as Fila[]).filter(
    (s) => !q || (s.gimnasios?.nombre ?? "").toLowerCase().includes(q.toLowerCase()),
  );
  const filas: Fila[] = await Promise.all(
    cortarPagina(coincidentes, pagina).map(async (s) => {
      const { data: firmada } = s.comprobante_path
        ? await admin.storage.from("comprobantes-pago").createSignedUrl(s.comprobante_path, 600)
        : { data: null };
      return { ...s, comprobante_url: firmada?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/superadmin" className="text-xs text-muted-foreground hover:underline">
          ← Administradores
        </Link>
        <h2 className="text-2xl">Suscripciones por validar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Transferencias de los gimnasios por el uso del sistema.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-3" action="/superadmin/suscripciones">
        <Input
          type="search"
          name="q"
          placeholder="Buscar por gimnasio…"
          defaultValue={q}
          className="min-w-[220px] max-w-xs flex-1"
        />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href="/superadmin/suscripciones">Limpiar</Link>
          </Button>
        )}
      </form>

      {filas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {q ? "No hay transferencias que coincidan." : "No hay transferencias pendientes."}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gimnasio</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Transferencia</TableHead>
              <TableHead>Meses</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  {s.gimnasios?.nombre}
                  {s.nota && <div className="text-xs text-muted-foreground">{s.nota}</div>}
                </TableCell>
                <TableCell>{s.planes_sistema?.nombre}</TableCell>
                <TableCell>{s.fecha_transferencia && formatFecha(s.fecha_transferencia)}</TableCell>
                <TableCell>{s.meses}</TableCell>
                <TableCell>{formatMonto(Number(s.monto))}</TableCell>
                <TableCell>
                  {s.comprobante_url ? (
                    <a href={s.comprobante_url} target="_blank" rel="noreferrer" className="text-primary underline">
                      Ver
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={validarSuscripcion.bind(null, s.id)}>
                      <Button size="sm" type="submit">
                        Validar
                      </Button>
                    </form>
                    <form action={rechazarSuscripcion.bind(null, s.id)} className="flex gap-2">
                      <Input name="motivo" placeholder="Motivo del rechazo" required className="h-8 w-44" />
                      <Button size="sm" variant="outline" type="submit">
                        Rechazar
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador
        pathname="/superadmin/suscripciones"
        query={{ q }}
        pagina={pagina}
        total={coincidentes.length}
      />
    </div>
  );
}
