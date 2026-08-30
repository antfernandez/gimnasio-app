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

const TEMAS: Record<TemaSitio, { bg: string; bgAlt: string; card: string; text: string; muted: string; line: string }> = {
  oscuro: {
    bg: "#0a0a0b",
    bgAlt: "#141416",
    card: "#1c1c1f",
    text: "#f5f5f4",
    muted: "#a3a3a0",
    line: "rgba(245,245,244,.14)",
  },
  claro: {
    bg: "#faf6ec",
    bgAlt: "#f2e9d4",
    card: "#ffffff",
    text: "#2b2415",
    muted: "#6b5f45",
    line: "rgba(43,36,21,.14)",
  },
};

/** Variables CSS del sitio público de un tenant, aisladas de los tokens de la app
 * (`app/globals.css`, que son la marca fija de Valinor Estudio como SaaS) — se aplican
 * como `style` en el contenedor raíz del sitio, nunca en `:root`. */
export function temaCssVars(tema: TemaSitio, colorAcento: string): CSSProperties {
  const t = TEMAS[tema];
  return {
    "--sitio-bg": t.bg,
    "--sitio-bg-alt": t.bgAlt,
    "--sitio-card": t.card,
    "--sitio-text": t.text,
    "--sitio-muted": t.muted,
    "--sitio-line": t.line,
    "--sitio-accent": colorAcento,
    "--sitio-accent-ink": acentoInk(colorAcento),
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
  galeria: string[];
  testimonios: ItemTestimonio[];
  equipo: ItemEquipo[];
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
    ubicacion: { direccion: "", mapa_url: "" },
    contacto: { telefono: "", email: "", instagram: "", whatsapp: "" },
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
