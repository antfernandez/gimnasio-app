// Este módulo es intencionalmente "puro" (sin `next/headers` ni el cliente de
// servidor de Supabase) porque `components/sitio/editor-sitio.tsx` (Client Component)
// importa `ACENTOS`/los tipos de acá — si este archivo arrastrara
// `lib/supabase/server.ts`, Turbopack rompe el build con "You're importing a module
// that depends on next/headers ... in the Pages Router". El bootstrap del sitio del
// dueño (`getSitioActual`, que sí necesita servidor) vive aparte en `lib/sitio-actual.ts`.

/** Spec 71: el sitio usa el template Valinor (un solo tema claro). El acento se guarda por
 * nombre en `sitios.color_acento` y se aplica con `data-acento` (ver sitio-template.css). */
export type AcentoSitio = "turquesa" | "dorado" | "verde" | "morado" | "rosado";

export interface Acento {
  id: AcentoSitio;
  nombre: string;
  /** Color de la muestra en el editor (el CSS del sitio define el real). */
  color: string;
}

export const ACENTOS: Acento[] = [
  { id: "turquesa", nombre: "Turquesa", color: "#2899a5" },
  { id: "dorado", nombre: "Dorado", color: "#a8815b" },
  { id: "verde", nombre: "Verde", color: "#4f8a5b" },
  { id: "morado", nombre: "Morado", color: "#7a5bb5" },
  { id: "rosado", nombre: "Rosado", color: "#d6638a" },
];

export const ACENTO_POR_DEFECTO: AcentoSitio = "turquesa";

// Valores hex del diseño anterior (migración 0043 los convierte; esto cubre filas sin migrar).
const ACENTO_LEGADO: Record<string, AcentoSitio> = {
  "#c9a24d": "dorado",
  "#4d9f6c": "verde",
  "#8b5cf6": "morado",
  "#ec4899": "rosado",
};

/** Cualquier valor leído de la BD → un acento válido del template. */
export function normalizarAcento(valor: unknown): AcentoSitio {
  if (typeof valor !== "string") return ACENTO_POR_DEFECTO;
  if (ACENTOS.some((a) => a.id === valor)) return valor as AcentoSitio;
  return ACENTO_LEGADO[valor.toLowerCase()] ?? ACENTO_POR_DEFECTO;
}

/** Títulos de sección: los mismos nombres de los bloques del mantenedor (editor-sitio.tsx) y
 * del sitio público (sitio-template.tsx) — una sola fuente para que no se desincronicen. */
export const TITULOS_SECCION = {
  portada: "Portada",
  nosotros: "Sobre nosotros",
  servicios: "Servicios",
  horarios: "Horarios",
  planes: "Planes y tarifas",
  razones: "Por qué elegirnos",
  galeria: "Galería de fotos",
  testimonios: "Testimonios",
  equipo: "Equipo",
  pie: "Pie de página y contacto",
} as const;

/** Medidas de la imagen de portada según el hero del template (alto fluido 300–490 px,
 * ancho completo, recortada con `object-fit: cover`). Se muestran en el mantenedor. */
export const MEDIDAS_PORTADA = {
  ancho: 1920,
  alto: 700,
  formato: "horizontal (≈ 11:4)",
  pesoMaxMb: 5,
  zonaSegura:
    "Deja lo importante en el centro: en celulares se recorta a los lados y sobre la foto va un velo oscuro con el título y los botones.",
} as const;

export interface BloqueHero {
  titulo: string;
  subtitulo: string;
  imagen_url: string | null;
  /** Punto focal de `imagen_url` como % del ancho/alto (0-100, 50/50 = centrado) —
   * usado como `object-position` para que el dueño pueda encuadrar la foto de portada
   * aunque no venga recortada exactamente en la proporción 4:5 del hero. */
  imagen_pos_x: number;
  imagen_pos_y: number;
  cta_texto: string;
  cta_whatsapp: string;
  /** Firma bajo el nombre en el encabezado (ej. "by Flavia Reyes"); vacía = no se muestra. */
  firma: string;
}

/** Iconos disponibles para un servicio (id → componente en components/sitio/iconos-servicio.tsx). */
export const ICONOS_SERVICIO = [
  "mancuerna", "fuego", "corazon", "trofeo", "destello", "usuarios", "bicicleta", "huellas",
  "actividad", "cronometro", "objetivo", "rayo", "manzana", "ensalada", "medalla", "olas",
  "montana", "musica", "persona", "hoja",
] as const;
export type IconoServicio = (typeof ICONOS_SERVICIO)[number];

export function iconoServicioValido(valor: unknown): IconoServicio | "" {
  return (ICONOS_SERVICIO as readonly string[]).includes(valor as string) ? (valor as IconoServicio) : "";
}

