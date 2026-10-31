import { CreditCard } from "lucide-react";
import { notFound } from "next/navigation";

import { resolverPagoMpPrueba } from "@/app/protected/pagar-plan/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonto } from "@/lib/format";
import { mpModoPrueba } from "@/lib/mercadopago";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

// Checkout FALSO de Mercado Pago (spec 54): datos ficticios, no se cobra nada.
export default async function MpPruebaPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  if (!mpModoPrueba()) notFound();
  const { ref } = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData || !ref) notFound();

  const supabase = await createClient();
  const { data: solicitud } = await supabase
    .from("solicitudes_pago")
    .select("id, monto, meses, estado")
    .eq("id", ref)
    .eq("flujo", "suscripcion")
    .eq("metodo", "mercado_pago")
    .maybeSingle();
  if (!solicitud || solicitud.estado !== "pendiente") notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="size-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Mercado Pago · modo de prueba (datos falsos)
          </p>
          <div>
            <div className="text-sm text-muted-foreground">
              Suscripción · {solicitud.meses} {solicitud.meses === 1 ? "mes" : "meses"}
            </div>
            <div className="text-3xl font-bold text-primary">{formatMonto(Number(solicitud.monto))}</div>
          </div>
          <dl className="rounded-[9px] bg-secondary p-3 text-left text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-muted-foreground">Tarjeta</dt>
              <dd>4509 9535 6623 3704</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-muted-foreground">Titular</dt>
              <dd>APRO TEST</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-muted-foreground">Vence / CVV</dt>
              <dd>11/30 · 123</dd>
            </div>
          </dl>
          <form action={resolverPagoMpPrueba.bind(null, solicitud.id, true)}>
            <Button type="submit" className="w-full">
              Pagar (simulado)
            </Button>
          </form>
          <form action={resolverPagoMpPrueba.bind(null, solicitud.id, false)}>
            <Button type="submit" variant="outline" className="w-full">
              Rechazar pago (simulado)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
