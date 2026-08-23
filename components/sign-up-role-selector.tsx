import { ArrowRight, Dumbbell, UserRound } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent } from "@/components/ui/card";

const roles = [
  {
    href: "/auth/sign-up/dueno",
    icon: Dumbbell,
    titulo: "Soy dueño/a de un gimnasio",
    desc: "Da de alta tu gimnasio y gestiona alumnos, pagos, rutinas y avances.",
  },
  {
    href: "/auth/sign-up/alumno",
    icon: UserRound,
    titulo: "Soy alumno de un gimnasio",
    desc: "Ingresa a tu portal para ver tu rutina y tus avances.",
  },
];

export function SignUpRoleSelector({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={className} {...props}>
      <BrandMark className="mx-auto" />
      <div className="mt-6 flex flex-col gap-4">
        <div className="text-center">
          <h1 className="mb-1 text-xl">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">
            ¿Cómo quieres usar el sistema?
          </p>
        </div>
        {roles.map(({ href, icon: Icon, titulo, desc }) => (
          <Link key={href} href={href}>
            <Card className="group cursor-pointer transition-colors hover:border-primary">
              <CardContent className="flex items-center gap-4 pt-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h3 className="font-sans text-base font-bold normal-case tracking-normal text-foreground">
                    {titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
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
    </div>
  );
}
