import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Plan } from "@/lib/types";

const NIVEL_LABEL: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ creado?: string; actualizado?: string }>;
}) {
  const params = await searchParams;

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const { data: planes } = await supabase
    .from("planes")
    .select("*")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("dias_por_semana", { ascending: true });

  const lista = (planes ?? []) as Plan[];
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Planes</h2>
        </div>
        <Button asChild size="lg">
          <Link href="/protected/planes/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo plan
          </Link>
        </Button>
      </div>

      {params.creado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Plan creado correctamente.
        </div>
      )}
      {params.actualizado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Plan actualizado correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no tienes planes creados. Los tres niveles habituales son Básico,
              Intermedio y Avanzado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Días/semana</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((plan) => {
                  const vigente =
                    plan.fecha_vigencia_desde <= hoy &&
                    (!plan.fecha_vigencia_hasta || plan.fecha_vigencia_hasta >= hoy);
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium text-foreground">
                        <Link
                          href={`/protected/planes/${plan.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {plan.nombre}
                        </Link>
                      </TableCell>
                      <TableCell>{NIVEL_LABEL[plan.nivel]}</TableCell>
                      <TableCell>{plan.dias_por_semana}</TableCell>
                      <TableCell>{plan.precio ? formatMonto(plan.precio) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            Desde {formatFecha(plan.fecha_vigencia_desde)}
                            {plan.fecha_vigencia_hasta
                              ? ` hasta ${formatFecha(plan.fecha_vigencia_hasta)}`
                              : ""}
                          </span>
                          <Badge variant={vigente ? "success" : "secondary"}>
                            {vigente ? "Vigente" : "No vigente"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/protected/planes/${plan.id}`}>Editar</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
