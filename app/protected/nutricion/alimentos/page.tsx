import { Pencil } from "lucide-react";
import Link from "next/link";

import { eliminarAlimento, guardarAlimento } from "@/app/protected/nutricion/actions";
import { AlimentoForm } from "@/components/nutricion/alimento-form";
import { EliminarButton } from "@/components/nutricion/eliminar-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORIAS_ALIMENTO, fmt1, labelCategoria, type Alimento } from "@/lib/nutricion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function AlimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string; editar?: string; guardado?: string }>;
}) {
  const params = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const categoria = CATEGORIAS_ALIMENTO.find((c) => c.value === params.categoria)?.value;
  const q = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  // RLS devuelve los globales (gimnasio_id null) y los del propio gimnasio.
  const { data } = await supabase.from("alimentos").select("*").order("nombre", { ascending: true });
  const todos = (data ?? []) as Alimento[];

  const enEdicion = params.editar
    ? todos.find((a) => a.id === params.editar && a.gimnasio_id === perfilData.perfil.gimnasio_id)
    : undefined;

  const visibles = todos.filter(
    (a) => (!categoria || a.categoria === categoria) && (!q || a.nombre.toLowerCase().includes(q)),
  );

  return (
    <div className="flex flex-col gap-6">
      {params.guardado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Alimento guardado correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-base">{enEdicion ? `Editar “${enEdicion.nombre}”` : "Nuevo alimento"}</h3>
          <AlimentoForm
            key={enEdicion?.id ?? "nuevo"}
            action={guardarAlimento.bind(null, enEdicion?.id ?? null)}
            alimento={enEdicion}
            submitLabel={enEdicion ? "Guardar cambios" : "Crear alimento"}
          />
          {enEdicion && (
            <Button asChild variant="ghost" className="mt-3">
              <Link href="/protected/nutricion/alimentos">Cancelar edición</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-4 flex flex-wrap items-center gap-2" action="/protected/nutricion/alimentos">
            <Input name="q" placeholder="Buscar por nombre" defaultValue={params.q ?? ""} className="w-56" />
            <Select name="categoria" defaultValue={categoria ?? ""} className="w-48">
              <option value="">Todas las categorías</option>
              {CATEGORIAS_ALIMENTO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>

          {visibles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay alimentos que coincidan. Si es la primera vez, aplica la migración 0022 para cargar
              el catálogo base.
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>kcal</TableHead>
                  <TableHead>Prot.</TableHead>
                  <TableHead>Carb.</TableHead>
                  <TableHead>Grasas</TableHead>
                  <TableHead>Porción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((a) => {
                  const propio = a.gimnasio_id === perfilData.perfil.gimnasio_id;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-foreground">
                        {a.nombre}
                        {!propio && (
                          <Badge variant="secondary" className="ml-2">
                            Base
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{labelCategoria(a.categoria)}</TableCell>
                      <TableCell>{fmt1(Number(a.calorias))}</TableCell>
                      <TableCell>{fmt1(Number(a.proteina))}</TableCell>
                      <TableCell>{fmt1(Number(a.carbohidratos))}</TableCell>
                      <TableCell>{fmt1(Number(a.grasas))}</TableCell>
                      <TableCell>
                        {a.unidad_porcion && a.gramos_porcion
                          ? `${a.unidad_porcion} (${fmt1(Number(a.gramos_porcion))} g)`
                          : "—"}
                      </TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        {propio ? (
                          <div className="flex justify-end gap-1">
                            <IconAction
                              icon={Pencil}
                              label="Editar"
                              href={`/protected/nutricion/alimentos?editar=${a.id}`}
                            />
                            <EliminarButton
                              entidad="alimento"
                              nombre={a.nombre}
                              accion={eliminarAlimento.bind(null, a.id)}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Solo lectura</span>
                        )}
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
