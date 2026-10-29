import Link from "next/link";

import { aprobarCambioPlan, rechazarCambioPlan } from "@/app/protected/alumnos/cambios-plan/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiltrosFecha, leerFecha } from "@/components/ui/filtros-fecha";
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
import { ESTADO_CAMBIO_PLAN_LABEL, ESTADO_CAMBIO_PLAN_VARIANTE } from "@/lib/cambio-plan";
import { formatFecha } from "@/lib/format";
import { leerPagina, rangoPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { EstadoCambioPlan, SolicitudCambioPlan } from "@/lib/types";

type Fila = SolicitudCambioPlan & {
  alumnos: { nombres: string; apellidos: string } | null;
  actual: { nombre: string } | null;
  nuevo: { nombre: string } | null;
};

export default async function CambiosPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; estado?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const desde = leerFecha(params.desde);
  const hasta = leerFecha(params.hasta);
  const estado =
    params.estado && params.estado in ESTADO_CAMBIO_PLAN_LABEL ? (params.estado as EstadoCambioPlan) : "";
  const pagina = leerPagina(params.pagina);
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  // Aplica los cambios aprobados cuyo periodo ya terminó antes de listar.
  await supabase.rpc("aplicar_cambios_plan_vencidos");

  let consulta = supabase
    .from("solicitudes_cambio_plan")
    .select(
      "*, alumnos(nombres, apellidos), actual:planes!plan_actual_id(nombre), nuevo:planes!plan_nuevo_id(nombre)",
      { count: "exact" },
    )
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .gte("created_at", desde ?? "1900-01-01")
    .lte("created_at", hasta ? `${hasta}T23:59:59.999Z` : "9999-12-31");
  if (estado) consulta = consulta.eq("estado", estado);
  const { data, count } = await consulta
    .order("created_at", { ascending: false })
    .range(...rangoPagina(pagina));
  const filas = (data ?? []) as Fila[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/protected/alumnos" className="text-xs text-muted-foreground hover:underline">
          ← Alumnos
        </Link>
        <h2 className="text-2xl">Solicitudes de cambio de plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Al aprobar, el alumno sigue con su plan actual hasta que termine su periodo en curso.
        </p>
      </div>

      <FiltrosFecha pathname="/protected/alumnos/cambios-plan" desde={desde} hasta={hasta} hayFiltros={!!estado}>
        <Select name="estado" defaultValue={estado} aria-label="Filtrar por estado" className="w-auto">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_CAMBIO_PLAN_LABEL).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Select>
      </FiltrosFecha>

      {filas.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No hay solicitudes de cambio de plan.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Alumno</TableHead>
              <TableHead>Plan actual</TableHead>
              <TableHead>Plan deseado</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{formatFecha(s.created_at.slice(0, 10))}</TableCell>
                <TableCell>
                  {s.alumnos?.nombres} {s.alumnos?.apellidos}
                </TableCell>
                <TableCell>{s.actual?.nombre ?? "Sin plan"}</TableCell>
                <TableCell>{s.nuevo?.nombre ?? "—"}</TableCell>
                <TableCell className="max-w-xs whitespace-normal break-words">{s.nota ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_CAMBIO_PLAN_VARIANTE[s.estado]}>{ESTADO_CAMBIO_PLAN_LABEL[s.estado]}</Badge>
                  {s.aplica_desde && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Rige desde el {formatFecha(s.aplica_desde)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {s.estado === "pendiente" && (
                    <div className="flex gap-2">
                      <form action={rechazarCambioPlan.bind(null, s.id)}>
                        <Button type="submit" size="sm" variant="destructive">
                          Rechazar
                        </Button>
                      </form>
                      <form action={aprobarCambioPlan.bind(null, s.id)}>
                        <Button type="submit" size="sm">
                          Aprobar
                        </Button>
                      </form>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Paginador
        pathname="/protected/alumnos/cambios-plan"
        query={{ desde, hasta, estado }}
        pagina={pagina}
        total={count ?? 0}
      />
    </div>
  );
}
