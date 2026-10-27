import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

// Retorno del checkout de Mercado Pago (suscripción). Muestra el estado real de la base.
export default async function ResultadoSuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ external_reference?: string }>;
}) {
  const { external_reference: ref } = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const supabase = await createClient();
  const { data } = ref
    ? await supabase
        .from("solicitudes_pago")
        .select("estado")
        .eq("id", ref)
        .eq("flujo", "suscripcion")
        .maybeSingle()
    : { data: null };

  const mensaje =
    data?.estado === "confirmado"
      ? { titulo: "Pago confirmado", detalle: "Tu suscripción quedó al día. ¡Gracias!" }
      : data?.estado === "rechazado"
        ? { titulo: "El pago fue rechazado", detalle: "Puedes intentarlo de nuevo." }
        : {
            titulo: "Estamos confirmando tu pago",
            detalle:
              "Mercado Pago aún no nos avisa. Revisa el historial en unos minutos.",
          };

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-base font-semibold">{mensaje.titulo}</p>
        <p className="text-sm text-muted-foreground">{mensaje.detalle}</p>
        <Button asChild variant="outline">
          <Link href="/protected/pagar-plan">Volver a Suscripción</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
