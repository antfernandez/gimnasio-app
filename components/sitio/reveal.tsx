"use client";

import { useEffect, useRef, useState } from "react";

/** Replica el patrón `.reveal`/`.reveal.in` del template (`IntersectionObserver`,
 * `threshold:.15`, opacity+translateY) — Sprint 21 Parte C. Una vez visible se
 * desconecta el observer: como el template, no vuelve a ocultarse al salir del
 * viewport. */
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}
