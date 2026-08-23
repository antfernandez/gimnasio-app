import {
  CalendarCheck,
  Check,
  ClipboardList,
  LineChart,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#beneficios", label: "Beneficios" },
  { href: "#planes", label: "Planes" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#contacto", label: "Contacto" },
];

const funciones = [
  {
    icon: Users,
    label: "Alumnos",
    desc: "Ficha completa de cada alumno, siempre al día y a mano.",
  },
  {
    icon: CalendarCheck,
    label: "Pagos",
    desc: "Quién está al día y quién atrasado, con historial completo.",
  },
  {
    icon: ClipboardList,
    label: "Rutinas",
    desc: "Asignadas por ti, con historial de versiones anteriores.",
  },
  {
    icon: LineChart,
    label: "Avances",
    desc: "Peso y medidas registrados en el tiempo, listos para mostrar.",
  },
];

const planes = [
  {
    nombre: "Prueba",
    desc: "Para conocer el sistema sin compromiso.",
    precio: "0",
    periodo: "/ 30 días",
    destacado: false,
    features: [
      "Todas las funciones del plan Inicial",
      "Sin tarjeta de crédito",
      "Migra tus datos cuando quieras",
    ],
  },
  {
    nombre: "Inicial",
    desc: "El plan del MVP, para partir hoy mismo.",
    precio: "14.990",
    periodo: "+ IVA / mes",
    destacado: true,
    features: [
      "Hasta 80 alumnos",
      "Alumnos, pagos, rutinas y avances",
      "Dashboard con estado de pagos",
      "Sin permanencia mínima",
    ],
  },
  {
    nombre: "Crecimiento",
    desc: "Para cuando tu gimnasio ya no quiere límites.",
    precio: "24.990",
    periodo: "+ IVA / mes",
    destacado: false,
    features: [
      "Alumnos ilimitados",
      "Recordatorios automáticos de pago",
      "Portal de acceso para tus alumnos",
      "Todo lo del plan Inicial",
    ],
  },
];

// Testimonio placeholder del piloto — reemplazar por uno real apenas se recolecte
// (ver sprint-4-diseno-template.md).
const testimonios = [
  {
    texto:
      "Dejamos el Excel la primera semana. Ahora sé en dos minutos quién me debe el mes y quién no.",
    autor: "Gimnasio piloto Valinor",
    rol: "Dueño/entrenador",
  },
  {
    texto:
      "Las rutinas quedan con historial, así que no vuelvo a perder lo que le asigné a cada alumno el mes pasado.",
    autor: "Gimnasio piloto Valinor",
    rol: "Dueño/entrenador",
  },
];

export default function Home() {
  return (
    <div className="min-h-svh">
      {/* NAVBAR */}
      <div className="fixed inset-x-4 top-4 z-50 flex justify-center">
        <nav className="flex w-full max-w-5xl items-center justify-between rounded-full border border-border bg-card/80 px-5 py-3 shadow-lg backdrop-blur-md">
          <BrandMark />
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/auth/login">Ingresar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up/dueno">Crear mi gimnasio</Link>
            </Button>
            <details className="relative md:hidden">
              <summary className="flex h-9 w-9 list-none items-center justify-center rounded-full border border-border text-foreground [&::-webkit-details-marker]:hidden">
                <Menu className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 top-12 flex w-52 flex-col gap-1 rounded-2xl border border-border bg-card p-3 shadow-lg">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </details>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <section
        id="inicio"
        className="relative overflow-hidden pb-20 pt-40 md:pb-28 md:pt-48"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 45% at 82% 8%, hsl(var(--primary)/0.20), transparent 60%), radial-gradient(ellipse 45% 40% at 5% 90%, hsl(var(--highlight)/0.10), transparent 60%)",
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-9 px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Gestión para gimnasios pequeños
          </span>
          <h1 className="text-4xl md:text-6xl">
            Deja el Excel.
            <br />
            Gestiona tu gimnasio <span className="text-primary">distinto</span>.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            Alumnos, pagos, rutinas y avances, accesibles desde cualquier
            navegador, con tus datos siempre respaldados.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/auth/sign-up/dueno">Crear mi gimnasio</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Ya tengo cuenta</Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-8 pt-4">
            <div className="text-center">
              <div className="font-display text-3xl text-highlight md:text-4xl">
                30 días
              </div>
              <div className="text-xs text-muted-foreground">
                de prueba gratis
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-highlight md:text-4xl">
                80
              </div>
              <div className="text-xs text-muted-foreground">
                alumnos en el plan Inicial
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-highlight md:text-4xl">
                0
              </div>
              <div className="text-xs text-muted-foreground">
                permanencia mínima
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Por qué Valinor
            </span>
            <h2 className="mb-3 text-3xl md:text-4xl">
              Todo lo que tu gimnasio necesita
            </h2>
            <p className="text-muted-foreground">
              Cuatro funciones esenciales, sin curva de aprendizaje, listas
              desde el primer día.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {funciones.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card p-6 transition-transform hover:-translate-y-1"
              >
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mb-1.5 font-sans text-base font-bold normal-case tracking-normal text-foreground">
                  {label}
                </h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANES Y PRECIOS */}
      <section id="planes" className="bg-card/40 py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Planes y precios
            </span>
            <h2 className="mb-3 text-3xl md:text-4xl">
              Un plan para cada etapa
            </h2>
            <p className="text-muted-foreground">
              Suscripción mensual por gimnasio, sin contrato de permanencia.
              Cancela cuando quieras.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {planes.map((plan) => (
              <div
                key={plan.nombre}
                className={
                  plan.destacado
                    ? "relative flex flex-col rounded-2xl border border-primary bg-gradient-to-b from-accent to-card p-8 shadow-[0_24px_60px_-20px_hsl(var(--primary)/0.35)] md:scale-105"
                    : "relative flex flex-col rounded-2xl border border-border bg-card p-8"
                }
              >
                {plan.destacado && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                    Más elegido
                  </span>
                )}
                <h3 className="mb-1 font-sans text-lg font-bold normal-case tracking-normal text-foreground">
                  {plan.nombre}
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  {plan.desc}
                </p>
                <div className="mb-7 flex items-baseline gap-1.5">
                  <span className="text-lg text-muted-foreground">$</span>
                  <span className="font-display text-5xl">{plan.precio}</span>
                  <span className="text-sm text-muted-foreground">
                    {plan.periodo}
                  </span>
                </div>
                <ul className="mb-8 flex flex-1 flex-col gap-3">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2.5 text-sm text-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-highlight" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={plan.destacado ? "default" : "outline"}
                  className="w-full"
                >
                  <Link href="/auth/sign-up/dueno">Elegir {plan.nombre}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section id="testimonios" className="py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Testimonios
            </span>
            <h2 className="text-3xl md:text-4xl">Lo que dice el piloto</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {testimonios.map((t) => (
              <div
                key={t.texto}
                className="rounded-2xl border border-border bg-card p-7"
              >
                <div className="mb-4 flex gap-1 text-highlight">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mb-5 text-sm text-foreground">
                  &ldquo;{t.texto}&rdquo;
                </p>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {t.autor}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.rol}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTAL: INGRESO Y REGISTRO — el panel del Dueño (alumnos, pagos, rutinas,
          avances) ya está disponible; el portal del Alumno llega en el Sprint 6, por
          eso su CTA enlaza a una pantalla "muy pronto" en vez de un formulario. */}
      <section id="portal" className="bg-card/40 py-20 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-2 md:items-center">
          <div>
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Portal del dueño
            </span>
            <h2 className="mb-4 text-3xl md:text-4xl">
              Tu gimnasio, a un clic
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Entra a tu panel para ver alumnos, pagos, rutinas y avances, o
              crea la cuenta de tu gimnasio en menos de un minuto.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Estado de pagos de todos tus alumnos, al instante",
                "Rutinas asignadas, con historial completo",
                "Avances de cada alumno, listos para mostrar",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 shrink-0 text-highlight" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
            <h3 className="mb-1 font-sans text-lg font-bold normal-case tracking-normal text-foreground">
              Accede a tu panel
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              ¿Eres el dueño/entrenador de un gimnasio, o uno de sus alumnos?
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link href="/auth/sign-up/dueno">Crear mi cuenta de gimnasio</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/auth/login">Ya tengo cuenta, iniciar sesión</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="w-full">
                <Link href="/auth/sign-up/alumno">
                  Soy alumno, quiero registrarme
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent to-card p-10 text-center md:p-14">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 60% 100% at 90% 50%, hsl(var(--primary)/0.25), transparent 70%)",
              }}
            />
            <div className="relative">
              <h2 className="mx-auto mb-7 max-w-lg text-2xl md:text-3xl">
                ¿Listo para dejar el Excel?
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="highlight">
                  <Link href="/auth/sign-up/dueno">Empieza gratis por 30 días</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#contacto">Hablar con nosotros</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="bg-card/40 py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Contacto
          </span>
          <h2 className="mb-3 text-3xl md:text-4xl">Conversemos</h2>
          <p className="mb-10 text-muted-foreground">
            Escríbenos y te ayudamos a dejar tu gimnasio operando sin Excel.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <Mail className="mx-auto mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-semibold text-foreground">
                Correo
              </div>
              <a
                href="mailto:hola@valinor.cl"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                hola@valinor.cl
              </a>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <MessageCircle className="mx-auto mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-semibold text-foreground">
                WhatsApp
              </div>
              <span className="text-sm text-muted-foreground">
                Escríbenos por Whatsapp
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <Phone className="mx-auto mb-3 h-5 w-5 text-primary" />
              <div className="mb-1 text-sm font-semibold text-foreground">
                Horario
              </div>
              <span className="text-sm text-muted-foreground">
                Lun a Vie, 9:00–18:00
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <BrandMark />
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                Gestión simple para gimnasios y estudios de pilates pequeños:
                alumnos, pagos, rutinas y avances en un solo lugar.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Navegación
              </h4>
              <ul className="flex flex-col gap-2.5">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Portal
              </h4>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link
                    href="/auth/login"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/sign-up/dueno"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Crear mi gimnasio
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/sign-up/alumno"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Soy alumno
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>© 2026 Valinor Estudio. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
