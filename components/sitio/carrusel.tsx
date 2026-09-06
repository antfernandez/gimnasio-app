"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Carrusel horizontal con auto-scroll + dots + botones prev/next, igual que
 * `.carousel-track`/`.carousel-nav`/`.dots` del template — usado por Programas
 * (intervalMs=4500) y Galería (intervalMs=5200) en Sprint 21 Parte C. */
export function Carrusel<T>({
  items,
  renderItem,
  intervalMs,
  itemClassName = "",
  trackClassName = "",
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  intervalMs: number;
  itemClassName?: string;
  trackClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState(0);

  const irA = useCallback((i: number) => {
    const track = trackRef.current;
    const hijo = track?.children[i] as HTMLElement | undefined;
    if (!track || !hijo) return;
    track.scrollTo({ left: hijo.offsetLeft - track.offsetLeft, behavior: "smooth" });
    setActivo(i);
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setActivo((prev) => {
        const siguiente = (prev + 1) % items.length;
        irA(siguiente);
        return siguiente;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs, irA]);

  if (items.length === 0) return null;

  const mover = (dir: 1 | -1) => irA((activo + dir + items.length) % items.length);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className={`flex gap-[22px] overflow-x-auto px-1 pb-6 pt-1.5 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${trackClassName}`}
      >
        {items.map((item, i) => (
          <div key={i} className={`shrink-0 [scroll-snap-align:start] ${itemClassName}`}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2.5">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => mover(-1)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--sitio-line)] text-[var(--sitio-ink-gold)] transition-colors hover:border-[var(--sitio-accent)] hover:bg-[var(--sitio-accent)]/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="mx-2 flex items-center gap-[7px]">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === activo ? "w-[18px] bg-[var(--sitio-accent)]" : "w-1.5 bg-[var(--sitio-line)]"}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => mover(1)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--sitio-line)] text-[var(--sitio-ink-gold)] transition-colors hover:border-[var(--sitio-accent)] hover:bg-[var(--sitio-accent)]/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
