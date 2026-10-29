import { Banknote, Eye } from "lucide-react";
import Link from "next/link";

import { ExportMenu } from "@/components/export/export-menu";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { WhatsAppCobranzaButton } from "@/components/pagos/whatsapp-cobranza-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { Paginador } from "@/components/ui/paginador";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ESTADOS_PAGO } from "@/lib/estados-pago";
import { formatFecha } from "@/lib/format";
import { leerPagina, rangoPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { EstadoCobranzaAlumno, EstadoPago } from "@/lib/types";

const FILTRO_ESTADO: { value: EstadoPago; label: string }[] = [
  { value: "al_dia", label: "Al día" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "atrasado", label: "Atrasado" },
  { value: "sin_pagos", label: "Sin pagos" },
];

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const estado = ESTADOS_PAGO.includes(params.estado as EstadoPago)
    ? (params.estado as EstadoPago)
    : undefined;
  const pagina = leerPagina(params.pagina);

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  let query = supabase
    .from("v_estado_cobranza_alumnos")
    .select("*", { count: "exact" })
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("activo", true)
    .order("nombres", { ascending: true })
    .order("apellidos", { ascending: true })
    .range(...rangoPagina(pagina));

  if (estado) query = query.eq("estado_pago", estado);
  if (q) {
    const qSafe = q.replace(/[,%]/g, "");
    query = query.or(`nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`);
  }

  const { data, count } = await query;
  const lista = (data ?? []) as EstadoCobranzaAlumno[];
  const total = count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Pagos</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/protected/pagos/solicitudes">Transferencias por validar</Link>
          </Button>
          <ExportMenu resource="pagos" filtros={{ q, estado }} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Sin `pagina` en el form: cambiar un filtro reinicia a la página 1. */}
          <form
            className="mb-5 flex flex-wrap items-center gap-3"
            action="/protected/pagos"
          >
            <Input
              type="search"
              name="q"
              placeholder="Buscar por nombre…"
              defaultValue={q}
              className="min-w-[220px] max-w-xs flex-1"
            />
            <Select
              name="estado"
              defaultValue={estado ?? ""}
              aria-label="Filtrar por estado de pago"
              className="w-auto"
            >
              <option value="">Todos</option>
              {FILTRO_ESTADO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            {(q || estado) && (
              <Button asChild variant="ghost">
                <Link href="/protected/pagos">Limpiar</Link>
              </Button>
            )}
          </form>

          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q || estado
                ? "No hay alumnos que coincidan con los filtros."
                : "Aún no tienes alumnos activos registrados."}
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Método de pago</TableHead>
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
                    <TableCell className="whitespace-nowrap">
                      {row.vencimiento_actual
                        ? formatFecha(row.vencimiento_actual)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <EstadoPagoBadge estado={row.estado_pago} />
                    </TableCell>
                    <TableCell>{row.plan_nombre ?? "—"}</TableCell>
                    <TableCell>
                      {row.ultimo_metodo ? METODO_LABEL[row.ultimo_metodo] : "—"}
                    </TableCell>
                    <TableCell className="w-px whitespace-nowrap text-right">
                      <div className="flex items-center justify-end">
                        {(row.estado_pago === "atrasado" || row.estado_pago === "por_vencer") && (
                          <WhatsAppCobranzaButton alumno={row} />
                        )}
                        <IconAction
                          icon={Eye}
                          label="Ver historial"
                          href={`/protected/pagos/${row.alumno_id}`}
                        />
                        <IconAction
                          icon={Banknote}
                          label="Registrar pago"
                          href={`/protected/pagos/${row.alumno_id}#registrar-pago`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Paginador
            pathname="/protected/pagos"
            query={{ q, estado }}
            pagina={pagina}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
