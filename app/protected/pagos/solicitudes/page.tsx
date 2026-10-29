import Link from "next/link";

import {
  rechazarTransferencia,
  validarTransferencia,
} from "@/app/protected/pagos/solicitudes/actions";
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
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { SolicitudPago } from "@/lib/types";

type Fila = SolicitudPago & {
  alumnos: { nombres: string; apellidos: string } | null;
  comprobante_url: string | null;
};

export default async function SolicitudesPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const pagina = leerPagina(params.pagina);
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("solicitudes_pago")
    .select("*, alumnos(nombres, apellidos)")
    .eq("flujo", "alumno")
    .eq("metodo", "transferencia")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  const coincidentes = ((data ?? []) as Fila[]).filter(
    (s) => !q || `${s.alumnos?.nombres ?? ""} ${s.alumnos?.apellidos ?? ""}`.toLowerCase().includes(q),
  );
  const pendientes = cortarPagina(coincidentes, pagina);
  const filas: Fila[] = await Promise.all(
    pendientes.map(async (s) => {
      const { data: firmada } = s.comprobante_path
        ? await supabase.storage.from("comprobantes-pago").createSignedUrl(s.comprobante_path, 600)
        : { data: null };
      return { ...s, comprobante_url: firmada?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/protected/pagos" className="text-xs text-muted-foreground hover:underline">
          ← Pagos
        </Link>
        <h2 className="text-2xl">Transferencias por validar</h2>
      </div>

      <form className="flex flex-wrap items-center gap-3" action="/protected/pagos/solicitudes">
        <Input
          type="search"
          name="q"
          placeholder="Buscar por alumno…"
          defaultValue={params.q ?? ""}
          className="min-w-[220px] max-w-xs flex-1"
        />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href="/protected/pagos/solicitudes">Limpiar</Link>
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
              <TableHead>Alumno</TableHead>
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
                  {s.alumnos?.nombres} {s.alumnos?.apellidos}
                  {s.nota && <div className="text-xs text-muted-foreground">{s.nota}</div>}
                </TableCell>
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
                    <form action={validarTransferencia.bind(null, s.id)}>
                      <Button size="sm" type="submit">
                        Validar
                      </Button>
                    </form>
                    <form action={rechazarTransferencia.bind(null, s.id)} className="flex gap-2">
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
        pathname="/protected/pagos/solicitudes"
        query={{ q }}
        pagina={pagina}
        total={coincidentes.length}
      />
    </div>
  );
}
