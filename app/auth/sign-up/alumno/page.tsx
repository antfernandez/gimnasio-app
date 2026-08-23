import { Sparkles } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <BrandMark className="mx-auto" />
      <Card>
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <CardTitle>Registro de alumno, muy pronto</CardTitle>
          <CardDescription>
            Estamos construyendo el portal para que ingreses con el código de
            tu gimnasio y veas tu rutina y tus avances.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-center text-sm text-muted-foreground">
            Mientras tanto, pídele a tu entrenador que registre tu rutina y
            avances directamente en el sistema.
          </p>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/auth/sign-up">Volver</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
