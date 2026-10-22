import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Follaje decorativo del template v5 (valinor-boutique-hojas-v5.html): ramas de
 * olivo/laurel con brotes de flores blancas, generadas en el servidor con un PRNG de
 * semilla fija (sin `Math.random`, sin DOM) para que SSR e hidratación coincidan.
 * Los trazados de las hojas viven una sola vez en `<RamasDefs />` (render en la raíz
 * del sitio) y cada rama los referencia con `<use>`. */

type Pt = { x: number; y: number };

const PALETAS = {
  oscuro: ["#2b3a1f", "#364a26", "#46602f", "#5a733b", "#7a9154"],
  claro: ["#5f7a3d", "#7d9a52", "#97b267", "#b3c985", "#6e8a45"],
} as const;

export function RamasDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <g id="sv-hoja-olivo">
          <path d="M0,0C-3.4,-7 -3.8,-19 0,-32C3.8,-19 3.4,-7 0,0Z" />
          <path d="M0,0C3.4,-7 3.8,-19 0,-32C1.2,-19 1.2,-7 0,0Z" fill="#fff" fillOpacity=".13" />
          <path d="M0,-1V-28" stroke="#fff" strokeOpacity=".32" strokeWidth=".6" fill="none" />
        </g>
        <g id="sv-hoja-laurel">
          <path d="M0,0C-9,-7 -10,-21 0,-36C10,-21 9,-7 0,0Z" />
          <path d="M0,0C9,-7 10,-21 0,-36C2,-21 2,-7 0,0Z" fill="#fff" fillOpacity=".12" />
          <path
            d="M0,-1V-31M0,-9L-4.4,-15M0,-9L4.4,-15M0,-18L-5,-24M0,-18L5,-24"
            stroke="#fff"
            strokeOpacity=".3"
            strokeWidth=".55"
            fill="none"
          />
        </g>
        <g id="sv-brote">
          <path
            d="M0,0L-9,-12M0,0L0,-16M0,0L9,-12M-5,-6L-11,-8M5,-6L11,-8"
            stroke="#8a7a50"
            strokeWidth=".6"
            fill="none"
          />
          <g fill="#fbf8ef">
            <circle cx="-9" cy="-12" r="2" />
            <circle cx="0" cy="-16" r="2.2" />
            <circle cx="9" cy="-12" r="2" />
            <circle cx="-11" cy="-8" r="1.5" />
            <circle cx="11" cy="-8" r="1.5" />
            <circle cx="-4" cy="-12" r="1.3" />
            <circle cx="4" cy="-13" r="1.3" />
          </g>
          <g fill="#d9ac52">
            <circle cx="-9" cy="-12" r=".7" />
            <circle cx="0" cy="-16" r=".8" />
            <circle cx="9" cy="-12" r=".7" />
          </g>
        </g>
        <symbol id="sv-destello" viewBox="-10 -10 20 20">
          <path
            d="M0,-10C1,-3 3,-1 10,0C3,1 1,3 0,10C-1,3 -3,1 -10,0C-3,-1 -1,-3 0,-10Z"
            fill="currentColor"
          />
        </symbol>
        <g id="sv-orn">
          <path d="M0,-3.4L3.4,0L0,3.4L-3.4,0Z" fill="#c9a24d" />
          <use href="#sv-hoja-olivo" transform="translate(6 0) rotate(90) scale(.4)" fill="#c9a24d" />
          <use href="#sv-hoja-olivo" transform="translate(-6 0) rotate(-90) scale(.4)" fill="#c9a24d" />
          <use href="#sv-hoja-olivo" transform="translate(5 -1) rotate(55) scale(.28)" fill="#9c7a33" />
          <use href="#sv-hoja-olivo" transform="translate(-5 -1) rotate(-55) scale(.28)" fill="#9c7a33" />
          <use href="#sv-hoja-olivo" transform="translate(5 1) rotate(125) scale(.28)" fill="#9c7a33" />
          <use href="#sv-hoja-olivo" transform="translate(-5 1) rotate(-125) scale(.28)" fill="#9c7a33" />
        </g>
      </defs>
    </svg>
  );
}

/** Destello dorado de 4 puntas; hereda el color de `currentColor`. */
export function Destello({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="-10 -10 20 20" className={className} style={style} aria-hidden="true">
      <use href="#sv-destello" />
    </svg>
  );
}

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Muestrea un trazado con comandos absolutos M / C / S en una polilínea. */
function muestrear(d: string): Pt[] {
  const t = d.match(/[MCS]|-?\d*\.?\d+/g) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  let cmd = "";
  let cur: Pt = { x: 0, y: 0 };
  let ctrl: Pt = cur;
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[MCS]/.test(t[i])) cmd = t[i++];
    if (cmd === "M") {
      cur = { x: num(), y: num() };
      ctrl = cur;
      pts.push(cur);
      cmd = "L";
    } else if (cmd === "C" || cmd === "S") {
      const p1: Pt =
        cmd === "C" ? { x: num(), y: num() } : { x: 2 * cur.x - ctrl.x, y: 2 * cur.y - ctrl.y };
      const p2: Pt = { x: num(), y: num() };
      const p3: Pt = { x: num(), y: num() };
      for (let k = 1; k <= 24; k++) {
        const u = k / 24;
        const a = (1 - u) ** 3;
        const b = 3 * (1 - u) ** 2 * u;
        const c = 3 * (1 - u) * u ** 2;
        const e = u ** 3;
        pts.push({
          x: a * cur.x + b * p1.x + c * p2.x + e * p3.x,
          y: a * cur.y + b * p1.y + c * p2.y + e * p3.y,
        });
      }
      cur = p3;
      ctrl = p2;
    } else break;
  }
  return pts;
}

