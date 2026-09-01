import { Plus } from "lucide-react";
import Link from "next/link";

import { AplicarPresetRutinasButton } from "@/components/rutinas/aplicar-preset-rutinas-button";
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
  searchParams: Promise<{ creada?: string; actualizada?: string }>;
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

  const lista = (plantillas ?? []) as RutinaPlantilla[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Rutinas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de plantillas de rutina, reutilizable entre alumnos. Para asignar
            una a un alumno, ve a su ficha en Alumnos → Editar.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/protected/rutinas/nuevo">
            <Plus className="h-4 w-4" />
            Nueva plantilla
          </Link>
        </Button>
      </div>

      {params.creada === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Plantilla creada correctamente.
        </div>
      )}
      {params.actualizada === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Plantilla actualizada correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aún no tienes plantillas de rutina creadas.
              </p>
              <AplicarPresetRutinasButton />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Ejercicios</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((plantilla) => (
                  <TableRow key={plantilla.id}>
                    <TableCell className="font-medium text-foreground">
                      <Link
                        href={`/protected/rutinas/${plantilla.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {plantilla.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORIA_LABEL[plantilla.categoria]}
                      </Badge>
                    </TableCell>
                    <TableCell>{plantilla.contenido.length}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/protected/rutinas/${plantilla.id}`}>Editar</Link>
                      </Button>
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
