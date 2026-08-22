import { CalendarCheck, ClipboardList, LineChart, Users } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

const funciones = [
  { icon: Users, label: "Alumnos", desc: "Ficha completa, siempre al día." },
  { icon: CalendarCheck, label: "Pagos", desc: "Quién está al día y quién no." },
  { icon: ClipboardList, label: "Rutinas", desc: "Asignadas y con historial." },
  { icon: LineChart, label: "Avances", desc: "Peso y medidas en el tiempo." },
];

export default function Home() {
  return (
    <div
      className="flex min-h-svh flex-col"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 70% 60% at 78% 15%, hsl(42 71% 74% / 0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 90%, hsl(42 71% 74% / 0.1), transparent 60%)",
      }}
    >
      <header className="flex items-center justify-between px-6 py-6 md:px-10">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/login">Ingresar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/sign-up">Crear cuenta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <div>
          <span className="mb-5 inline-block rounded-full border border-border bg-accent px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-secondary-foreground">
            Gestión para gimnasios pequeños
          </span>
          <h1 className="mb-5 text-3xl md:text-4xl">
            Deja el Excel. Gestiona tu gimnasio desde un solo lugar.
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Alumnos, pagos, rutinas y avances, accesibles desde cualquier
            navegador, con tus datos siempre respaldados.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/auth/sign-up">Crear mi gimnasio</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/login">Ya tengo cuenta</Link>
          </Button>
        </div>

        <div className="grid w-full grid-cols-2 gap-4 pt-6 md:grid-cols-4">
          {funciones.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-5 text-left shadow-[0_16px_40px_-24px_hsl(36_48%_25%/0.35)]"
            >
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-semibold text-foreground">
                {label}
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
