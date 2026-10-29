import Link from "next/link";
import { redirect } from "next/navigation";

import { NuevoPlanForm } from "@/components/superadmin/plan-forms";
import { BotonFormulario } from "@/components/superadmin/boton-formulario";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatFecha, formatMonto } from "@/lib/format";
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { precioMensualConIva, type FuncionSistema } from "@/lib/planes-sistema";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";
import { hoyIso } from "@/lib/turnos";

export const instant = false;

type Estado = "vigente" | "vencido" | "programado" | "inactivo";
const ESTADOS: Record<Estado, string> = {
  vigente: "Vigente",
  vencido: "Vencido",
  programado: "Programado",
  inactivo: "Inactivo",
};

interface Fila {
  id: string;
  nombre: string;
  max_alumnos: number | null;
  precio_mensual: number | string;
  iva_pct: number | string;
  activo: boolean;
  orden: number;
  vigente_desde: string;
  vigente_hasta: string | null;
  caracteristicas: FuncionSistema[] | null;
}

function estadoPlan(p: Fila, hoy: string): Estado {
  if (!p.activo) return "inactivo";
  if (p.vigente_hasta && p.vigente_hasta < hoy) return "vencido";
  if (p.vigente_desde > hoy) return "programado";
  return "vigente";
}

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const estado = params.estado ?? "";
  const pagina = leerPagina(params.pagina);

  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const hoy = hoyIso();
  const admin = createAdminClient();
  const [{ data: planes }, { data: gimnasios }] = await Promise.all([
    admin
      .from("planes_sistema")
      .select("*")
      .order("orden")
      .order("vigente_desde", { ascending: false }),
    admin.from("gimnasios").select("plan_sistema_id").eq("estado", "activo"),
  ]);

  const enUso = new Map<string, number>();
  for (const g of gimnasios ?? []) {
    if (g.plan_sistema_id) enUso.set(g.plan_sistema_id, (enUso.get(g.plan_sistema_id) ?? 0) + 1);
  }

  const coincidentes = ((planes ?? []) as Fila[])
    .map((p) => ({ p, e: estadoPlan(p, hoy) }))
    .filter(({ p, e }) => (!estado || e === estado) && (!q || p.nombre.toLowerCase().includes(q)));
  const visibles = cortarPagina(coincidentes, pagina);
  const hayFiltros = !!(q || estado);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel Superadmin
        </div>
        <h2 className="text-2xl">Planes</h2>
      </div>

      <BotonFormulario etiqueta="+ Nuevo Plan">
        <NuevoPlanForm />
      </BotonFormulario>

      <form className="flex flex-wrap items-center gap-3" action="/superadmin/planes">
        <Input
          type="search"
          name="q"
          placeholder="Buscar por nombre…"
          defaultValue={params.q ?? ""}
          className="min-w-[220px] max-w-xs flex-1"
        />
        <Select name="estado" defaultValue={estado} className="w-44">
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADOS) as Estado[]).map((e) => (
            <option key={e} value={e}>
              {ESTADOS[e]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {hayFiltros && (
          <Button asChild variant="ghost">
            <Link href="/superadmin/planes">Limpiar</Link>
          </Button>
        )}
      </form>

      {visibles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay planes que coincidan.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Alumnos</TableHead>
              <TableHead>Neto</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>Total mensual</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Funciones</TableHead>
              <TableHead>Gimnasios</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map(({ p, e }) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{p.max_alumnos ?? "Sin tope"}</TableCell>
                <TableCell>{formatMonto(Number(p.precio_mensual))}</TableCell>
                <TableCell>{Number(p.iva_pct)} %</TableCell>
                <TableCell>
                  {formatMonto(precioMensualConIva(Number(p.precio_mensual), Number(p.iva_pct)))}
                </TableCell>
                <TableCell>
                  {formatFecha(p.vigente_desde)} → {p.vigente_hasta ? formatFecha(p.vigente_hasta) : "sin término"}
                </TableCell>
                <TableCell>
                  <Badge variant={e === "vigente" ? "success" : e === "inactivo" ? "destructive" : "secondary"}>
                    {ESTADOS[e]}
                  </Badge>
                </TableCell>
                <TableCell>{(p.caracteristicas ?? []).length}</TableCell>
                <TableCell>
                  {enUso.get(p.id) ? (
                    <Link
                      href={`/superadmin/gimnasios?plan=${encodeURIComponent(p.nombre)}`}
                      className="text-primary underline"
                    >
                      {enUso.get(p.id)}
                    </Link>
                  ) : (
                    0
                  )}
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/superadmin/planes/${p.id}`}>Editar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador
        pathname="/superadmin/planes"
        query={{ q: params.q, estado }}
        pagina={pagina}
        total={coincidentes.length}
      />
    </div>
  );
}
