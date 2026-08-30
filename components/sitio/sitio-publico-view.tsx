import { Instagram, MapPin, Phone } from "lucide-react";

import type { ContenidoSitio, TemaSitio } from "@/lib/sitio";
import { temaCssVars } from "@/lib/sitio";

/** `app/globals.css` fuerza `h1,h2,h3,h4` a mayúsculas + fuente display + el color
 * de marca fijo de Valinor (`@layer base`, pensado para el chrome de la app) — sin
 * este reset explícito esos tres estilos se filtran a cualquier heading de acá,
 * incluido el color, que en el tema "claro" del tenant quedaría casi invisible sobre
 * fondo claro (es un token oscuro fijo del SaaS). */
const TITULO = "normal-case font-sans text-[var(--sitio-text)]";

/**
 * Render puro del sitio público de un tenant, a partir de un `ContenidoSitio` — usado
 * tanto por la ruta pública (`app/g/[slug]/page.tsx`, con `contenido_publicado`) como
 * por la vista previa del dueño (`app/vista-previa-sitio/page.tsx`, con
 * `contenido_borrador`). Los colores vienen de variables CSS (`temaCssVars`, lib/sitio.ts)
 * aplicadas en el contenedor raíz — nunca de los tokens de `app/globals.css`, que son
 * la marca fija de Valinor Estudio como SaaS, no del gimnasio.
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
  const waHref = (numero: string, texto?: string) =>
    numero
      ? `https://wa.me/${numero.replace(/[^0-9]/g, "")}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`
      : undefined;

  return (
    <div
      style={temaCssVars(tema, colorAcento)}
      className="min-h-svh bg-[var(--sitio-bg)] font-sans text-[var(--sitio-text)]"
    >
      <header className="border-b border-[var(--sitio-line)] px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-bold">{nombreGimnasio}</span>
          {c.contacto.whatsapp && (
            <a
              href={waHref(c.contacto.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: "var(--sitio-accent)",
                color: "var(--sitio-accent-ink)",
              }}
            >
              Escríbenos
            </a>
          )}
        </div>
      </header>

      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          {c.hero.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element -- imagen subida por el dueño, host de Supabase Storage no está allowlisteado para next/image
            <img
              src={c.hero.imagen_url}
              alt=""
              className="mb-4 h-56 w-full max-w-2xl rounded-2xl object-cover"
            />
          )}
          <h1 className={`text-4xl font-bold tracking-tight md:text-5xl ${TITULO}`}>
            {c.hero.titulo || nombreGimnasio}
          </h1>
          {c.hero.subtitulo && (
            <p className="max-w-xl text-lg text-[var(--sitio-muted)]">
              {c.hero.subtitulo}
            </p>
          )}
          {c.hero.cta_whatsapp && (
            <a
              href={waHref(c.hero.cta_whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 rounded-full px-7 py-3 text-sm font-bold"
              style={{
                backgroundColor: "var(--sitio-accent)",
                color: "var(--sitio-accent-ink)",
              }}
            >
              {c.hero.cta_texto || "Escríbenos"}
            </a>
          )}
        </div>
      </section>

      {c.sobre_nosotros && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={`mb-6 text-2xl font-bold ${TITULO}`}>Sobre nosotros</h2>
            <p className="whitespace-pre-line text-[var(--sitio-muted)]">
              {c.sobre_nosotros}
            </p>
          </div>
        </section>
      )}

      {c.servicios.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className={`mb-8 text-center text-2xl font-bold ${TITULO}`}>Servicios</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.servicios.map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[var(--sitio-card)] p-6"
                >
                  <h3 className={`mb-2 font-bold ${TITULO}`}>{s.nombre}</h3>
                  <p className="text-sm text-[var(--sitio-muted)]">
                    {s.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.tarifas.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className={`mb-8 text-center text-2xl font-bold ${TITULO}`}>Planes y tarifas</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.tarifas.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[var(--sitio-card)] p-6 text-center"
                >
                  <h3 className={`font-bold ${TITULO}`}>{t.plan}</h3>
                  <p
                    className="my-2 text-2xl font-bold"
                    style={{ color: "var(--sitio-accent)" }}
                  >
                    {t.precio}
                  </p>
                  <p className="text-sm text-[var(--sitio-muted)]">
                    {t.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.galeria.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className={`mb-8 text-center text-2xl font-bold ${TITULO}`}>Galería</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {c.galeria.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- imagen subida por el dueño
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {c.horarios.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className={`mb-8 text-center text-2xl font-bold ${TITULO}`}>Horarios</h2>
            <div className="overflow-hidden rounded-2xl bg-[var(--sitio-card)]">
              {c.horarios.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-[var(--sitio-line)] px-6 py-3 text-sm last:border-b-0"
                >
                  <span className="font-medium">{h.dia}</span>
                  <span className="text-[var(--sitio-muted)]">{h.horario}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.equipo.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className={`mb-8 text-center text-2xl font-bold ${TITULO}`}>Equipo</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {c.equipo.map((m, i) => (
                <div key={i} className="text-center">
                  {m.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagen subida por el dueño
                    <img
                      src={m.foto_url}
                      alt=""
                      className="mx-auto mb-3 h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="mx-auto mb-3 h-24 w-24 rounded-full bg-[var(--sitio-card)]" />
                  )}
                  <h3 className={`font-bold ${TITULO}`}>{m.nombre}</h3>
                  <p className="text-sm text-[var(--sitio-muted)]">{m.rol}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.testimonios.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className={`mb-8 text-center text-2xl font-bold ${TITULO}`}>
              Lo que dicen nuestros alumnos
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {c.testimonios.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[var(--sitio-card)] p-6"
                >
                  <p className="mb-3 text-sm italic text-[var(--sitio-muted)]">
                    &ldquo;{t.texto}&rdquo;
                  </p>
                  <p className="text-sm font-bold">{t.nombre}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(c.ubicacion.direccion ||
        c.contacto.telefono ||
        c.contacto.email ||
        c.contacto.instagram) && (
        <section className="border-t border-[var(--sitio-line)] px-6 py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <h2 className={`text-2xl font-bold ${TITULO}`}>Ubícanos y contáctanos</h2>
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
          </div>
        </section>
      )}

      <footer className="border-t border-[var(--sitio-line)] px-6 py-8 text-center text-xs text-[var(--sitio-muted)]">
        © {new Date().getFullYear()} {nombreGimnasio}
      </footer>
    </div>
  );
}
