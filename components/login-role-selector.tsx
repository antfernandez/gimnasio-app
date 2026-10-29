import { ArrowRight, Dumbbell, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const roles = [
  {
    href: "/auth/login/dueno",
    icon: Dumbbell,
    titulo: "Soy dueño/a",
    desc: "Panel de administración de Valinor Estudio.",
  },
  {
    href: "/auth/login/alumno",
    icon: UserRound,
    titulo: "Soy alumno",
    desc: "Portal de turnos, rutina y avances.",
  },
];

// Selección manual del tipo de acceso al ingresar (Parte B del Sprint 12). El
// Superadmin es un tercer camino separado y deliberadamente menos protagónico
// (no se autoregistra, ver Parte C) — mismo formulario de login, solo un enlace
// discreto abajo en vez de una tarjeta igual de grande que Dueño/Alumno.
export function LoginRoleSelector({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col sm:-mx-8", className)} {...props}>
      <BrandMark grande className="mx-auto" />
      <div className="mt-7 flex flex-col gap-4">
        <div className="text-center">
          <h1 className="mb-1.5 text-[1.375rem]">Iniciar sesión</h1>
          <p className="text-[0.95rem] text-muted-foreground">
            ¿Cómo quieres ingresar?
          </p>
        </div>
        {roles.map(({ href, icon: Icon, titulo, desc }) => (
          <Link key={href} href={href}>
            <Card className="group cursor-pointer transition-colors hover:border-primary">
              <CardContent className="flex items-center gap-4 px-5 py-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h3 className="font-sans text-[1.05rem] font-bold normal-case tracking-normal text-foreground">
                    {titulo}
                  </h3>
                  <p className="text-[0.95rem] text-muted-foreground">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-[0.95rem] text-muted-foreground">
        <Link
          href="/auth/login/superadmin"
          className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-primary"
        >
          <ShieldCheck className="h-4 w-4" />
          Acceso Superadmin
        </Link>
      </p>
    </div>
  );
}
