
import { Badge } from "@/components/ui/badge";
import { BotonLimpiar } from "@/components/ui/boton-limpiar";
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
import { formatFecha } from "@/lib/format";
import { leerPagina, rangoPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { formatHora, hoyIso, sumarMinutos } from "@/lib/turnos";
import type { Asistencia } from "@/lib/types";

const ESTADOS: { value: Asistencia; label: string; variant: "success" | "destructive" | "secondary" }[] = [
  { value: "presente", label: "Presente", variant: "success" },
  { value: "ausente", label: "Ausente", variant: "destructive" },
  { value: "justificado", label: "Justificado", variant: "secondary" },
];

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Primer y último día del mes de `hoy` ("YYYY-MM-DD"). */
function rangoMes(hoy: string) {
  const [y, m] = hoy.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { desde: `${y}-${mm}-01`, hasta: `${y}-${mm}-${String(ultimo).padStart(2, "0")}` };
}

type Fila = {
  id: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  asistencia: Asistencia;
  sobrecupo: boolean | null;
  alumno: { nombres: string; apellidos: string; rut: number; dig_ver: string } | null;
};

export default async function AsistenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; estado?: string; q?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const mes = rangoMes(hoyIso());
  const desde = FECHA_RE.test(params.desde ?? "") ? params.desde! : mes.desde;
  const hasta = FECHA_RE.test(params.hasta ?? "") ? params.hasta! : mes.hasta;
  const estado = ESTADOS.find((e) => e.value === params.estado)?.value;
  const q = (params.q ?? "").trim();
  const pagina = leerPagina(params.pagina);

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const gimnasioId = perfilData.perfil.gimnasio_id;
  const qSafe = q.replace(/[,%()]/g, "");

  // Mismo filtro para la lista y los totales; `head: true` solo cuenta.
  const base = (columnas: string, opciones?: { count: "exact"; head?: boolean }) => {
    let query = supabase
      .from("reservas")
      .select(columnas, opciones)
      .eq("gimnasio_id", gimnasioId)
      .gte("fecha", desde)
      .lte("fecha", hasta);
    if (qSafe) {
      query = query.or(`nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`, {
        referencedTable: "alumno",
      });
    }
    return query;
  };
  const columnas = "id, fecha, hora_inicio, duracion_min, asistencia, sobrecupo, alumno:alumnos!inner(nombres, apellidos, rut, dig_ver)";

  let lista = base(columnas, { count: "exact" })
    .not("asistencia", "is", null)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .range(...rangoPagina(pagina));
  if (estado) lista = lista.eq("asistencia", estado);

  const [{ data, count }, ...conteos] = await Promise.all([
    lista,
    ...ESTADOS.map((e) => base("id, alumno:alumnos!inner(id)", { count: "exact", head: true }).eq("asistencia", e.value)),
  ]);

  const filas = (data ?? []) as unknown as Fila[];
  const total = count ?? 0;
  const totales = Object.fromEntries(ESTADOS.map((e, i) => [e.value, conteos[i].count ?? 0]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Asistencias</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ESTADOS.map((e) => (
          <Card key={e.value}>
            <CardContent className="flex items-center justify-between pt-6">
              <Badge variant={e.variant}>{e.label}</Badge>
              <span className="font-display text-3xl text-foreground">{totales[e.value]}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Sin `pagina` en el form: cambiar un filtro reinicia a la página 1. */}
          <form className="mb-5 flex flex-wrap items-center gap-3" action="/protected/asistencias">
            <Input type="date" name="desde" defaultValue={desde} aria-label="Desde" className="w-auto" />
            <Input type="date" name="hasta" defaultValue={hasta} aria-label="Hasta" className="w-auto" />
            <Select name="estado" defaultValue={estado ?? ""} aria-label="Filtrar por estado" className="w-auto">
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
            <Input
              type="search"
              name="q"
              placeholder="Buscar alumno…"
              defaultValue={q}
              className="min-w-[200px] max-w-xs flex-1"
            />
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            <BotonLimpiar href="/protected/asistencias" activo={Boolean(desde || hasta || estado || q)} />
          </form>

          {filas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay asistencias registradas con estos filtros.
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Sobrecupo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => {
                  const e = ESTADOS.find((x) => x.value === f.asistencia)!;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="whitespace-nowrap">{formatFecha(f.fecha)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatHora(f.hora_inicio)} – {sumarMinutos(formatHora(f.hora_inicio), f.duracion_min)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {f.alumno ? `${f.alumno.nombres} ${f.alumno.apellidos}` : "—"}
                        {f.alumno && (
                          <span className="ml-2 font-normal text-muted-foreground">
                            {f.alumno.rut}-{f.alumno.dig_ver}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.variant}>{e.label}</Badge>
                      </TableCell>
                      <TableCell>{f.sobrecupo ? "Sí" : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Paginador
            pathname="/protected/asistencias"
            query={{ desde, hasta, estado, q }}
            pagina={pagina}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
