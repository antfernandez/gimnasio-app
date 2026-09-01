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

export type TipoAcceso = "dueno" | "alumno" | "superadmin";

const COPY: Record<
  TipoAcceso,
  { titulo: string; subtitulo: string; destino: string; errorTipo: string }
> = {
  dueno: {
    titulo: "Iniciar sesión",
    subtitulo: "Panel del dueño/a de Valinor",
    destino: "/protected",
    errorTipo: "una cuenta de dueño/a",
  },
  alumno: {
    titulo: "Iniciar sesión",
    subtitulo: "Portal del alumno",
    destino: "/portal",
    errorTipo: "una cuenta de alumno",
  },
  superadmin: {
    titulo: "Acceso Superadmin",
    subtitulo: "Administración de cuentas de Valinor",
    destino: "/superadmin",
    errorTipo: "una cuenta de superadmin",
  },
};

/**
 * Verifica, DESPUÉS de autenticar, que la cuenta realmente es del tipo elegido en
 * el selector (Parte B del Sprint 12). El superadmin se confirma contra su tabla
 * real (`superadmins`, nunca lazy — se inserta a mano). Dueño y alumno NO se
 * pueden confirmar así: su fila en `perfiles`/`alumnos` recién se crea la primera
 * vez que caen en su layout de destino (`ensureGymProfile`/`ensureAlumnoLink`,
 * alta lazy) — en el primer login de una cuenta nueva esa fila todavía no existe,
 * así que se confirman por `user_metadata.rol` (lo mismo que ya usaban
 * `login-form.tsx`/`update-password-form.tsx` antes de este sprint), descartando
 * además que sea la cuenta del superadmin (que tampoco tiene ese metadata).
 */
async function verificarTipo(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  metadata: Record<string, unknown>,
  tipo: TipoAcceso,
): Promise<boolean> {
  if (tipo === "superadmin") {
    const { data } = await supabase
      .from("superadmins")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    return !!data;
  }

  const esAlumno = metadata?.rol === "alumno";
  if (tipo === "alumno") return esAlumno;

  // tipo === "dueno"
  const { data: superadmin } = await supabase
    .from("superadmins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return !esAlumno && !superadmin;
}

export function LoginForm({
  tipo,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { tipo: TipoAcceso }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const copy = COPY[tipo];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("No se pudo iniciar sesión");

      const esDelTipo = await verificarTipo(
        supabase,
        data.user.id,
        data.user.user_metadata ?? {},
        tipo,
      );
      if (!esDelTipo) {
        await supabase.auth.signOut();
        setError(`Estas credenciales no corresponden a ${copy.errorTipo}.`);
        return;
      }

      router.push(copy.destino);
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
          <h1 className="mb-1 text-center text-xl">{copy.titulo}</h1>
          <p className="mb-7 text-center text-sm text-muted-foreground">
            {copy.subtitulo}
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
            {tipo === "alumno" && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                ¿Aún no tienes cuenta?{" "}
                <Link
                  href="/auth/sign-up/alumno"
                  className="text-secondary-foreground underline underline-offset-4"
                >
                  Regístrate aquí
                </Link>
              </p>
            )}
            {tipo === "dueno" && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Las cuentas de dueño/a las crea el equipo de Valinor.
              </p>
            )}
            <p className="mt-3 text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="underline underline-offset-4 hover:text-primary"
              >
                Elegir otro tipo de acceso
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
