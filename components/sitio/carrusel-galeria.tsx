"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Foto {
  imagen: string;
  caption: string;
}

const INTERVALO_MS = 5500;
const UMBRAL_SWIPE_PX = 40;

/** Cantidad de fotos visibles según el ancho (móvil 1, tablet 2, escritorio 3). */
function useFotosPorVista() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const calcular = () => setN(window.innerWidth >= 1000 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    calcular();
    window.addEventListener("resize", calcular);
    return () => window.removeEventListener("resize", calcular);
  }, []);
  return n;
}

/** Carrusel de la galería (Spec 71 §10.3): botones, puntos, swipe, teclado, ciclo continuo y
 * rotación lenta que se pausa con mouse/foco y se desactiva con `prefers-reduced-motion`. */
/* eslint-disable @next/next/no-img-element -- Supabase Storage no está allowlisteado para next/image */
export function CarruselGaleria({ fotos }: { fotos: Foto[] }) {
  const porVista = useFotosPorVista();
  const [inicio, setInicio] = useState(0);
  const [pausado, setPausado] = useState(false);
  const xInicial = useRef<number | null>(null);

  const paginas = Math.max(1, fotos.length - porVista + 1);
  const actual = Math.min(inicio, paginas - 1);
  const hayControles = paginas > 1;

  const ir = useCallback((i: number) => setInicio(((i % paginas) + paginas) % paginas), [paginas]);

  useEffect(() => {
    if (!hayControles || pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setInicio((p) => (Math.min(p, paginas - 1) + 1) % paginas), INTERVALO_MS);
    return () => clearInterval(id);
  }, [hayControles, pausado, paginas]);

  return (
    <div
      className="galeria"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Galería de fotos"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") ir(actual - 1);
        if (e.key === "ArrowRight") ir(actual + 1);
      }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div
        className="galeria-vista"
        onPointerDown={(e) => {
          xInicial.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (xInicial.current === null) return;
          const dx = e.clientX - xInicial.current;
          xInicial.current = null;
          if (Math.abs(dx) > UMBRAL_SWIPE_PX) ir(actual + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          xInicial.current = null;
        }}
      >
        <div
          className={hayControles ? "galeria-pista" : "galeria-pista galeria-centrada"}
          style={hayControles ? { transform: `translateX(-${(actual * 100) / porVista}%)` } : undefined}
        >
          {fotos.map((f, i) => (
            <figure
              className="galeria-slide"
              key={i}
              style={{ flexBasis: `${100 / porVista}%` }}
              aria-hidden={i < actual || i >= actual + porVista}
            >
              <div className="galeria-marco">
                <img src={f.imagen} alt={f.caption} loading="lazy" draggable={false} />
                {f.caption && <figcaption>{f.caption}</figcaption>}
              </div>
            </figure>
          ))}
        </div>
      </div>

      {hayControles && (
        <>
          <button type="button" className="galeria-nav galeria-prev" aria-label="Foto anterior" onClick={() => ir(actual - 1)}>
            ‹
          </button>
          <button type="button" className="galeria-nav galeria-next" aria-label="Foto siguiente" onClick={() => ir(actual + 1)}>
            ›
          </button>
          <div className="galeria-puntos">
            {Array.from({ length: paginas }, (_, i) => (
              <button
                type="button"
                key={i}
                className={i === actual ? "punto activo" : "punto"}
                aria-label={`Ir a la posición ${i + 1} de ${paginas}`}
                aria-current={i === actual}
                onClick={() => ir(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
