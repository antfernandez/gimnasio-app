import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { createPlan } from "@/app/protected/planes/actions";
import { PlanForm } from "@/components/planes/plan-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NuevoPlanPage() {
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
          Panel del dueño
        </div>
        <h2 className="text-2xl">Nuevo plan</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PlanForm action={createPlan} submitLabel="Crear plan" />
        </CardContent>
      </Card>
    </div>
  );
}
