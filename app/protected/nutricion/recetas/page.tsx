import { Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { eliminarReceta } from "@/app/protected/nutricion/actions";
import { EliminarButton } from "@/components/nutricion/eliminar-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconAction } from "@/components/ui/icon-action";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TIPOS_RECETA,
  fmt1,
  labelDificultad,
  labelTipoReceta,
  macrosPorPorcion,
  macrosReceta,
  type Alimento,
  type Ingrediente,
  type Receta,
} from "@/lib/nutricion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function RecetasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; guardado?: string }>;
}) {
  const params = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const tipo = TIPOS_RECETA.find((t) => t.value === params.tipo)?.value;

  const supabase = await createClient();
  const gimnasioId = perfilData.perfil.gimnasio_id;
  const [{ data: recetas }, { data: ingredientes }, { data: alimentos }] = await Promise.all([
    supabase.from("recetas").select("*").eq("gimnasio_id", gimnasioId).order("nombre"),
    supabase.from("receta_ingredientes").select("*").eq("gimnasio_id", gimnasioId),
    supabase.from("alimentos").select("*"),
  ]);

  const alimentoPorId = new Map(((alimentos ?? []) as Alimento[]).map((a) => [a.id, a]));
  const ingPorReceta = new Map<string, Ingrediente[]>();
  for (const i of (ingredientes ?? []) as Ingrediente[]) {
    ingPorReceta.set(i.receta_id, [...(ingPorReceta.get(i.receta_id) ?? []), i]);
  }

  const lista = ((recetas ?? []) as Receta[]).filter((r) => !tipo || r.tipo === tipo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action="/protected/nutricion/recetas" className="flex gap-2">
          <Select name="tipo" defaultValue={tipo ?? ""} className="w-48">
            <option value="">Todos los tipos</option>
            {TIPOS_RECETA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
        <Button asChild size="lg">
          <Link href="/protected/nutricion/recetas/nueva">
            <Plus className="h-4 w-4" />
            Nueva receta
          </Link>
        </Button>
      </div>

      {params.guardado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Receta guardada correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay recetas{tipo ? " de ese tipo" : " todavía"}.
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Porciones</TableHead>
                  <TableHead>kcal / porción</TableHead>
                  <TableHead>Prot. / porción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((r) => {
                  const m = macrosPorPorcion(
                    macrosReceta(ingPorReceta.get(r.id) ?? [], alimentoPorId),
                    r.porciones,
                  );
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-foreground">
                        <Link href={`/protected/nutricion/recetas/${r.id}`} className="hover:text-primary hover:underline">
                          {r.nombre}
                        </Link>
                      </TableCell>
                      <TableCell>{labelTipoReceta(r.tipo)}</TableCell>
                      <TableCell>{labelDificultad(r.dificultad)}</TableCell>
                      <TableCell>{r.porciones}</TableCell>
                      <TableCell>{fmt1(m.calorias)}</TableCell>
                      <TableCell>{fmt1(m.proteina)} g</TableCell>
                      <TableCell>
                        <Badge variant={r.estado === "activo" ? "success" : "secondary"}>
                          {r.estado === "activo" ? "Activo" : "Borrador"}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <IconAction icon={Pencil} label="Editar" href={`/protected/nutricion/recetas/${r.id}`} />
                          <EliminarButton entidad="receta" nombre={r.nombre} accion={eliminarReceta.bind(null, r.id)} />
                        </div>
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
