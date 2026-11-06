"use client";

import { useEffect, useState } from "react";

/** Encabezado del sitio (Spec 71). Es cliente sólo por el menú móvil: reemplaza el
 * `<script>` inline del template, que la CSP (spec 65) no debe tener que permitir. */
export interface EnlaceMenu {
  href: string;
  texto: string;
}

export function EncabezadoSitio({
  titulo,
  firma,
  enlaces,
  seccionIds,
}: {
  titulo: string;
  firma: string;
  enlaces: EnlaceMenu[];
  /** Ids de las secciones del cuerpo, en orden, para saber dónde está el usuario. */
  seccionIds: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState<string | null>(null);

  useEffect(() => {
    const MARGEN_PX = 140;
    const calcular = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        setActiva("contacto");
        return;
      }
      let actual: string | null = null;
      for (const id of seccionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= MARGEN_PX) actual = id;
      }
      setActiva(actual);
    };
    calcular();
    window.addEventListener("scroll", calcular, { passive: true });
    window.addEventListener("resize", calcular);
    return () => {
      window.removeEventListener("scroll", calcular);
      window.removeEventListener("resize", calcular);
    };
  }, [seccionIds]);
  const cerrar = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "A") setAbierto(false);
  };

  return (
    <header className="site-header">
      <div className="wrap header-in">
        <a className="brand" href="#inicio">
          {/* eslint-disable-next-line @next/next/no-img-element -- icono estático de la marca */}
          <img src="/logo-valinor.png" alt="" width={72} height={72} />
          <span className="brand-texto">
            <span className="brand-nombre">{titulo}</span>
            {firma && <em className="brand-firma">{firma}</em>}
          </span>
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          aria-controls="nav-sitio"
          onClick={() => setAbierto((v) => !v)}
        >
          ☰
        </button>
        <nav className={abierto ? "nav abierto" : "nav"} id="nav-sitio" onClick={cerrar}>
          {enlaces.map((e) => (
            <a
              key={e.href}
              href={e.href}
              className={activa === e.href.slice(1) ? "activo" : undefined}
              aria-current={activa === e.href.slice(1) ? "location" : undefined}
            >
              {e.texto}
            </a>
          ))}
          <a className="btn btn-sm" href="/auth/login">
            Iniciar sesión
          </a>
        </nav>
      </div>
    </header>
  );
}
