import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { guardarPlanNutricional } from "@/app/protected/nutricion/actions";
import { PlanNutricionalForm } from "@/components/nutricion/plan-nutricional-form";
import { Card, CardContent } from "@/components/ui/card";
import { cargarRecetasConMacros } from "@/lib/nutricion-server";
import { getPerfilActual } from "@/lib/perfil";

export default async function NuevoPlanNutricionalPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;
  const recetas = await cargarRecetasConMacros(perfilData.perfil.gimnasio_id);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/protected/nutricion/planes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a planes
      </Link>
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-base">Nuevo plan nutricional</h3>
          <PlanNutricionalForm
            action={guardarPlanNutricional.bind(null, null)}
            recetas={recetas}
            submitLabel="Crear plan"
          />
        </CardContent>
      </Card>
    </div>
  );
}
