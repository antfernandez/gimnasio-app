import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { guardarReceta } from "@/app/protected/nutricion/actions";
import { RecetaForm } from "@/components/nutricion/receta-form";
import { Card, CardContent } from "@/components/ui/card";
import type { Alimento } from "@/lib/nutricion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export default async function NuevaRecetaPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("alimentos").select("*").order("nombre");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/protected/nutricion/recetas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a recetas
      </Link>
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-base">Nueva receta</h3>
          <RecetaForm
            action={guardarReceta.bind(null, null)}
            alimentos={(data ?? []) as Alimento[]}
            gimnasioId={perfilData.perfil.gimnasio_id}
            submitLabel="Crear receta"
          />
        </CardContent>
      </Card>
    </div>
  );
}
