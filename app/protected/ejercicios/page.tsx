import { Plus, Shapes } from "lucide-react";
import Link from "next/link";

import { CargarCatalogoButton } from "@/components/ejercicios/cargar-catalogo-button";
import { ListadoEjercicios } from "@/components/ejercicios/listado-ejercicios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { exigirDueno, fetchEjercicios, fetchZonas } from "@/lib/ejercicios";

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ creado?: string; eliminado?: string }>;
}) {
  const params = await searchParams;
  await exigirDueno();

  const [zonas, ejercicios] = await Promise.all([fetchZonas(), fetchEjercicios()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Ejercicios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de ejercicios por zona del cuerpo. Las rutinas eligen sus
            ejercicios de aquí.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/protected/ejercicios/zonas">
              <Shapes className="h-4 w-4" />
              Zonas
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/protected/ejercicios/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo ejercicio
            </Link>
          </Button>
        </div>
      </div>

      {params.creado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Ejercicio creado correctamente.
        </div>
      )}
      {params.eliminado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Ejercicio eliminado. Las rutinas ya asignadas no cambian.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {ejercicios.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aún no tienes ejercicios en el catálogo.
              </p>
              <CargarCatalogoButton />
            </div>
          ) : (
            <ListadoEjercicios zonas={zonas} ejercicios={ejercicios} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
