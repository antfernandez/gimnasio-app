import type { CSSProperties } from "react";

// Este módulo es intencionalmente "puro" (sin `next/headers` ni el cliente de
// servidor de Supabase) porque `components/sitio/editor-sitio.tsx` (Client Component)
// importa `ACENTOS`/`temaCssVars`/los tipos de acá — si este archivo arrastrara
// `lib/supabase/server.ts`, Turbopack rompe el build con "You're importing a module
// that depends on next/headers ... in the Pages Router". El bootstrap del sitio del
// dueño (`getSitioActual`, que sí necesita servidor) vive aparte en `lib/sitio-actual.ts`.

export type TemaSitio = "oscuro" | "claro";

export interface Acento {
  nombre: string;
  valor: string;
  /** Color de texto legible sobre este acento (botones, badges). */
  ink: string;
}

export const ACENTOS: Acento[] = [
  { nombre: "Naranja", valor: "#ff4b26", ink: "#ffffff" },
  { nombre: "Lima", valor: "#c6ff3d", ink: "#0a0a0b" },
  { nombre: "Dorado", valor: "#c9a24d", ink: "#1a1207" },
  { nombre: "Verde", valor: "#4d9f6c", ink: "#ffffff" },
  { nombre: "Azul", valor: "#3d7fff", ink: "#ffffff" },
  { nombre: "Rojo", valor: "#e0483a", ink: "#ffffff" },
  { nombre: "Morado", valor: "#8b5cf6", ink: "#ffffff" },
  { nombre: "Rosado", valor: "#ec4899", ink: "#ffffff" },
];

export function acentoInk(colorAcento: string): string {
  return ACENTOS.find((a) => a.valor === colorAcento)?.ink ?? "#ffffff";
}

// ---------- utilidades de color: derivar la familia "gold" del template a partir
// del acento elegido por el tenant (ver `derivarAcento` más abajo). ----------
function hexARgb(hex: string): [number, number, number] {
  const limpio = hex.replace("#", "");
  const entero = parseInt(limpio, 16);
  return [(entero >> 16) & 255, (entero >> 8) & 255, entero & 255];
}

