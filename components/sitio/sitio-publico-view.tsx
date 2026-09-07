"use client";

import {
  Dumbbell,
  Flame,
  HeartPulse,
  Instagram,
  MapPin,
  Phone,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { Carrusel } from "@/components/sitio/carrusel";
import { Reveal } from "@/components/sitio/reveal";
import type {
  ContenidoSitio,
  ItemGaleria,
  ItemPorQueElegirnos,
  ItemServicio,
  ItemTarifa,
  TemaSitio,
} from "@/lib/sitio";
import { temaCssVars } from "@/lib/sitio";
import { cn } from "@/lib/utils";

/** `app/globals.css` fuerza `h1,h2,h3,h4` a la fuente display + color de marca fijo de
 * Valinor (`@layer base`, pensado para el chrome de la app) — sin este reset explícito
 * esos estilos se filtran a cualquier heading de acá, incluido el color, que no sigue el
 * acento/tema del tenant. Sprint 21 Parte A: en vez de escapar a `font-sans` (como antes
 * de este sprint) ahora sí queremos Cinzel en los headings — el reset pasa a fijar el
 * color/peso/tracking del template (`--sitio-ink-gold`, semibold, letter-spacing) sin
 * heredar `text-secondary-foreground` ni el `font-display` sin pisar del layout base. */
const TITULO = "font-display font-semibold tracking-[0.02em] text-[var(--sitio-ink-gold)]";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-[.82rem] tracking-[.04em] transition-all duration-200";
const BTN_GHOST = `${BTN_BASE} border border-[var(--sitio-line)] text-[var(--sitio-ink-gold)] hover:border-[var(--sitio-accent)] hover:bg-[var(--sitio-accent)]/10`;
const BTN_SOLID = `${BTN_BASE} border-0 font-semibold text-[var(--sitio-accent-ink)] bg-[linear-gradient(135deg,var(--sitio-gold-light),var(--sitio-accent)_55%,var(--sitio-gold-deep))] hover:brightness-110 hover:-translate-y-px`;
const BTN_LG = "px-7 py-3.5 text-[.9rem]";

const ICONOS_PROGRAMA = [Dumbbell, Flame, HeartPulse, Trophy, Sparkles, Users];

function waHref(numero: string, texto?: string) {
  return numero
    ? `https://wa.me/${numero.replace(/[^0-9]/g, "")}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`
    : undefined;
}

/** Cabecera fija (`.scrolled` del template) al hacer scroll > 30px — Sprint 21 Parte B. */
function useScrolled(umbralPx: number) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > umbralPx);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [umbralPx]);
  return scrolled;
}

function Divider() {
  return (
    <div
      className="mx-auto h-px max-w-[1180px]"
      style={{
        background:
          "linear-gradient(90deg, transparent, var(--sitio-line) 20%, var(--sitio-accent) 50%, var(--sitio-line) 80%, transparent)",
      }}
    />
  );
}

function SectionHead({ eyebrow, titulo, texto }: { eyebrow: string; titulo: string; texto?: string }) {
  return (
    <div className="mx-auto mb-14 max-w-[640px] text-center">
      <div className="mb-3.5 inline-flex items-center justify-center gap-2.5 text-[.72rem] uppercase tracking-[.28em] text-[var(--sitio-muted)]">
        {eyebrow}
        <span className="h-px w-[26px] shrink-0 bg-[var(--sitio-accent)]" />
      </div>
      <h2 className={cn("mb-3.5 text-[clamp(1.7rem,3.4vw,2.4rem)]", TITULO)}>{titulo}</h2>
      {texto && <p className="text-[.98rem] text-[var(--sitio-muted)]">{texto}</p>}
    </div>
  );
}

