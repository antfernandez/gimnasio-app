"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [nombreGimnasio, setNombreGimnasio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected/alumnos`,
          data: {
            nombre_completo: nombreCompleto,
            nombre_gimnasio: nombreGimnasio,
          },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Ocurrió un error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <BrandMark className="mx-auto" />
      <Card>
        <CardContent className="pt-8">
          <h1 className="mb-1 text-center text-xl">Crear cuenta</h1>
          <p className="mb-7 text-center text-sm text-muted-foreground">
            Da de alta tu gimnasio en el sistema
          </p>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="nombre-gimnasio">Nombre del gimnasio</Label>
                <Input
                  id="nombre-gimnasio"
                  type="text"
                  placeholder="Ej. Gimnasio Fuerza Total"
                  required
                  value={nombreGimnasio}
                  onChange={(e) => setNombreGimnasio(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nombre-completo">Tu nombre</Label>
                <Input
                  id="nombre-completo"
                  type="text"
                  placeholder="Nombre y apellido"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.cl"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repite la contraseña</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? "Creando cuenta…" : "Crear mi cuenta"}
              </Button>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/auth/login"
                className="text-secondary-foreground underline underline-offset-4"
              >
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