export interface ItemServicio {
  nombre: string;
  descripcion: string;
  /** Spec 71 §12.3: icono junto al título ("" = sin icono). */
  icono: IconoServicio | "";
  /** Spec 71 §12.3: imagen sobre el título. */
  imagen_url: string | null;
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

export const MAX_DESCRIPCION_EQUIPO = 500;

/** Textos editables del pie de página (Spec 71 §10.4). `texto_legal` admite `{anio}` y `{titulo}`. */
export interface BloquePie {
  titulo_visita: string;
  titulo_contacto: string;
  texto_boton: string;
  texto_legal: string;
}

export const PIE_POR_DEFECTO: BloquePie = {
  titulo_visita: "Visítanos y conoce nuestros horarios:",
  titulo_contacto: "Conversemos sobre tus objetivos:",
  texto_boton: "Escríbenos por WhatsApp",
  texto_legal: "© {anio} {titulo}. Todos los derechos reservados.",
};

export interface ContenidoSitio {
  hero: BloqueHero;
  sobre_nosotros: string;
  servicios: ItemServicio[];
  horarios: ItemHorario[];
  tarifas: ItemTarifa[];
  galeria: ItemGaleria[];
  testimonios: ItemTestimonio[];
  equipo: ItemEquipo[];
  /** Descripción del equipo (máx. `MAX_DESCRIPCION_EQUIPO` caracteres). */
  equipo_descripcion: string;
  por_que_elegirnos: ItemPorQueElegirnos[];
  ubicacion: BloqueUbicacion;
  contacto: BloqueContacto;
  pie: BloquePie;
}

export function contenidoVacio(nombreGimnasio: string): ContenidoSitio {
  return {
    hero: {
      titulo: nombreGimnasio,
      subtitulo: "",
      imagen_url: null,
      imagen_pos_x: 50,
      imagen_pos_y: 50,
      cta_texto: "Escríbenos",
      cta_whatsapp: "",
      firma: "",
    },
    sobre_nosotros: "",
    servicios: [],
    horarios: [],
    tarifas: [],
    galeria: [],
    testimonios: [],
    equipo: [],
    equipo_descripcion: "",
    por_que_elegirnos: [],
    ubicacion: { direccion: "", mapa_url: "" },
    contacto: { telefono: "", email: "", instagram: "", whatsapp: "" },
    pie: { ...PIE_POR_DEFECTO },
  };
}

// Forma "floja" de un `ContenidoSitio` tal como puede venir de la base de datos —
// jsonb sin schema, así que cualquier campo puede faltar (guardado antes de que
// existiera) o `galeria` puede venir en su formato viejo (`string[]`).
interface ContenidoSitioCrudo {
  hero?: Partial<BloqueHero> | null;
  sobre_nosotros?: string | null;
  servicios?: Array<Partial<ItemServicio>> | null;
  horarios?: ItemHorario[] | null;
  tarifas?: Array<Partial<ItemTarifa>> | null;
  galeria?: Array<string | Partial<ItemGaleria>> | null;
  testimonios?: ItemTestimonio[] | null;
  equipo?: ItemEquipo[] | null;
  equipo_descripcion?: string | null;
  por_que_elegirnos?: ItemPorQueElegirnos[] | null;
  ubicacion?: Partial<BloqueUbicacion> | null;
  contacto?: Partial<BloqueContacto> | null;
  pie?: Partial<BloquePie> | null;
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
      imagen_pos_x: r.hero?.imagen_pos_x ?? 50,
      imagen_pos_y: r.hero?.imagen_pos_y ?? 50,
      cta_texto: r.hero?.cta_texto ?? "Escríbenos",
      cta_whatsapp: r.hero?.cta_whatsapp ?? "",
      // Contenido guardado antes de este campo (undefined) conserva la firma de Valinor.
      firma: r.hero?.firma ?? "by Flavia Reyes",
    },
    sobre_nosotros: r.sobre_nosotros ?? "",
    servicios: (r.servicios ?? []).map((sv) => ({
      nombre: sv.nombre ?? "",
      descripcion: sv.descripcion ?? "",
      icono: iconoServicioValido(sv.icono),
      imagen_url: sv.imagen_url ?? null,
    })),
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
    equipo_descripcion: (r.equipo_descripcion ?? "").slice(0, MAX_DESCRIPCION_EQUIPO),
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
    pie: {
      titulo_visita: r.pie?.titulo_visita?.trim() || PIE_POR_DEFECTO.titulo_visita,
      titulo_contacto: r.pie?.titulo_contacto?.trim() || PIE_POR_DEFECTO.titulo_contacto,
      texto_boton: r.pie?.texto_boton?.trim() || PIE_POR_DEFECTO.texto_boton,
      texto_legal: r.pie?.texto_legal?.trim() || PIE_POR_DEFECTO.texto_legal,
    },
  };
}

export interface Sitio {
  gimnasio_id: string;
  color_acento: AcentoSitio;
  contenido_borrador: ContenidoSitio;
  contenido_publicado: ContenidoSitio | null;
  publicado_at: string | null;
  updated_at: string;
}
