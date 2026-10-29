import { Plus } from "lucide-react";
import Link from "next/link";

import { AplicarPresetRutinasButton } from "@/components/rutinas/aplicar-preset-rutinas-button";
import { RutinaAcciones } from "@/components/rutinas/rutina-acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { RutinaPlantilla } from "@/lib/types";

const CATEGORIA_LABEL: Record<string, string> = {
  musculacion: "Musculación",
  cardio: "Cardio",
  general: "General",
};

export default async function RutinasPage({
  searchParams,
}: {
  searchParams: Promise<{ creada?: string; actualizada?: string; q?: string; categoria?: string; estado?: string }>;
}) {
  const params = await searchParams;

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const { data: plantillas } = await supabase
    .from("rutina_plantillas")
    .select("*")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("nombre", { ascending: true });

  const todas = (plantillas ?? []) as RutinaPlantilla[];
  const q = (params.q ?? "").trim();
  const categoria = params.categoria ?? "";
  const estado = params.estado ?? "";
  const lista = todas.filter(
    (r) =>
      (!q || r.nombre.toLowerCase().includes(q.toLowerCase())) &&
      (!categoria || r.categoria === categoria) &&
      (!estado || (estado === "baja") === (r.activa === false)),
  );

  // Alumnos con cada rutina vigente: bloquea editar y dar de baja.
  const { data: asignaciones } = await supabase
    .from("rutinas")
    .select("plantilla_id")
    .eq("activa", true)
    .in("plantilla_id", todas.length > 0 ? todas.map((r) => r.id) : [""]);
  const asignadosPorRutina = new Map<string, number>();
  for (const { plantilla_id } of (asignaciones ?? []) as { plantilla_id: string }[]) {
    asignadosPorRutina.set(plantilla_id, (asignadosPorRutina.get(plantilla_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Rutinas</h2>
        </div>
        <Button asChild size="lg">
          <Link href="/protected/rutinas/nuevo">
            <Plus className="h-4 w-4" />
            Nueva rutina
          </Link>
        </Button>
      </div>

      {params.creada === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Rutina creada correctamente.
        </div>
      )}
      {params.actualizada === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Rutina actualizada correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {todas.length > 0 && (
            <form className="mb-5 flex flex-wrap items-center gap-3" action="/protected/rutinas">
              <Input
                type="search"
                name="q"
                placeholder="Buscar por nombre…"
                defaultValue={q}
                className="min-w-[220px] max-w-xs flex-1"
              />
              <Select name="categoria" defaultValue={categoria} aria-label="Filtrar por categoría" className="w-auto">
                <option value="">Todas las categorías</option>
                <option value="musculacion">Musculación</option>
                <option value="cardio">Cardio</option>
                <option value="general">General</option>
              </Select>
              <Select name="estado" defaultValue={estado} aria-label="Filtrar por estado" className="w-auto">
                <option value="">Todos</option>
                <option value="activa">Activa</option>
                <option value="baja">De baja</option>
              </Select>
              <Button type="submit" variant="outline">
                Filtrar
              </Button>
              {(q || (categoria || estado)) && (
                <Button asChild variant="ghost">
                  <Link href="/protected/rutinas">Limpiar</Link>
                </Button>
              )}
            </form>
          )}
          {todas.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aún no tienes rutinas creadas.
              </p>
              <AplicarPresetRutinasButton />
            </div>
          ) : lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay rutinas que coincidan con los filtros.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Ejercicios</TableHead>
                  <TableHead>Alumnos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((plantilla) => {
                  const deBaja = plantilla.activa === false;
                  const asignados = asignadosPorRutina.get(plantilla.id) ?? 0;
                  return (
                  <TableRow key={plantilla.id} className={deBaja ? "opacity-60" : ""}>
                    <TableCell className="font-medium text-foreground">
                      {plantilla.nombre}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORIA_LABEL[plantilla.categoria]}
                      </Badge>
                    </TableCell>
                    <TableCell>{plantilla.contenido.length}</TableCell>
                    <TableCell>{asignados}</TableCell>
                    <TableCell>
                      <Badge variant={deBaja ? "secondary" : "success"}>
                        {deBaja ? "De baja" : "Activa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RutinaAcciones
                        id={plantilla.id}
                        nombre={plantilla.nombre}
                        deBaja={deBaja}
                        alumnosAsignados={asignados}
                      />
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
