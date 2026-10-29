import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { guardarReceta } from "@/app/protected/nutricion/actions";
import { RecetaForm } from "@/components/nutricion/receta-form";
import { Card, CardContent } from "@/components/ui/card";
import type { Alimento, Ingrediente, Receta } from "@/lib/nutricion";
import { createClient } from "@/lib/supabase/server";

export default async function EditarRecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: receta }, { data: ingredientes }, { data: alimentos }] = await Promise.all([
    supabase.from("recetas").select("*").eq("id", id).maybeSingle(),
    supabase.from("receta_ingredientes").select("*").eq("receta_id", id).order("orden"),
    supabase.from("alimentos").select("*").order("nombre"),
  ]);
  if (!receta) notFound();
  const r = receta as Receta;

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
          <h3 className="mb-4 text-base">Editar “{r.nombre}”</h3>
          <RecetaForm
            action={guardarReceta.bind(null, r.id)}
            alimentos={(alimentos ?? []) as Alimento[]}
            receta={r}
            ingredientes={(ingredientes ?? []) as Ingrediente[]}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
