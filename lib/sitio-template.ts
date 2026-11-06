// Spec 71: convierte el `ContenidoSitio` guardado en los datos que consume el template Valinor
// (equivalente a `derivar()` de .claude/docs generales/valinor-template/render.py).
// Módulo puro: sólo `import type` de "@/lib/sitio" para poder probarlo con
// `node --experimental-strip-types` (scripts/sitio/sitio-template.test.mjs).
import type { AcentoSitio, ContenidoSitio } from "@/lib/sitio";

export const IMAGEN_PORTADA_POR_DEFECTO = "/sitio-template/hero.jpg";

export type IdSeccion = "servicios" | "planes" | "nosotros" | "razones" | "galeria" | "equipo" | "testimonios";

/** Fondo de cada sección visible, en orden: alternan 0 (beige claro) y 1 (beige oscuro), así
 * dos contiguas nunca comparten fondo. Testimonios usa su propio fondo oscuro y queda fuera
 * de la alternancia (-1). */
export function asignarFondos(visibles: IdSeccion[]): Partial<Record<IdSeccion, number>> {
  const res: Partial<Record<IdSeccion, number>> = {};
  let n = 0;
  for (const id of visibles) res[id] = id === "testimonios" ? -1 : n++ % 2;
  return res;
}

export interface DatosTemplate {
  apariencia: { acento: AcentoSitio };
  portada: {
    titulo: string;
    firma: string;
    subtitulo: string;
    texto_boton: string;
    imagen: string;
    imagen_posicion: string;
    whatsapp_url: string;
  };
  nosotros: { texto: string };
  razones: { titulo: string; texto: string }[];
  servicios: { nombre: string; descripcion: string; icono: string; imagen: string }[];
  planes: {
    nombre: string;
    precio: string;
    destacado: boolean;
    incluye_una_linea: string;
    incluye_varias: string[];
    nombre_codificado: string;
  }[];
  horarios: { dia: string; horario: string }[];
  galeria: { imagen: string; caption: string }[];
  equipo: { nombre: string; rol: string; foto: string; inicial: string }[];
  equipo_descripcion: string;
  testimonios: { nombre: string; texto: string }[];
  contacto: {
    direccion: string;
    mapa_url: string;
    telefono: string;
    telefono_url: string;
    correo: string;
    instagram: string;
    instagram_url: string;
    whatsapp_url: string;
  };
  pie: { titulo_visita: string; titulo_contacto: string; texto_boton: string; texto_legal: string };
  anio: number;
}

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Sólo http(s) — descarta `javascript:`, `data:` y cualquier otro esquema. */
export function urlHttpSegura(valor: string | null | undefined): string {
  const v = (valor ?? "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function urlInstagram(valor: string): string {
  const v = valor.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return urlHttpSegura(v);
  // Un handle o `instagram.com/usuario`; cualquier esquema raro (javascript:) se descarta.
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return "";
  const usuario = v.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  return /^[A-Za-z0-9._]+$/.test(usuario) ? `https://instagram.com/${usuario}` : "";
}

export function derivarDatosTemplate(
  contenido: ContenidoSitio,
  acento: AcentoSitio,
  nombreGimnasio: string,
  hoy: Date = new Date(),
): DatosTemplate {
  const h = contenido.hero;
  const c = contenido.contacto;
  const u = contenido.ubicacion;

  const waPortada = digitos(h.cta_whatsapp) || digitos(c.whatsapp) || digitos(c.telefono);
  const waPortadaUrl = waPortada ? `https://wa.me/${waPortada}` : "#contacto";
  const waContacto = digitos(c.whatsapp) || digitos(c.telefono);
  const direccion = u.direccion.trim();
  const mapaPropio = urlHttpSegura(u.mapa_url);

  return {
    apariencia: { acento },
    portada: {
      titulo: h.titulo || nombreGimnasio,
      firma: h.firma.trim(),
      subtitulo: h.subtitulo,
      texto_boton: h.cta_texto || "Escríbenos",
      imagen: urlHttpSegura(h.imagen_url) || (h.imagen_url?.startsWith("/") ? h.imagen_url : IMAGEN_PORTADA_POR_DEFECTO),
      imagen_posicion: `${h.imagen_pos_x ?? 50}% ${h.imagen_pos_y ?? 50}%`,
      whatsapp_url: waPortadaUrl,
    },
    nosotros: { texto: contenido.sobre_nosotros },
    razones: contenido.por_que_elegirnos
      .filter((r) => r.titulo.trim() || r.texto.trim())
      .slice(0, 3),
    servicios: contenido.servicios.map((sv) => ({
      nombre: sv.nombre,
      descripcion: sv.descripcion,
      icono: sv.icono,
      imagen: urlHttpSegura(sv.imagen_url),
    })),
    planes: contenido.tarifas.map((t) => {
      const lineas = t.descripcion.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        nombre: t.plan,
        precio: t.precio,
        destacado: t.destacado ?? false,
        incluye_una_linea: lineas.length === 1 ? lineas[0] : "",
        incluye_varias: lineas.length > 1 ? lineas : [],
        nombre_codificado: encodeURIComponent(`Hola, quiero el plan ${t.plan}`),
      };
    }),
    horarios: contenido.horarios,
    galeria: contenido.galeria
      .filter((g) => urlHttpSegura(g.url))
      .map((g) => ({ imagen: g.url, caption: g.caption })),
    equipo: contenido.equipo.map((e) => ({
      nombre: e.nombre,
      rol: e.rol,
      foto: urlHttpSegura(e.foto_url),
      inicial: ((e.nombre || "?").trim()[0] ?? "?").toUpperCase(),
    })),
    equipo_descripcion: contenido.equipo_descripcion.trim().slice(0, 500),
    testimonios: contenido.testimonios,
    contacto: {
      direccion,
      mapa_url:
        mapaPropio ||
        (direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : ""),
      telefono: c.telefono,
      telefono_url: digitos(c.telefono) ? `tel:+${digitos(c.telefono)}` : "",
      correo: c.email,
      instagram: c.instagram,
      instagram_url: urlInstagram(c.instagram),
      whatsapp_url: waContacto ? `https://wa.me/${waContacto}` : waPortadaUrl,
    },
    pie: {
      titulo_visita: contenido.pie.titulo_visita,
      titulo_contacto: contenido.pie.titulo_contacto,
      texto_boton: contenido.pie.texto_boton,
      texto_legal: contenido.pie.texto_legal
        .replaceAll("{anio}", String(hoy.getFullYear()))
        .replaceAll("{titulo}", h.titulo || nombreGimnasio),
    },
    anio: hoy.getFullYear(),
  };
}
