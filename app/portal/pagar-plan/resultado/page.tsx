import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";

// Retorno del checkout de Mercado Pago. Informa el estado real de la solicitud leído de
// la base (lo que confirma el webhook), no los parámetros de la URL.
export default async function ResultadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ external_reference?: string }>;
}) {
  const { external_reference: ref } = await searchParams;
  const alumno = await getAlumnoActual();
  if (!alumno) return null;

  const supabase = await createClient();
  const { data } = ref
    ? await supabase
        .from("solicitudes_pago")
        .select("estado")
        .eq("id", ref)
        .eq("alumno_id", alumno.id)
        .maybeSingle()
    : { data: null };

  const mensaje =
    data?.estado === "confirmado"
      ? { titulo: "Pago confirmado", detalle: "Tu plan quedó al día. ¡Gracias!" }
      : data?.estado === "rechazado"
        ? { titulo: "El pago fue rechazado", detalle: "Puedes intentarlo de nuevo." }
        : {
            titulo: "Estamos confirmando tu pago",
            detalle:
              "Mercado Pago aún no nos avisa. Cuando se confirme verás tu plan al día; puedes revisar el historial en unos minutos.",
          };

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-base font-semibold">{mensaje.titulo}</p>
        <p className="text-sm text-muted-foreground">{mensaje.detalle}</p>
        <Button asChild variant="outline">
          <Link href="/portal/pagar-plan">Volver a Pagar plan</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
