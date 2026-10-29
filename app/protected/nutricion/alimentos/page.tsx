import { Pencil, Plus } from "lucide-react";
import Link from "next/link";

import {
  eliminarAlimento,
  guardarAlimento,
} from "@/app/protected/nutricion/actions";
import { AlimentoForm } from "@/components/nutricion/alimento-form";
import { EliminarButton } from "@/components/nutricion/eliminar-button";
import { Badge } from "@/components/ui/badge";
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
import {
  CATEGORIAS_ALIMENTO,
  fmt1,
  labelCategoria,
  type Alimento,
} from "@/lib/nutricion";
import { leerPagina, rangoPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function AlimentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    categoria?: string;
    q?: string;
    editar?: string;
    nuevo?: string;
    guardado?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const categoria = CATEGORIAS_ALIMENTO.find(
    (c) => c.value === params.categoria,
  )?.value;
  const q = (params.q ?? "").trim();
  const pagina = leerPagina(params.pagina);

  const supabase = await createClient();
  // RLS devuelve los globales (gimnasio_id null) y los del propio gimnasio.
  let consulta = supabase
    .from("alimentos")
    .select("*", { count: "exact" })
    .order("nombre", { ascending: true })
    .range(...rangoPagina(pagina));
  if (categoria) consulta = consulta.eq("categoria", categoria);
  if (q) consulta = consulta.ilike("nombre", `%${q.replace(/[,%()]/g, "")}%`);
  const { data, count } = await consulta;
  const visibles = (data ?? []) as Alimento[];
  const total = count ?? 0;

  let enEdicion: Alimento | undefined;
  if (params.editar) {
    const { data: fila } = await supabase
      .from("alimentos")
      .select("*")
      .eq("id", params.editar)
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .maybeSingle();
    enEdicion = (fila ?? undefined) as Alimento | undefined;
  }

  // Recetas distintas que usan cada alimento (RLS limita a las del gimnasio).
  const { data: usos } = await supabase
    .from("receta_ingredientes")
    .select("alimento_id, receta_id");
  const recetasPorAlimento = new Map<string, Set<string>>();
  for (const u of usos ?? []) {
    if (!u.alimento_id) continue;
    const set =
      recetasPorAlimento.get(u.alimento_id as string) ?? new Set<string>();
    set.add(u.receta_id as string);
    recetasPorAlimento.set(u.alimento_id as string, set);
  }

  return (
    <div className="flex flex-col gap-6">
      {params.guardado && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Alimento guardado correctamente.
        </div>
      )}

      {(enEdicion || params.nuevo === "1") && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-base">
              {enEdicion ? `Editar “${enEdicion.nombre}”` : "Nuevo alimento"}
            </h3>
            <AlimentoForm
              key={enEdicion?.id ?? "nuevo"}
              action={guardarAlimento.bind(null, enEdicion?.id ?? null)}
              alimento={enEdicion}
              submitLabel={enEdicion ? "Guardar cambios" : "Crear alimento"}
            />
            <Button asChild variant="ghost" className="mt-3">
              <Link href="/protected/nutricion/alimentos">Cancelar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <form
              className="flex flex-wrap items-center gap-2"
              action="/protected/nutricion/alimentos"
            >
              <Input
                name="q"
                placeholder="Buscar por nombre"
                defaultValue={q}
                className="w-56"
              />
              <Select
                name="categoria"
                defaultValue={categoria ?? ""}
                className="w-48"
              >
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
              {(q || categoria) && (
                <Button asChild variant="ghost">
                  <Link href="/protected/nutricion/alimentos">Limpiar</Link>
                </Button>
              )}
            </form>
            <Button asChild>
              <Link href="/protected/nutricion/alimentos?nuevo=1">
                <Plus className="h-4 w-4" />
                Nuevo alimento
              </Link>
            </Button>
          </div>

          {visibles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay alimentos que coincidan. Si es la primera vez, aplica la
              migración 0022 para cargar el catálogo base.
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
                  const propio =
                    a.gimnasio_id === perfilData.perfil.gimnasio_id;
                  const enUso = recetasPorAlimento.get(a.id)?.size ?? 0;
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
                              bloqueadoPor={
                                enUso
                                  ? `Está en uso en ${enUso} ${enUso === 1 ? "receta" : "recetas"}`
                                  : undefined
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Solo lectura
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Paginador
            pathname="/protected/nutricion/alimentos"
            query={{ q, categoria }}
            pagina={pagina}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
