import Link from "next/link";

import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPagoAlumno } from "@/lib/types";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  let query = supabase
    .from("v_estado_pago_alumnos")
    .select("*")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("activo", true)
    .order("apellidos", { ascending: true });

  if (q) {
    const qSafe = q.replace(/[,%]/g, "");
    query = query.or(`nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`);
  }

  const { data } = await query;
  const lista = ((data ?? []) as EstadoPagoAlumno[]).sort((a, b) => {
    const orden = { atrasado: 0, sin_pagos: 1, al_dia: 2 };
    return orden[a.estado_pago] - orden[b.estado_pago];
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Pagos</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-5">
            <form className="min-w-[220px] max-w-xs" action="/protected/pagos">
              <Input
                type="search"
                name="q"
                placeholder="Buscar por nombre…"
                defaultValue={q}
              />
            </form>
          </div>

          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q
                ? "No hay alumnos que coincidan con tu búsqueda."
                : "Aún no tienes alumnos activos registrados."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((row) => (
                  <TableRow key={row.alumno_id}>
                    <TableCell className="font-medium text-foreground">
                      <Link
                        href={`/protected/pagos/${row.alumno_id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {row.nombres} {row.apellidos}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.vencimiento_actual
                        ? formatFecha(row.vencimiento_actual)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <EstadoPagoBadge estado={row.estado_pago} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/protected/pagos/${row.alumno_id}`}
                        className="text-xs text-muted-foreground hover:text-primary hover:underline"
                      >
                        Ver historial / registrar pago
                      </Link>
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