function rgbAHex(r: number, g: number, b: number): string {
  const canal = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

function mezclarColor(hex: string, hacia: [number, number, number], peso: number): string {
  const [r, g, b] = hexARgb(hex);
  const [tr, tg, tb] = hacia;
  return rgbAHex(r + (tr - r) * peso, g + (tg - g) * peso, b + (tb - b) * peso);
}

const BLANCO: [number, number, number] = [255, 255, 255];
const NEGRO: [number, number, number] = [0, 0, 0];

/** El template `valinor-sistema-web-claro-v2.html` define `--gold-light`/`--gold-deep`/
 * `--ink-gold` como tonos fijos derivados a mano de su `--gold` (#c9a24d). Acá se
 * recalculan a partir del `color_acento` de cada tenant con los mismos pesos de mezcla
 * (medidos comparando los hex del template) para que el gradiente dorado de
 * `.btn-solid`/`.plan-card.featured`/precios/bordes destacados "tiña" con el acento
 * elegido en vez de quedar dorado fijo para gimnasios que no usan ese acento —
 * ver Sprint 21 Parte E. */
function derivarAcento(colorAcento: string) {
  return {
    light: mezclarColor(colorAcento, BLANCO, 0.5),
    deep: mezclarColor(colorAcento, NEGRO, 0.2),
    ink: mezclarColor(colorAcento, NEGRO, 0.35),
  };
}

interface PaletaTema {
  bg: string;
  bgAlt: string;
  card: string;
  card2: string;
  text: string;
  muted: string;
  muted2: string;
  line: string;
  shadow: string;
}

// bg/bgAlt/card/text/muted/line del tema "claro" vienen del Sprint 11 (ya en producción,
// no se tocan). card2/muted2/shadow son nuevos (Sprint 21 Parte A) tomados tal cual del
// template (sección 3 del documento de referencia) — son ambiente fijo "boutique" de la
// paleta clara, no dependen del tenant.
const TEMAS: Record<TemaSitio, PaletaTema> = {
  oscuro: {
    bg: "#0a0a0b",
    bgAlt: "#141416",
    card: "#1c1c1f",
    card2: "#202024",
    text: "#f5f5f4",
    muted: "#a3a3a0",
    muted2: "#78786f",
    line: "rgba(245,245,244,.14)",
    shadow: "0 16px 40px -18px rgba(0,0,0,.55)",
  },
  claro: {
    bg: "#faf6ec",
    bgAlt: "#f2e9d4",
    card: "#ffffff",
    card2: "#faf1e4",
    text: "#2b2415",
    muted: "#6b5f45",
    muted2: "#9c8b74",
    line: "rgba(43,36,21,.14)",
    shadow: "0 16px 40px -18px rgba(110,80,45,.26)",
  },
};

/** Variables CSS del sitio público de un tenant, aisladas de los tokens de la app
 * (`app/globals.css`, que son la marca fija de Valinor Estudio como SaaS) — se aplican
 * como `style` en el contenedor raíz del sitio, nunca en `:root`. */
export function temaCssVars(tema: TemaSitio, colorAcento: string): CSSProperties {
  const t = TEMAS[tema];
  const acento = derivarAcento(colorAcento);
  return {
    "--sitio-bg": t.bg,
    "--sitio-bg-alt": t.bgAlt,
    "--sitio-card": t.card,
    "--sitio-card-2": t.card2,
    "--sitio-text": t.text,
    "--sitio-muted": t.muted,
    "--sitio-muted-2": t.muted2,
    "--sitio-line": t.line,
    "--sitio-radius": "14px",
    "--sitio-shadow": t.shadow,
    "--sitio-accent": colorAcento,
    "--sitio-accent-ink": acentoInk(colorAcento),
    "--sitio-gold-light": acento.light,
    "--sitio-gold-deep": acento.deep,
    "--sitio-ink-gold": acento.ink,
  } as CSSProperties;
}

export interface BloqueHero {
  titulo: string;
  subtitulo: string;
  imagen_url: string | null;
  cta_texto: string;
  cta_whatsapp: string;
}

export interface ItemServicio {
  nombre: string;
  descripcion: string;
}

export interface ItemHorario {
  dia: string;
  horario: string;
}

export interface ItemTarifa {
  plan: string;
  precio: string;
  descripcion: string;
  /** Plan "Más elegido" del template (`.plan-card.featured`) — Sprint 21 Parte B.
   * `?? false` al leer contenido guardado antes de este campo, ver `normalizarContenido`. */
  destacado?: boolean;
}

export interface ItemTestimonio {
  nombre: string;
  texto: string;
}

export interface ItemEquipo {
  nombre: string;
  rol: string;
  foto_url: string | null;
}

/** Foto de la galería del template (`.gallery-slide` + `.gallery-cap`) — Sprint 21
 * Parte B. Antes de este sprint `galeria` era `string[]`; ver `normalizarContenido`
 * para la migración de contenido guardado con el formato viejo. */
export interface ItemGaleria {
  url: string;
  caption: string;
}

/** Tarjeta de "por qué elegirnos" (`.why-card`) — Sprint 21 Parte B. El template tiene
 * un tercer campo corto (`.why-num`, ej. "Programación") además de título/texto, pero
 * acá se resuelve con la numeración de la tarjeta (01/02/03) en vez de agregar un tercer
 * campo al CMS. */
export interface ItemPorQueElegirnos {
  titulo: string;
  texto: string;
}

export interface BloqueUbicacion {
  direccion: string;
  mapa_url: string;
}

export interface BloqueContacto {
  telefono: string;
  email: string;
  instagram: string;
  whatsapp: string;
}

export interface ContenidoSitio {
  hero: BloqueHero;
  sobre_nosotros: string;
  servicios: ItemServicio[];
  horarios: ItemHorario[];
  tarifas: ItemTarifa[];
  galeria: ItemGaleria[];
  testimonios: ItemTestimonio[];
  equipo: ItemEquipo[];
  por_que_elegirnos: ItemPorQueElegirnos[];
  ubicacion: BloqueUbicacion;
  contacto: BloqueContacto;
}

export function contenidoVacio(nombreGimnasio: string): ContenidoSitio {
  return {
    hero: {
      titulo: nombreGimnasio,
      subtitulo: "",
      imagen_url: null,
      cta_texto: "Escríbenos",
      cta_whatsapp: "",
    },
    sobre_nosotros: "",
    servicios: [],
    horarios: [],
    tarifas: [],
    galeria: [],
    testimonios: [],
    equipo: [],
    por_que_elegirnos: [],
    ubicacion: { direccion: "", mapa_url: "" },
    contacto: { telefono: "", email: "", instagram: "", whatsapp: "" },
  };
}

// Forma "floja" de un `ContenidoSitio` tal como puede venir de la base de datos —
// jsonb sin schema, así que cualquier campo puede faltar (guardado antes de que
// existiera) o `galeria` puede venir en su formato viejo (`string[]`).
interface ContenidoSitioCrudo {
  hero?: Partial<BloqueHero> | null;
  sobre_nosotros?: string | null;
  servicios?: ItemServicio[] | null;
  horarios?: ItemHorario[] | null;
  tarifas?: Array<Partial<ItemTarifa>> | null;
  galeria?: Array<string | Partial<ItemGaleria>> | null;
  testimonios?: ItemTestimonio[] | null;
  equipo?: ItemEquipo[] | null;
  por_que_elegirnos?: ItemPorQueElegirnos[] | null;
  ubicacion?: Partial<BloqueUbicacion> | null;
  contacto?: Partial<BloqueContacto> | null;
}

/** Normaliza contenido leído de Supabase (`contenido_borrador`/`contenido_publicado`/
 * `sitio_versiones.contenido`) a la forma actual de `ContenidoSitio` — Sprint 21 Parte D.
 * Rellena con su valor por defecto cualquier campo agregado después de que el gimnasio
 * guardó su contenido (`por_que_elegirnos`, `tarifas[].destacado`) y migra `galeria` del
 * formato viejo (`string[]`) al nuevo (`{url, caption}[]`). Debe llamarse en todo punto
 * de lectura de `jsonb` de la tabla `sitios`/`sitio_versiones` — como el contenido no
 * tiene columnas tipadas, esta es la única red de seguridad contra contenido viejo. */
export function normalizarContenido(raw: unknown): ContenidoSitio {
  const r = (raw ?? {}) as ContenidoSitioCrudo;

  return {
    hero: {
      titulo: r.hero?.titulo ?? "",
      subtitulo: r.hero?.subtitulo ?? "",
      imagen_url: r.hero?.imagen_url ?? null,
      cta_texto: r.hero?.cta_texto ?? "Escríbenos",
      cta_whatsapp: r.hero?.cta_whatsapp ?? "",
    },
    sobre_nosotros: r.sobre_nosotros ?? "",
    servicios: r.servicios ?? [],
    horarios: r.horarios ?? [],
    tarifas: (r.tarifas ?? []).map((t) => ({
      plan: t.plan ?? "",
      precio: t.precio ?? "",
      descripcion: t.descripcion ?? "",
      destacado: t.destacado ?? false,
    })),
    galeria: (r.galeria ?? []).map((item) =>
      typeof item === "string"
        ? { url: item, caption: "" }
        : { url: item.url ?? "", caption: item.caption ?? "" },
    ),
    testimonios: r.testimonios ?? [],
    equipo: r.equipo ?? [],
    por_que_elegirnos: r.por_que_elegirnos ?? [],
    ubicacion: {
      direccion: r.ubicacion?.direccion ?? "",
      mapa_url: r.ubicacion?.mapa_url ?? "",
    },
    contacto: {
      telefono: r.contacto?.telefono ?? "",
      email: r.contacto?.email ?? "",
      instagram: r.contacto?.instagram ?? "",
      whatsapp: r.contacto?.whatsapp ?? "",
    },
  };
}

export interface Sitio {
  gimnasio_id: string;
  tema: TemaSitio;
  color_acento: string;
  contenido_borrador: ContenidoSitio;
  contenido_publicado: ContenidoSitio | null;
  publicado_at: string | null;
  updated_at: string;
}
