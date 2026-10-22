import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { crearEjercicio } from "@/app/protected/ejercicios/actions";
import { EjercicioForm } from "@/components/ejercicios/ejercicio-form";
import { Card, CardContent } from "@/components/ui/card";
import { exigirDueno, fetchZonas } from "@/lib/ejercicios";

export default async function NuevoEjercicioPage({
  searchParams,
}: {
  searchParams: Promise<{ zona?: string }>;
}) {
  const { zona } = await searchParams;
  await exigirDueno();
  const zonas = await fetchZonas();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/ejercicios"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a ejercicios
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Nuevo ejercicio</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <EjercicioForm
            action={crearEjercicio}
            zonas={zonas}
            zonaInicial={zonas.some((z) => z.id === zona) ? zona : undefined}
            submitLabel="Crear ejercicio"
          />
        </CardContent>
      </Card>
    </div>
  );
}
