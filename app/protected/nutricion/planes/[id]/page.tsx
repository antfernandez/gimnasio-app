import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { guardarPlanNutricional } from "@/app/protected/nutricion/actions";
import { PlanNutricionalForm } from "@/components/nutricion/plan-nutricional-form";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanNutricional } from "@/lib/nutricion";
import { cargarRecetasConMacros } from "@/lib/nutricion-server";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function EditarPlanNutricionalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const supabase = await createClient();
  const [{ data: plan }, { data: vinculos }] = await Promise.all([
    supabase.from("planes_nutricionales").select("*").eq("id", id).maybeSingle(),
    supabase.from("plan_nutricional_recetas").select("receta_id").eq("plan_id", id),
  ]);
  if (!plan) notFound();
  const p = plan as PlanNutricional;
  const seleccion = (vinculos ?? []).map((v) => v.receta_id as string);
  const recetas = await cargarRecetasConMacros(perfilData.perfil.gimnasio_id, seleccion);

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
          <h3 className="mb-4 text-base">Editar “{p.nombre}”</h3>
          <PlanNutricionalForm
            action={guardarPlanNutricional.bind(null, p.id)}
            recetas={recetas}
            plan={p}
            seleccion={seleccion}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