interface Opciones {
  seed: number;
  step: number;
  scale: number;
  palette: keyof typeof PALETAS;
}

interface Elemento {
  tipo: "hoja" | "brote";
  href: string;
  fill?: string;
  transform: string;
}

function ramificar(d: string, o: Opciones): { elementos: Elemento[]; largo: number } {
  const pts = muestrear(d);
  const acum = [0];
  for (let k = 1; k < pts.length; k++) {
    acum.push(acum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  }
  const L = acum[acum.length - 1] || 1;
  const en = (s: number): Pt => {
    const q = Math.max(0, Math.min(L, s));
    let k = 1;
    while (k < acum.length - 1 && acum[k] < q) k++;
    const span = acum[k] - acum[k - 1] || 1;
    const f = (q - acum[k - 1]) / span;
    return {
      x: pts[k - 1].x + (pts[k].x - pts[k - 1].x) * f,
      y: pts[k - 1].y + (pts[k].y - pts[k - 1].y) * f,
    };
  };

  const r = rng(o.seed);
  const pal = PALETAS[o.palette];
  const elementos: Elemento[] = [];
  const hoja = (x: number, y: number, ang: number, sz: number) => {
    elementos.push({
      tipo: "hoja",
      href: r() < 0.6 ? "#sv-hoja-olivo" : "#sv-hoja-laurel",
      fill: pal[Math.floor(r() * pal.length)],
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${sz.toFixed(2)})`,
    });
  };

  let s = o.step * 0.3;
  while (s < L) {
    const a = en(s);
    const b = en(s + 2);
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const k = 1 - (s / L) * 0.3;
    for (const lado of [-1, 1]) {
      if (r() < 0.16) continue;
      hoja(a.x, a.y, ang + 90 + lado * (32 + r() * 32), o.scale * (0.85 + r() * 0.55) * k);
      if (r() < 0.22) {
        const rad = ((ang + 90 * lado) * Math.PI) / 180;
        elementos.push({
          tipo: "brote",
          href: "#sv-brote",
          transform: `translate(${(a.x + Math.cos(rad) * 9).toFixed(1)} ${(a.y + Math.sin(rad) * 9).toFixed(1)}) rotate(${(ang + 90 + lado * 55).toFixed(1)}) scale(${(0.9 + r() * 0.5).toFixed(2)})`,
        });
      }
    }
    s += o.step * (0.7 + r() * 0.6);
  }
  const e = en(L);
  const e2 = en(L - 2);
  hoja(e.x, e.y, (Math.atan2(e.y - e2.y, e.x - e2.x) * 180) / Math.PI + 90, o.scale * 1.15);
  return { elementos, largo: L };
}

interface RamaProps {
  viewBox: string;
  /** Trazados absolutos (M/C/S) separados por `|`. */
  paths: string;
  seed: number;
  step: number;
  scale: number;
  palette?: keyof typeof PALETAS;
  /** Posición/tamaño/visibilidad responsive (clases Tailwind). */
  className?: string;
  /** Volteo del conjunto: `espejo` (X), `vuelta` (X e Y). */
  volteo?: "espejo" | "vuelta";
}

export function Rama({ viewBox, paths, seed, step, scale, palette = "oscuro", className, volteo }: RamaProps) {
  const ramas = paths.split("|").map((d, i) => ({
    d,
    ...ramificar(d, { seed: seed + i * 7, step, scale, palette }),
  }));
  return (
    <svg
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      className={cn(
        "pointer-events-none absolute z-[1] overflow-visible",
        volteo === "espejo" && "-scale-x-100",
        volteo === "vuelta" && "-scale-100",
        className,
      )}
    >
      {ramas.map(({ d, elementos }, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="#7b6a3a" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d={d}
            fill="none"
            stroke="var(--sitio-accent, #c9a24d)"
            strokeWidth=".7"
            strokeLinecap="round"
            opacity=".7"
            transform="translate(1.6 -1)"
          />
          {elementos.map((el, j) => (
            <use key={j} href={el.href} fill={el.fill} transform={el.transform} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Separador `orn` del template: líneas doradas con degradé y rombo + hojas al centro. */
export function Orn({ className }: { className?: string }) {
  const linea = "h-px flex-1 max-w-[150px]";
  return (
    <div className={cn("mx-auto flex items-center justify-center gap-3.5", className)} aria-hidden="true">
      <span
        className={linea}
        style={{ background: "linear-gradient(90deg, transparent, var(--sitio-accent))" }}
      />
      <svg viewBox="-24 -10 48 20" className="h-5 w-12">
        <use href="#sv-orn" />
      </svg>
      <span
        className={linea}
        style={{ background: "linear-gradient(270deg, transparent, var(--sitio-accent))" }}
      />
    </div>
  );
}
