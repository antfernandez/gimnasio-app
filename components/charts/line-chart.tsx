import { formatFecha } from "@/lib/format";

export type LineChartPoint = { x: string | Date; y: number };

type Props = {
  data: LineChartPoint[];
  /** Etiqueta corta para el eje Y (ej. "kg", "reps"). */
  unidad?: string;
  height?: number;
};

const WIDTH = 640;

function xKey(x: string | Date): string {
  return x instanceof Date ? x.toISOString().slice(0, 10) : x;
}

function xLabel(x: string | Date): string {
  const iso = xKey(x);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? formatFecha(iso) : iso;
}

/** Gráfico de línea genérico en SVG inline — sin dependencia externa (evita el
 * riesgo de incompatibilidad de peer-deps con Next/React 19 en este repo, ver
 * sprint-13-ajustes-post-sprint-12.md, Parte D). */
export function LineChart({ data, unidad, height = 180 }: Props) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-[9px] border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        Todavía no hay suficientes registros para graficar.
      </div>
    );
  }

  const puntos = [...data].sort((a, b) => (xKey(a.x) < xKey(b.x) ? -1 : 1));
  const valores = puntos.map((p) => p.y);
  const yMin = Math.min(...valores);
  const yMax = Math.max(...valores);
  const rango = yMax - yMin || 1;

  const padLeft = 40;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 24;
  const innerW = WIDTH - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const coords = puntos.map((p, i) => {
    const x = padLeft + (puntos.length === 1 ? innerW / 2 : (i / (puntos.length - 1)) * innerW);
    const y = padTop + innerH - ((p.y - yMin) / rango) * innerH;
    return { x, y, p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1].x.toFixed(1)},${padTop + innerH} L${coords[0].x.toFixed(1)},${padTop + innerH} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={`Gráfico de línea${unidad ? ` en ${unidad}` : ""}`}
    >
      <line
        x1={padLeft}
        y1={padTop}
        x2={padLeft}
        y2={padTop + innerH}
        stroke="hsl(var(--border))"
      />
      <line
        x1={padLeft}
        y1={padTop + innerH}
        x2={WIDTH - padRight}
        y2={padTop + innerH}
        stroke="hsl(var(--border))"
      />

      <text x={4} y={padTop + 4} className="text-[10px] text-muted-foreground" fill="currentColor">
        {yMax.toFixed(1)}
        {unidad}
      </text>
      <text x={4} y={padTop + innerH} className="text-[10px] text-muted-foreground" fill="currentColor">
        {yMin.toFixed(1)}
        {unidad}
      </text>

      <path d={area} fill="hsl(var(--primary) / 0.12)" stroke="none" />
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill="hsl(var(--primary))">
          <title>
            {xLabel(c.p.x)}: {c.p.y}
            {unidad}
          </title>
        </circle>
      ))}

      <text x={padLeft} y={height - 6} className="text-[10px] text-muted-foreground" fill="currentColor">
        {xLabel(puntos[0].x)}
      </text>
      <text
        x={WIDTH - padRight}
        y={height - 6}
        textAnchor="end"
        className="text-[10px] text-muted-foreground" fill="currentColor"
      >
        {xLabel(puntos[puntos.length - 1].x)}
      </text>
    </svg>
  );
}
