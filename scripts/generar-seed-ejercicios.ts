// Script one-off: parsea los MD de `.claude/ejercicios/` y genera
// `lib/ejercicios-seed.ts` (02_spec_catalogo_ejercicios.md §8.1).
//
//   node scripts/generar-seed-ejercicios.ts
//
// La app nunca lee `.claude/` en runtime: el archivo generado va versionado.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Seed = {
  zona: string;
  nombre: string;
  subgrupo: string | null;
  equipo: string | null;
  musculo_principal: string | null;
  musculos_secundarios: string | null;
  posicion_inicial: string | null;
  ejecucion: string | null;
  notas: string | null;
  url_referencia: string | null;
};

const ROOT = join(import.meta.dirname, "..");
const DIR = join(ROOT, ".claude", "ejercicios");

// Orden de zonas del seed; `n` es el conteo esperado por MD (§2).
const ARCHIVOS: { zona: string; archivo: string; n: number; formato: "tabla" | "espalda" }[] = [
  { zona: "Pectorales", archivo: "pectorales", n: 12, formato: "tabla" },
  { zona: "Espalda", archivo: "espalda", n: 23, formato: "espalda" },
  { zona: "Hombros", archivo: "hombros", n: 19, formato: "tabla" },
  { zona: "Bíceps", archivo: "biceps", n: 14, formato: "tabla" },
  { zona: "Tríceps", archivo: "triceps", n: 13, formato: "tabla" },
  { zona: "Piernas", archivo: "piernas", n: 51, formato: "tabla" },
  { zona: "Gemelos", archivo: "gemelos", n: 2, formato: "tabla" },
  { zona: "Abdominales", archivo: "abdominales", n: 9, formato: "tabla" },
];

const CARDIO: Seed[] = [
  ["Bicicleta estática", "Bicicleta estática", "15 minutos, ritmo moderado"],
  ["Cinta / trote", "Cinta de correr", "20 minutos"],
  ["Salto a la cuerda", "Cuerda de saltar", "1 minuto por serie"],
].map(([nombre, equipo, notas]) => ({
  zona: "Cardio",
  nombre,
  subgrupo: null,
  equipo,
  musculo_principal: null,
  musculos_secundarios: null,
  posicion_inicial: null,
  ejecucion: null,
  notas,
  url_referencia: null,
}));

/** "No indicado" / "—" → null; quita marcas ⚠️ y espacios sobrantes. */
function limpio(v: string | undefined): string | null {
  if (v === undefined) return null;
  const t = v.replace(/⚠️/g, "").replace(/\s+/g, " ").trim();
  if (!t || t === "—" || t === "-" || /^no indicado$/i.test(t)) return null;
  return t;
}

function unir(lineas: string[]): string | null {
  return lineas.length ? lineas.join("\n") : null;
}

function parseTabla(md: string, zona: string): Seed[] {
  const bloques = md.split(/^## (?=\d+\. )/m).slice(1);
  return bloques.map((bloque) => {
    const lineas = bloque.split("\n");
    const nombre = lineas[0].replace(/^\d+\.\s*/, "").trim();
    const url = bloque.match(/^\[Ver ficha\]\(([^)]+)\)/m)?.[1] ?? null;

    const secciones: Record<string, string[]> = {};
    const advertencias: string[] = [];
    let actual: string | null = null;
    let fila: string[] | null = null;
    let tablaVista = 0;

    for (const raw of lineas.slice(1)) {
      const l = raw.trim();
      const h = l.match(/^\*\*(.+)\*\*$/);
      if (h) {
        actual = h[1];
        secciones[actual] ??= [];
        continue;
      }
      if (l.startsWith("|")) {
        actual = null;
        tablaVista++;
        // fila 1 = encabezado, 2 = separador, 3 = datos
        if (tablaVista === 3) fila = l.split("|").slice(1, -1).map((c) => c.trim());
        continue;
      }
      if (l.startsWith(">")) {
        actual = null;
        advertencias.push(l.replace(/^>\s*/, "").replace(/⚠️\s*/g, "").trim());
        continue;
      }
      if (l === "---" || l === "") continue;
      if (actual && l.startsWith("- ")) {
        const txt = l.slice(2).trim();
        // Viñetas que son solo una advertencia de la fuente van a notas.
        if (txt.startsWith("⚠️")) advertencias.push(txt.replace(/⚠️\s*/g, "").trim());
        else secciones[actual].push(txt);
      }
    }

    const notas: string[] = [];
    if (secciones["Durante todo el movimiento"]?.length) {
      notas.push("Durante todo el movimiento:", ...secciones["Durante todo el movimiento"]);
    }
    notas.push(...advertencias);

    return {
      zona,
      nombre,
      subgrupo: null,
      equipo: limpio(fila?.[0]),
      musculo_principal: limpio(fila?.[1]),
      musculos_secundarios: limpio(fila?.[2]),
      posicion_inicial: unir(secciones["Posición inicial"] ?? []),
      ejecucion: unir(secciones["Ejecución"] ?? []),
      notas: unir(notas),
      url_referencia: url,
    };
  });
}

