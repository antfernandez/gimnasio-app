import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CambiarPrecioForm, EditarPlanForm } from "@/components/superadmin/plan-forms";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha, formatMonto } from "@/lib/format";
import { precioMensualConIva, type FuncionSistema } from "@/lib/planes-sistema";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

export const instant = false;

export default async function EditarPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const { data: plan } = await createAdminClient()
    .from("planes_sistema")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!plan) notFound();

  const funciones = ((plan.caracteristicas ?? []) as FuncionSistema[])
    .map((f) => (f.detalle ? `${f.titulo}: ${f.detalle}` : f.titulo))
    .join("\n");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/superadmin/planes" className="text-xs text-muted-foreground hover:underline">
          ← Planes
        </Link>
        <h2 className="text-2xl">{plan.nombre}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMonto(Number(plan.precio_mensual))} neto ·{" "}
          {formatMonto(precioMensualConIva(Number(plan.precio_mensual), Number(plan.iva_pct)))} con
          IVA · desde {formatFecha(plan.vigente_desde)}
          {plan.vigente_hasta && ` hasta ${formatFecha(plan.vigente_hasta)}`}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Datos del plan
          </h3>
          <EditarPlanForm
            plan={{
              id: plan.id,
              nombre: plan.nombre,
              maxAlumnos: plan.max_alumnos,
              descripcion: plan.descripcion,
              funciones,
              orden: plan.orden,
              activo: plan.activo,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cambiar precio
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Crea una vigencia nueva y cierra la actual el día anterior; lo ya cobrado conserva su
            monto.
          </p>
          <CambiarPrecioForm
            planId={plan.id}
            precioNeto={Number(plan.precio_mensual)}
            ivaPct={Number(plan.iva_pct)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
