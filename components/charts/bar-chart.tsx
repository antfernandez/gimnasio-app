import { formatFecha } from "@/lib/format";

export type BarChartPoint = { x: string; y: number };

type Props = {
  data: BarChartPoint[];
  /** Etiqueta corta del valor (ej. " kg"). */
  unidad?: string;
  height?: number;
};

const WIDTH = 640;

/** Gráfico de barras en SVG inline, una barra por registro ordenada por fecha
 * y con el valor como etiqueta. Mismo criterio que `LineChart`: sin dependencia externa. */
export function BarChart({ data, unidad = "", height = 200 }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-[9px] border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        Todavía no hay registros de peso para graficar.
      </div>
    );
  }

  const puntos = [...data].sort((a, b) => (a.x < b.x ? -1 : 1));
  const yMax = Math.max(...puntos.map((p) => p.y));

  const padX = 12;
  const padTop = 20;
  const padBottom = 24;
  const innerW = WIDTH - padX * 2;
  const innerH = height - padTop - padBottom;
  const paso = innerW / puntos.length;
  const ancho = Math.min(48, paso * 0.6);
  // Con muchas barras las etiquetas de fecha se espacian para no encimarse.
  const cadaN = Math.ceil(puntos.length / 8);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={`Gráfico de barras de peso${unidad ? ` en ${unidad.trim()}` : ""}`}
    >
      <line
        x1={padX}
        y1={padTop + innerH}
        x2={WIDTH - padX}
        y2={padTop + innerH}
        stroke="hsl(var(--border))"
      />
      {puntos.map((p, i) => {
        const h = (p.y / yMax) * innerH;
        const cx = padX + paso * i + paso / 2;
        return (
          <g key={`${p.x}-${i}`}>
            <rect
              x={cx - ancho / 2}
              y={padTop + innerH - h}
              width={ancho}
              height={h}
              rx={3}
              fill="hsl(var(--primary))"
            >
              <title>
                {formatFecha(p.x)}: {p.y}
                {unidad}
              </title>
            </rect>
            <text
              x={cx}
              y={padTop + innerH - h - 5}
              textAnchor="middle"
              className="text-[10px] text-muted-foreground"
              fill="currentColor"
            >
              {p.y}
            </text>
            {i % cadaN === 0 && (
              <text
                x={cx}
                y={height - 6}
                textAnchor="middle"
                className="text-[10px] text-muted-foreground"
                fill="currentColor"
              >
                {formatFecha(p.x)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
