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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/protected/alumnos");
      router.refresh();
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
          <h1 className="mb-1 text-center text-xl">Iniciar sesión</h1>
          <p className="mb-7 text-center text-sm text-muted-foreground">
            Panel del dueño/entrenador
          </p>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-5">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? "Ingresando…" : "Ingresar"}
              </Button>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Aún no tienes cuenta de gimnasio?{" "}
              <Link
                href="/auth/sign-up"
                className="text-secondary-foreground underline underline-offset-4"
              >
                Regístrate aquí
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
