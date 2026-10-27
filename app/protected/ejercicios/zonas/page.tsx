import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ZonasManager } from "@/components/ejercicios/zonas-manager";
import { Card, CardContent } from "@/components/ui/card";
import { exigirDueno, fetchEjercicios, fetchZonas } from "@/lib/ejercicios";

export default async function ZonasPage() {
  await exigirDueno();
  const [zonas, ejercicios] = await Promise.all([fetchZonas(), fetchEjercicios()]);

  const cantidades: Record<string, number> = {};
  for (const e of ejercicios) cantidades[e.zona_id] = (cantidades[e.zona_id] ?? 0) + 1;

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
        <h2 className="text-2xl">Zonas del cuerpo</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ZonasManager zonas={zonas} cantidades={cantidades} />
        </CardContent>
      </Card>
    </div>
  );
}
