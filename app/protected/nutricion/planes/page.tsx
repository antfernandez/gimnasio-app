import { Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { archivarPlanNutricional } from "@/app/protected/nutricion/actions";
import { ArchivarPlanButton } from "@/components/nutricion/archivar-plan-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconAction } from "@/components/ui/icon-action";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { labelEstadoPlan, labelObjetivo, type PlanNutricional } from "@/lib/nutricion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function PlanesNutricionalesPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const params = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const supabase = await createClient();
  const gimnasioId = perfilData.perfil.gimnasio_id;
  const [{ data: planes }, { data: asignaciones }] = await Promise.all([
    supabase.from("planes_nutricionales").select("*").eq("gimnasio_id", gimnasioId).order("nombre"),
    supabase
      .from("asignaciones_nutricionales")
      .select("plan_id, estado")
      .eq("gimnasio_id", gimnasioId)
      .not("plan_id", "is", null),
  ]);

  const activasPorPlan = new Map<string, number>();
  for (const a of (asignaciones ?? []) as { plan_id: string; estado: string }[]) {
    if (a.estado === "activo") activasPorPlan.set(a.plan_id, (activasPorPlan.get(a.plan_id) ?? 0) + 1);
  }

  const lista = (planes ?? []) as PlanNutricional[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href="/protected/nutricion/planes/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo plan nutricional
          </Link>
        </Button>
      </div>

      {params.guardado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Plan guardado correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay planes nutricionales.
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Meta diaria</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alumnos activos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/protected/nutricion/planes/${p.id}`} className="hover:text-primary hover:underline">
                        {p.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{labelObjetivo(p.objetivo)}</TableCell>
                    <TableCell>{p.meta_calorias ? `${Math.round(Number(p.meta_calorias))} kcal` : "—"}</TableCell>
                    <TableCell>{p.duracion_dias ? `${p.duracion_dias} días` : "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={p.estado === "activo" ? "success" : p.estado === "borrador" ? "outline" : "secondary"}
                      >
                        {labelEstadoPlan(p.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>{activasPorPlan.get(p.id) ?? 0}</TableCell>
                    <TableCell className="w-px whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <IconAction icon={Pencil} label="Editar" href={`/protected/nutricion/planes/${p.id}`} />
                        <ArchivarPlanButton
                          nombre={p.nombre}
                          archivado={p.estado === "archivado"}
                          accion={archivarPlanNutricional.bind(null, p.id)}
                        />
                      </div>
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
