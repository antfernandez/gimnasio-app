// Spec 71: pruebas de derivarDatosTemplate y normalizarAcento.
// Uso: node --experimental-strip-types scripts/sitio/sitio-template.test.mjs
import { asignarFondos, derivarDatosTemplate, urlHttpSegura } from "../../lib/sitio-template.ts";
import { normalizarAcento, normalizarContenido } from "../../lib/sitio.ts";

const base = {
  hero: { titulo: "Valinor Estudio", subtitulo: "Sub", imagen_url: null, imagen_pos_x: 30, imagen_pos_y: 60, cta_texto: "Escríbenos", cta_whatsapp: "+56 9 5019 9703", firma: " by X " },
  sobre_nosotros: "Texto",
  servicios: [{ nombre: "Cardio", descripcion: "d", icono: "fuego", imagen_url: "https://x.co/a.jpg" }, { nombre: "Box", descripcion: "", icono: "", imagen_url: "javascript:1" }],
  horarios: [{ dia: "Viernes", horario: "6:00" }],
  tarifas: [
    { plan: "Básico", precio: "$50.000", descripcion: "Acceso libre", destacado: true },
    { plan: "Premium", precio: "$120.000", descripcion: "A\nB\n\nC", destacado: false },
  ],
  galeria: [{ url: "https://x.supabase.co/a.jpg", caption: "c" }, { url: "javascript:alert(1)", caption: "mala" }],
  testimonios: [],
  equipo_descripcion: " Somos un equipo ",
  equipo: [{ nombre: "flavia", rol: "Coach", foto_url: null }],
  por_que_elegirnos: [{ titulo: "1", texto: "a" }, { titulo: "2", texto: "b" }, { titulo: "3", texto: "c" }, { titulo: "4", texto: "d" }, { titulo: "", texto: "" }],
  ubicacion: { direccion: "Calle 1, Ciudad", mapa_url: "" },
  contacto: { telefono: "+56 9 1111 2222", email: "a@b.cl", instagram: "@valinor", whatsapp: "" },
  pie: { titulo_visita: "Ven", titulo_contacto: "", texto_boton: "WA", texto_legal: "© {anio} {titulo}" },
};
const d = derivarDatosTemplate(base, "turquesa", "Respaldo", new Date("2026-11-06"));
const vacio = normalizarContenido({});
const c = (...xs) => asignarFondos(xs);
const casos = [
  ["firma recortada", d.portada.firma, "by X"],
  ["firma legado = by Flavia Reyes", normalizarContenido({ hero: {} }).hero.firma, "by Flavia Reyes"],
  ["firma vacía explícita se respeta", normalizarContenido({ hero: { firma: "" } }).hero.firma, ""],
  ["fondos con razones separadas", (() => { const f = c("nosotros","razones"); return f.nosotros !== f.razones; })(), true],
  ["servicio: imagen válida", d.servicios[0].imagen, "https://x.co/a.jpg"],
  ["servicio: imagen insegura descartada", d.servicios[1].imagen, ""],
  ["servicio antiguo normalizado", normalizarContenido({ servicios: [{ nombre: "A", descripcion: "b" }] }).servicios[0], { nombre: "A", descripcion: "b", icono: "", imagen_url: null }],
  ["servicio: icono inválido", normalizarContenido({ servicios: [{ nombre: "A", icono: "hack" }] }).servicios[0].icono, ""],
  ["equipo_descripcion recorta a 500", normalizarContenido({ equipo_descripcion: "x".repeat(600) }).equipo_descripcion.length, 500],
  ["fondos solo 0/1", Object.values(c("servicios","planes","nosotros","galeria","horarios")), [0,1,0,1,0]],
  ["pie: reemplaza {anio} y {titulo}", d.pie.texto_legal, "© 2026 Valinor Estudio"],
  ["pie: default si viene vacío", normalizarContenido({ pie: { titulo_contacto: " " } }).pie.titulo_contacto, "Conversemos sobre tus objetivos:"],
  ["pie: defaults completos", vacio.pie.texto_boton, "Escríbenos por WhatsApp"],
  ["fondos contiguos distintos", (() => { const f = Object.values(c("servicios","planes","nosotros","galeria","horarios","equipo")); return f.every((v,i)=>i===0||v!==f[i-1]); })(), true],
  ["fondos: testimonios fuera del ciclo", c("servicios","testimonios").testimonios, -1],
  ["fondos: se recalculan sin secciones", c("planes","horarios"), { planes: 0, horarios: 1 }],
  ["wa portada usa cta_whatsapp", d.portada.whatsapp_url, "https://wa.me/56950199703"],
  ["wa contacto cae al teléfono", d.contacto.whatsapp_url, "https://wa.me/56911112222"],
  ["tel", d.contacto.telefono_url, "tel:+56911112222"],
  ["instagram", d.contacto.instagram_url, "https://instagram.com/valinor"],
  ["mapa por dirección", d.contacto.mapa_url, "https://www.google.com/maps/search/?api=1&query=Calle%201%2C%20Ciudad"],
  ["imagen por defecto", d.portada.imagen, "/sitio-template/hero.jpg"],
  ["posición", d.portada.imagen_posicion, "30% 60%"],
  ["plan 1 una línea", d.planes[0].incluye_una_linea, "Acceso libre"],
  ["plan 2 lista", d.planes[1].incluye_varias, ["A", "B", "C"]],
  ["plan nombre codificado", d.planes[0].nombre_codificado, "Hola%2C%20quiero%20el%20plan%20B%C3%A1sico"],
  ["razones máx 3 y sin vacías", d.razones.length, 3],
  ["galería descarta esquema inseguro", d.galeria.length, 1],
  ["inicial", d.equipo[0].inicial, "F"],
  ["año", d.anio, 2026],
  ["equipo_descripcion recortada", d.equipo_descripcion, "Somos un equipo"],
  ["javascript: no es url", urlHttpSegura("javascript:alert(1)"), ""],
  ["instagram javascript:", derivarDatosTemplate({ ...base, contacto: { ...base.contacto, instagram: "javascript:alert(1)" } }, "verde", "x").contacto.instagram_url, ""],
  ["mapa javascript: cae a búsqueda", derivarDatosTemplate({ ...base, ubicacion: { direccion: "X", mapa_url: "javascript:1" } }, "verde", "x").contacto.mapa_url.startsWith("https://www.google.com/maps"), true],
  ["sin teléfono ni wa → #contacto", derivarDatosTemplate({ ...base, hero: { ...base.hero, cta_whatsapp: "" }, contacto: { ...base.contacto, telefono: "" } }, "verde", "x").portada.whatsapp_url, "#contacto"],
  ["acento hex legado", normalizarAcento("#8b5cf6"), "morado"],
  ["acento desconocido", normalizarAcento("#123456"), "turquesa"],
  ["acento válido", normalizarAcento("rosado"), "rosado"],
];
let fallos = 0;
for (const [n, got, esp] of casos) {
  const ok = JSON.stringify(got) === JSON.stringify(esp);
  if (!ok) fallos++;
  console.log(ok ? "PASS" : "FAIL", n, ok ? "" : `(esperado ${JSON.stringify(esp)}, obtuvo ${JSON.stringify(got)})`);
}
process.exit(fallos ? 1 : 0);
