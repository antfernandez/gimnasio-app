import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePlan } from "@/app/protected/planes/actions";
import { PlanForm } from "@/components/planes/plan-form";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";

export default async function EditarPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("planes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!plan) notFound();
  const p = plan as Plan;
  const updatePlanConId = updatePlan.bind(null, p.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/planes"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a planes
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Editar plan
        </div>
        <h2 className="text-2xl">{p.nombre}</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PlanForm action={updatePlanConId} plan={p} submitLabel="Guardar cambios" />
        </CardContent>
      </Card>
    </div>
  );
}