function parseEspalda(md: string, zona: string): Seed[] {
  // Resumen: equipo / principal / secundarios por número.
  const resumen = new Map<number, string[]>();
  for (const l of md.split("\n")) {
    const m = l.match(/^\|\s*(\d+)\s*\|(.+)\|\s*$/);
    if (m) resumen.set(Number(m[1]), m[2].split("|").map((c) => c.trim()));
  }

  // "Por categoría": "- **Remos:** 1, 3, 5" → subgrupo por número.
  const subgrupos = new Map<number, string>();
  const cat = md.split("### Por categoría")[1]?.split("---")[0] ?? "";
  for (const l of cat.split("\n")) {
    const m = l.match(/^- \*\*([^:*]+):\*\*\s*([\d,\s]+)$/);
    if (!m) continue;
    const nombre = m[1].replace(/\s*\(.*\)$/, "").trim();
    for (const n of m[2].split(",")) subgrupos.set(Number(n.trim()), nombre);
  }

  const bloques = md.split(/^### (?=\d+\. )/m).slice(1);
  return bloques.map((bloque) => {
    const lineas = bloque.split("\n");
    const num = Number(lineas[0].match(/^(\d+)\./)![1]);
    const nombre = lineas[0].replace(/^\d+\.\s*/, "").trim();
    const campo = (etiqueta: string) =>
      lineas
        .find((l) => l.startsWith(`- **${etiqueta}:**`))
        ?.replace(`- **${etiqueta}:**`, "")
        .trim();
    const r = resumen.get(num) ?? [];
    const equipo = limpio(r[1]);
    return {
      zona,
      nombre,
      subgrupo: subgrupos.get(num) ?? null,
      equipo: equipo ? equipo.charAt(0).toUpperCase() + equipo.slice(1) : null,
      musculo_principal: limpio(r[2]),
      musculos_secundarios: limpio(r[3]),
      posicion_inicial: limpio(campo("Posición inicial")),
      ejecucion: limpio(campo("Ejecución")),
      notas: limpio(campo("Nota")),
      url_referencia: lineas.join("\n").match(/\[Ver gu[ií]a\]\(([^)]+)\)/)?.[1] ?? null,
    };
  });
}

const ejercicios: Seed[] = [];
for (const { zona, archivo, n, formato } of ARCHIVOS) {
  const md = readFileSync(join(DIR, `ejercicios-${archivo}.md`), "utf8");
  const lista = formato === "espalda" ? parseEspalda(md, zona) : parseTabla(md, zona);
  if (lista.length !== n) {
    throw new Error(`${zona}: se esperaban ${n} ejercicios y salieron ${lista.length}`);
  }
  ejercicios.push(...lista);
}
ejercicios.push(...CARDIO);

// Verificación obligatoria (§8.1.4)
if (ejercicios.length !== 146) throw new Error(`Total ${ejercicios.length} ≠ 146`);
const vistos = new Set<string>();
for (const e of ejercicios) {
  if (!e.nombre) throw new Error(`Ejercicio sin nombre en ${e.zona}`);
  const k = `${e.zona}|${e.nombre}`;
  if (vistos.has(k)) throw new Error(`Duplicado: ${k}`);
  vistos.add(k);
}

const zonas = [
  ...ARCHIVOS.map((a) => ({ nombre: a.zona, es_sistema: false })),
  { nombre: "Cardio", es_sistema: true },
  { nombre: "Personalizados", es_sistema: true },
].map((z, i) => ({ ...z, orden: i + 1 }));

const salida = `// GENERADO por scripts/generar-seed-ejercicios.ts a partir de
// .claude/ejercicios/*.md (fuente: Simply Fitness, redacción adaptada).
// No editar a mano: regenerar con \`node scripts/generar-seed-ejercicios.ts\`.
// "Cardio" se escribe en el script (no viene de un MD).

export type ZonaSeed = { nombre: string; orden: number; es_sistema: boolean };

export type EjercicioSeed = {
  zona: string;
  nombre: string;
  subgrupo: string | null;
  equipo: string | null;
  musculo_principal: string | null;
  musculos_secundarios: string | null;
  posicion_inicial: string | null;
  ejecucion: string | null;
  notas: string | null;
  url_referencia: string | null;
};

export const ZONAS_SEED: ZonaSeed[] = ${JSON.stringify(zonas, null, 2)};

export const EJERCICIOS_SEED: EjercicioSeed[] = ${JSON.stringify(ejercicios, null, 2)};
`;
writeFileSync(join(ROOT, "lib", "ejercicios-seed.ts"), salida);

const conteo = new Map<string, number>();
for (const e of ejercicios) conteo.set(e.zona, (conteo.get(e.zona) ?? 0) + 1);
console.log(Object.fromEntries(conteo), "total", ejercicios.length);