function ProgramaCard({ item, index }: { item: ItemServicio; index: number }) {
  const Icono = ICONOS_PROGRAMA[index % ICONOS_PROGRAMA.length];
  return (
    <div
      className="h-full rounded-[var(--sitio-radius)] border border-[var(--sitio-line)] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--sitio-accent)] hover:shadow-[var(--sitio-shadow)]"
      style={{ background: "linear-gradient(160deg, var(--sitio-card), var(--sitio-card-2))" }}
    >
      <div className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[var(--sitio-line)] bg-[var(--sitio-accent)]/10">
        <Icono className="h-5 w-5" style={{ color: "var(--sitio-accent)" }} />
      </div>
      <h3 className={cn("mb-2.5 text-[1.05rem]", TITULO)}>{item.nombre}</h3>
      <p className="text-[.86rem] leading-[1.6] text-[var(--sitio-muted)]">{item.descripcion}</p>
    </div>
  );
}

function PlanCard({ tarifa, whatsapp }: { tarifa: ItemTarifa; whatsapp: string }) {
  const lineas = tarifa.descripcion
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const comoLista = lineas.length > 1;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[var(--sitio-radius)] border p-9 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--sitio-shadow)]",
        tarifa.destacado
          ? "border-[var(--sitio-accent)] shadow-[0_0_0_1px_var(--sitio-accent)]"
          : "border-[var(--sitio-line)] bg-[var(--sitio-card)] hover:border-[var(--sitio-accent)]",
      )}
      style={
        tarifa.destacado
          ? { background: "linear-gradient(165deg, var(--sitio-card-2), var(--sitio-card))" }
          : undefined
      }
    >
      {tarifa.destacado && (
        <span
          className="absolute -top-3.5 right-6 rounded-full px-3.5 py-1.5 text-[.66rem] font-bold uppercase tracking-[.08em] text-[var(--sitio-accent-ink)]"
          style={{ background: "linear-gradient(135deg, var(--sitio-gold-light), var(--sitio-gold-deep))" }}
        >
          Más elegido
        </span>
      )}
      <div className="mb-2.5 text-[.78rem] uppercase tracking-[.16em] text-[var(--sitio-muted)]">
        {tarifa.plan}
      </div>
      <div className={cn("mb-0.5 text-[2.1rem]", TITULO)}>{tarifa.precio}</div>
      {!comoLista && lineas[0] && (
        <p className="mb-6 text-[.82rem] text-[var(--sitio-muted)]">{lineas[0]}</p>
      )}
      {comoLista ? (
        <ul className="mb-7 flex-1">
          {lineas.map((linea, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 border-t border-[var(--sitio-line)] py-2 text-[.86rem] text-[var(--sitio-text)] first:border-t-0"
            >
              <span className="font-bold" style={{ color: "var(--sitio-accent)" }}>
                ✓
              </span>
              {linea}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-7 flex-1" />
      )}
      {whatsapp && (
        <a
          href={waHref(whatsapp, `Hola, quiero más información sobre el ${tarifa.plan}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(tarifa.destacado ? BTN_SOLID : BTN_GHOST, "w-full")}
        >
          Elegir plan
        </a>
      )}
    </div>
  );
}

function WhyCard({ item, index }: { item: ItemPorQueElegirnos; index: number }) {
  return (
    <div className="rounded-[var(--sitio-radius)] border border-transparent p-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--sitio-accent)] hover:shadow-[var(--sitio-shadow)]">
      <span className={cn("mb-4 block text-[.75rem] tracking-[.1em]", TITULO)}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3 className={cn("mb-3 text-[1.1rem]", TITULO)}>{item.titulo}</h3>
      <p className="text-[.88rem] leading-[1.7] text-[var(--sitio-muted)]">{item.texto}</p>
    </div>
  );
}

function GallerySlide({ item }: { item: ItemGaleria }) {
  return (
    <div className="group relative h-[320px] w-[260px] overflow-hidden rounded-[var(--sitio-radius)] border border-[var(--sitio-line)] shadow-[var(--sitio-shadow)] min-[981px]:h-[400px] min-[981px]:w-[320px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- host de Supabase Storage no está allowlisteado para next/image */}
      <img
        src={item.url}
        alt={item.caption || ""}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
      />
      {item.caption && (
        <span
          className="absolute inset-x-0 bottom-0 px-[18px] pb-4 pt-5 font-display text-[.85rem] tracking-[.03em] text-[#f8f0e5]"
          style={{ background: "linear-gradient(0deg, rgba(26,19,5,.78), transparent)" }}
        >
          {item.caption}
        </span>
      )}
    </div>
  );
}

/**
 * Render puro del sitio público de un tenant, a partir de un `ContenidoSitio` — usado
 * tanto por la ruta pública (`app/g/[slug]/page.tsx`, con `contenido_publicado`) como
 * por la vista previa del dueño (`app/vista-previa-sitio/page.tsx`, con
 * `contenido_borrador`). Los colores vienen de variables CSS (`temaCssVars`, lib/sitio.ts)
 * aplicadas en el contenedor raíz — nunca de los tokens de `app/globals.css`, que son
 * la marca fija de Valinor Estudio como SaaS, no del gimnasio.
 *
 * Sprint 21: adopta la estructura/componentes/animaciones de
 * `.claude/templates/valinor-sistema-web-claro-v2.html`. Es "use client" porque el
 * header con scroll dinámico, el `.reveal` por `IntersectionObserver` y los carruseles
 * automáticos son todos comportamiento de cliente — no hay datos que solo puedan
 * resolverse en servidor acá, así que convertir el árbol completo en Client Component
 * es más simple que aislar cada bit interactivo.
 */
export function SitioPublicoView({
  nombreGimnasio,
  tema,
  colorAcento,
  contenido,
}: {
  nombreGimnasio: string;
  tema: TemaSitio;
  colorAcento: string;
  contenido: ContenidoSitio;
}) {
  const c = contenido;
  const scrolled = useScrolled(30);
  const whatsapp = c.contacto.whatsapp;

  const navLinks = [
    c.servicios.length > 0 && { href: "#programas", label: "Programas" },
    c.tarifas.length > 0 && { href: "#planes", label: "Planes" },
    (c.sobre_nosotros || c.por_que_elegirnos.length > 0) && { href: "#nosotros", label: "Nosotros" },
    { href: "#contacto", label: "Contacto" },
  ].filter((l): l is { href: string; label: string } => Boolean(l));

  // Foto ancha de la sección "Nosotros" (`.section-photo-wrap` del template): el CMS no
  // tiene un campo de foto dedicado a esta sección (Sprint 21 no lo agrega), así que se
  // reutiliza la primera foto de la galería del dueño si existe — degrada con gracia
  // (sin foto) cuando el gimnasio todavía no subió ninguna.
  const fotoNosotros = c.galeria[0]?.url ?? null;

  const seccionPrograms = c.servicios.length > 0 && (
    <section id="programas" className="scroll-mt-20 px-6 py-16 min-[981px]:py-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <SectionHead
            eyebrow="Nuestros programas"
            titulo="Servicios y programas"
            texto="Entrena con un plan pensado para cada objetivo, con seguimiento real de tu progreso."
          />
        </Reveal>
        <Reveal>
          <Carrusel
            items={c.servicios}
            intervalMs={4500}
            itemClassName="w-[290px]"
            renderItem={(item, i) => <ProgramaCard item={item} index={i} />}
          />
        </Reveal>
      </div>
    </section>
  );

  const seccionPlanes = c.tarifas.length > 0 && (
    <section id="planes" className="scroll-mt-20 px-6 py-16 min-[981px]:py-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <SectionHead
            eyebrow="Planes y precios"
            titulo="Elige tu forma de entrenar"
            texto="Encuentra el plan ideal para tus objetivos."
          />
        </Reveal>
        <Reveal>
          <div className="grid grid-cols-1 gap-6 min-[981px]:grid-cols-3">
            {c.tarifas.map((t, i) => (
              <PlanCard key={i} tarifa={t} whatsapp={whatsapp} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );

  const seccionNosotros = (c.sobre_nosotros || c.por_que_elegirnos.length > 0) && (
    <section id="nosotros" className="scroll-mt-20 px-6 py-16 min-[981px]:py-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <SectionHead eyebrow="Por qué elegirnos" titulo="Sobre nosotros" />
        </Reveal>
        {fotoNosotros && (
          <Reveal className="relative mb-[52px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen subida por el dueño */}
            <img
              src={fotoNosotros}
              alt=""
              className="max-h-[380px] w-full rounded-[var(--sitio-radius)] border object-cover"
              style={{
                borderColor: "var(--sitio-gold-light)",
                boxShadow: "var(--sitio-shadow)",
                filter: "sepia(.3) saturate(1.25) brightness(.96) contrast(1.04)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-[var(--sitio-radius)] mix-blend-multiply"
              style={{
                background:
                  "linear-gradient(160deg, rgba(201,162,77,.32), rgba(58,53,39,.1) 45%, rgba(169,124,60,.4))",
              }}
            />
          </Reveal>
        )}
        {c.sobre_nosotros && (
          <Reveal className="mx-auto mb-[52px] max-w-3xl text-center">
            <p className="whitespace-pre-line text-[var(--sitio-muted)]">{c.sobre_nosotros}</p>
          </Reveal>
        )}
        {c.por_que_elegirnos.length > 0 && (
          <Reveal>
            <div className="grid grid-cols-1 gap-[26px] min-[981px]:grid-cols-3">
              {c.por_que_elegirnos.map((item, i) => (
                <WhyCard key={i} item={item} index={i} />
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );

  const seccionGaleria = c.galeria.length > 0 && (
    <section id="galeria" className="scroll-mt-20 px-6 py-16 min-[981px]:py-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <SectionHead
            eyebrow="Nuestra comunidad"
            titulo="Galería"
            texto="Así se vive una sesión de entrenamiento acá."
          />
        </Reveal>
        <Reveal>
          <Carrusel items={c.galeria} intervalMs={5200} renderItem={(item) => <GallerySlide item={item} />} />
        </Reveal>
      </div>
    </section>
  );

  const seccionHorarios = c.horarios.length > 0 && (
    <section id="horarios" className="scroll-mt-20 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <h2 className={cn("mb-8 text-center text-2xl", TITULO)}>Horarios</h2>
          <div className="overflow-hidden rounded-[var(--sitio-radius)] border border-[var(--sitio-line)] bg-[var(--sitio-card)]">
            {c.horarios.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-[var(--sitio-line)] px-6 py-3 text-sm last:border-b-0"
              >
                <span className="font-medium text-[var(--sitio-text)]">{h.dia}</span>
                <span className="text-[var(--sitio-muted)]">{h.horario}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );

  const seccionEquipo = c.equipo.length > 0 && (
    <section id="equipo" className="scroll-mt-20 px-6 py-16">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <h2 className={cn("mb-8 text-center text-2xl", TITULO)}>Equipo</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {c.equipo.map((m, i) => (
              <div key={i} className="text-center">
                {m.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagen subida por el dueño
                  <img
                    src={m.foto_url}
                    alt=""
                    className="mx-auto mb-3 h-24 w-24 rounded-full border border-[var(--sitio-line)] object-cover"
                  />
                ) : (
                  <div className="mx-auto mb-3 h-24 w-24 rounded-full border border-[var(--sitio-line)] bg-[var(--sitio-card)]" />
                )}
                <h3 className={cn("text-base", TITULO)}>{m.nombre}</h3>
                <p className="text-sm text-[var(--sitio-muted)]">{m.rol}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );

  const seccionTestimonios = c.testimonios.length > 0 && (
    <section id="testimonios" className="scroll-mt-20 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <h2 className={cn("mb-8 text-center text-2xl", TITULO)}>Lo que dicen nuestros alumnos</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {c.testimonios.map((t, i) => (
              <div
                key={i}
                className="rounded-[var(--sitio-radius)] border border-[var(--sitio-line)] bg-[var(--sitio-card)] p-6"
              >
                <p className="mb-3 text-sm italic text-[var(--sitio-muted)]">&ldquo;{t.texto}&rdquo;</p>
                <p className={cn("text-sm", TITULO)}>{t.nombre}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );

  const seccionContacto = (c.ubicacion.direccion ||
    c.contacto.telefono ||
    c.contacto.email ||
    c.contacto.instagram) && (
    <section id="contacto" className="scroll-mt-20 px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <Reveal className="flex flex-col items-center gap-4">
          <h2 className={cn("text-2xl", TITULO)}>Ubícanos y contáctanos</h2>
          {c.ubicacion.direccion && (
            <p className="flex items-center gap-2 text-sm text-[var(--sitio-muted)]">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--sitio-accent)" }} />
              {c.ubicacion.direccion}
            </p>
          )}
          {c.contacto.telefono && (
            <p className="flex items-center gap-2 text-sm text-[var(--sitio-muted)]">
              <Phone className="h-4 w-4 shrink-0" style={{ color: "var(--sitio-accent)" }} />
              {c.contacto.telefono}
            </p>
          )}
          {c.contacto.instagram && (
            <a
              href={`https://instagram.com/${c.contacto.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--sitio-muted)] hover:underline"
            >
              <Instagram className="h-4 w-4 shrink-0" style={{ color: "var(--sitio-accent)" }} />
              @{c.contacto.instagram.replace(/^@/, "")}
            </a>
          )}
          {c.ubicacion.mapa_url && (
            <a
              href={c.ubicacion.mapa_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4"
              style={{ color: "var(--sitio-accent)" }}
            >
              Ver en el mapa
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );

  const secciones = [
    seccionPrograms,
    seccionPlanes,
    seccionNosotros,
    seccionGaleria,
    seccionHorarios,
    seccionEquipo,
    seccionTestimonios,
    seccionContacto,
  ].filter(Boolean);

  return (
    <div
      style={temaCssVars(tema, colorAcento)}
      className="min-h-svh overflow-x-hidden bg-[var(--sitio-bg)] font-sans text-[var(--sitio-text)] selection:bg-[var(--sitio-accent)] selection:text-[var(--sitio-accent-ink)]"
    >
      {/* `sticky` en vez del `position:fixed` del template: dentro del flujo normal no
          tapa la franja de "vista previa" de app/vista-previa-sitio/page.tsx (un
          `fixed` sí lo haría, sin importar qué haya arriba en el DOM) y en el sitio
          público real (sin esa franja) se ve idéntico, porque no hay nada antes en el
          flujo. Como consecuencia también se pierde el header transparente-sobre-hero
          del template (que depende de estar superpuesto): acá el header siempre tiene
          fondo legible, y `.scrolled` solo agrega el borde y reduce el padding. */}
      <header
        className={cn(
          "sticky top-0 z-[200] flex items-center justify-between gap-4 px-6 backdrop-blur-md transition-[padding,border-color] duration-300",
          scrolled ? "border-b border-[var(--sitio-line)] py-2.5" : "border-b border-transparent py-3.5",
        )}
        style={{ background: "color-mix(in srgb, var(--sitio-bg) 96%, transparent)" }}
      >
        <span className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--sitio-accent-ink)]"
            style={{ background: "var(--sitio-accent)" }}
          >
            <Dumbbell className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className={cn("text-[1.05rem] tracking-[.1em]", TITULO)}>{nombreGimnasio}</span>
        </span>
        {navLinks.length > 0 && (
          <nav className="hidden gap-8 min-[981px]:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative pb-1 text-[.82rem] uppercase tracking-[.06em] text-[var(--sitio-muted)] transition-colors hover:text-[var(--sitio-ink-gold)]"
              >
                {l.label}
                <span className="absolute inset-x-0 bottom-0 h-px w-0 bg-[var(--sitio-accent)] transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">
          <a href="/auth/login" className={BTN_GHOST}>
            Iniciar sesión
          </a>
          {whatsapp && (
            <a href={waHref(whatsapp)} target="_blank" rel="noopener noreferrer" className={BTN_SOLID}>
              Escríbenos
            </a>
          )}
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 py-16 min-[981px]:py-24">
          <div className="relative z-[2] mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-10 min-[981px]:grid-cols-[1.15fr_0.85fr]">
            <Reveal>
              <h1 className={cn("mb-5 text-[clamp(2.2rem,5.4vw,4.1rem)] leading-[1.08]", TITULO)}>
                {c.hero.titulo || nombreGimnasio}
              </h1>
              {c.hero.subtitulo && (
                <p className="mb-8 max-w-[480px] text-[1.05rem] leading-[1.7] text-[var(--sitio-muted)]">
                  {c.hero.subtitulo}
                </p>
              )}
              <div className="flex flex-wrap gap-3.5">
                {c.hero.cta_whatsapp && (
                  <a
                    href={waHref(c.hero.cta_whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(BTN_SOLID, BTN_LG)}
                  >
                    {c.hero.cta_texto || "Escríbenos"}
                  </a>
                )}
                {c.tarifas.length > 0 && (
                  <a href="#planes" className={cn(BTN_GHOST, BTN_LG)}>
                    Ver planes y precios
                  </a>
                )}
              </div>
            </Reveal>
            {c.hero.imagen_url && (
              <Reveal className="relative">
                <div
                  className="pointer-events-none absolute -inset-[18px] -z-[1] rounded-[calc(var(--sitio-radius)+18px)]"
                  style={{
                    background:
                      "radial-gradient(ellipse 70% 70% at 60% 40%, var(--sitio-accent), transparent 70%)",
                    opacity: 0.22,
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen subida por el dueño, host de Supabase Storage no está allowlisteado para next/image */}
                <img
                  src={c.hero.imagen_url}
                  alt=""
                  className="aspect-[4/5] w-full rounded-[var(--sitio-radius)] border object-cover"
                  style={{
                    borderColor: "var(--sitio-gold-light)",
                    boxShadow: "var(--sitio-shadow)",
                    filter: "sepia(.3) saturate(1.25) brightness(.96) contrast(1.04)",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[var(--sitio-radius)] mix-blend-multiply"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(201,162,77,.32), rgba(58,53,39,.1) 45%, rgba(169,124,60,.4))",
                  }}
                />
              </Reveal>
            )}
          </div>
        </section>

        {secciones.map((seccion, i) => (
          <Fragment key={i}>
            {i > 0 && <Divider />}
            {seccion}
          </Fragment>
        ))}
      </main>

      <footer className="border-t border-[var(--sitio-line)] px-6 py-14" style={{ background: "var(--sitio-bg-alt)" }}>
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-10 flex flex-wrap justify-between gap-8">
            <div className="max-w-[320px]">
              <span className={cn("text-base", TITULO)}>{nombreGimnasio}</span>
              {c.ubicacion.direccion && (
                <p className="mt-1.5 text-sm text-[var(--sitio-muted)]">{c.ubicacion.direccion}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-12">
              {navLinks.some((l) => l.href !== "#contacto") && (
                <div>
                  <h4 className={cn("mb-4 text-[.74rem] uppercase tracking-[.1em]", TITULO)}>Estudio</h4>
                  <ul className="flex flex-col gap-2.5">
                    {navLinks
                      .filter((l) => l.href !== "#contacto")
                      .map((l) => (
                        <li key={l.href}>
                          <a
                            href={l.href}
                            className="text-sm text-[var(--sitio-muted)] transition-colors hover:text-[var(--sitio-ink-gold)]"
                          >
                            {l.label}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <div>
                <h4 className={cn("mb-4 text-[.74rem] uppercase tracking-[.1em]", TITULO)}>Alumnos</h4>
                <ul className="flex flex-col gap-2.5">
                  <li>
                    <a
                      href="/auth/login"
                      className="text-sm text-[var(--sitio-muted)] transition-colors hover:text-[var(--sitio-ink-gold)]"
                    >
                      Iniciar sesión
                    </a>
                  </li>
                </ul>
              </div>
              {(c.contacto.email || c.contacto.telefono || c.horarios[0]) && (
                <div>
                  <h4 className={cn("mb-4 text-[.74rem] uppercase tracking-[.1em]", TITULO)}>Contacto</h4>
                  <ul className="flex flex-col gap-2.5">
                    {c.contacto.email && (
                      <li className="text-sm text-[var(--sitio-muted)]">{c.contacto.email}</li>
                    )}
                    {c.contacto.telefono && (
                      <li className="text-sm text-[var(--sitio-muted)]">{c.contacto.telefono}</li>
                    )}
                    {c.horarios[0] && (
                      <li className="text-sm text-[var(--sitio-muted)]">
                        {c.horarios[0].dia} · {c.horarios[0].horario}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-2.5 border-t border-[var(--sitio-line)] pt-[22px] text-[.75rem] text-[var(--sitio-muted-2)]">
            <span>
              © {new Date().getFullYear()} {nombreGimnasio}. Todos los derechos reservados.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
