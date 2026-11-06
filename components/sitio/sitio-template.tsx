import { CarruselGaleria } from "@/components/sitio/carrusel-galeria";
import { ICONOS } from "@/components/sitio/iconos-servicio";
import { EncabezadoSitio } from "@/components/sitio/encabezado-sitio";
import "@/components/sitio/sitio-template.css";
import { iconoServicioValido, TITULOS_SECCION as T, type AcentoSitio, type ContenidoSitio } from "@/lib/sitio";
import { asignarFondos, derivarDatosTemplate, type IdSeccion } from "@/lib/sitio-template";

/* Spec 71: sitio público con el template Valinor (.claude/docs generales/valinor-template/
 * template.html). Cada dato sale de `derivarDatosTemplate`; el texto se escapa por JSX
 * (no se usa dangerouslySetInnerHTML). Las secciones sin datos no se renderizan.
 * Las imágenes vienen de Supabase Storage (host no allowlisteado para next/image). */
/* eslint-disable @next/next/no-img-element */
export function SitioTemplate({
  nombreGimnasio,
  acento,
  contenido,
}: {
  nombreGimnasio: string;
  acento: AcentoSitio;
  contenido: ContenidoSitio;
}) {
  const d = derivarDatosTemplate(contenido, acento, nombreGimnasio);
  const { portada, contacto } = d;
  const waExterno = portada.whatsapp_url.startsWith("https://");

  const visibles: IdSeccion[] = [];
  if (d.servicios.length) visibles.push("servicios");
  if (d.planes.length) visibles.push("planes");
  if (d.nosotros.texto) visibles.push("nosotros");
  if (d.razones.length) visibles.push("razones");
  if (d.galeria.length) visibles.push("galeria");
  if (d.equipo.length) visibles.push("equipo");
  if (d.testimonios.length) visibles.push("testimonios");
  const fondos = asignarFondos(visibles);
  const bg = (id: IdSeccion) => `sec bg-${fondos[id]}`;

  // Menú (Spec 71 §14.1): sólo estas secciones, si están habilitadas, + Contacto (el pie).
  const EN_MENU: IdSeccion[] = ["servicios", "planes", "nosotros", "equipo"];
  const enlaces = [
    ...visibles.filter((id) => EN_MENU.includes(id)).map((id) => ({ href: `#${id}`, texto: T[id] })),
    { href: "#contacto", texto: "Contacto" },
  ];
  const idsCuerpo = [...visibles, "contacto"];

  return (
    <div className="sv" data-acento={d.apariencia.acento} lang="es">
      <EncabezadoSitio titulo={portada.titulo} firma={portada.firma} enlaces={enlaces} seccionIds={idsCuerpo} />

      <main>
        <section className="hero" id="inicio">
          <img
            className="hero-img"
            src={portada.imagen}
            alt={portada.titulo}
            style={{ objectPosition: portada.imagen_posicion }}
          />
          <div className="hero-overlay" />
          <div className="wrap hero-in">
            <h1>{portada.titulo}</h1>
            {portada.subtitulo && <p className="hero-sub">{portada.subtitulo}</p>}
            <div className="hero-cta">
              <a className="btn" href={portada.whatsapp_url} target="_blank" rel="noopener noreferrer">
                {portada.texto_boton}
              </a>
              <a className="btn btn-outline" href="#planes">
                Ver planes y tarifas
              </a>
            </div>
          </div>
        </section>

        {d.servicios.length > 0 && (
          <section className={bg("servicios")} id="servicios">
            <div className="wrap">
              <h2>{T.servicios}</h2>
              <div className="grid grid-3">
                {d.servicios.map((s, i) => {
                  const Icono = ICONOS[iconoServicioValido(s.icono) || "mancuerna"].Icono;
                  return (
                    <article className={s.imagen ? "card servicio con-imagen" : "card servicio"} key={i}>
                      {s.imagen && <img className="servicio-img" src={s.imagen} alt={s.nombre} loading="lazy" />}
                      <h3>
                        {iconoServicioValido(s.icono) && <Icono className="servicio-icono" aria-hidden="true" />}
                        <span>{s.nombre}</span>
                      </h3>
                      <p>{s.descripcion}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {d.planes.length > 0 && (
          <section className={bg("planes")} id="planes">
            <div className="wrap">
              <h2>{T.planes}</h2>
              <div className="grid grid-3">
                {d.planes.map((p, i) => (
                  <article className={p.destacado ? "card plan plan-destacado" : "card plan"} key={i}>
                    {p.destacado && <span className="badge">Más elegido</span>}
                    <h3>{p.nombre}</h3>
                    <p className="precio">{p.precio}</p>
                    {p.incluye_una_linea && <p className="plan-desc">{p.incluye_una_linea}</p>}
                    {p.incluye_varias.length > 0 && (
                      <ul className="checks">
                        {p.incluye_varias.map((l, j) => (
                          <li key={j}>{l}</li>
                        ))}
                      </ul>
                    )}
                    <a
                      className="btn"
                      href={waExterno ? `${portada.whatsapp_url}?text=${p.nombre_codificado}` : portada.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Elegir plan
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {d.nosotros.texto && (
          <section className={bg("nosotros")} id="nosotros">
            <div className="wrap narrow center">
              <h2>{T.nosotros}</h2>
              <p className="texto-largo">{d.nosotros.texto}</p>
            </div>
          </section>
        )}

        {d.razones.length > 0 && (
          <section className={bg("razones")} id="razones">
            <div className="wrap">
              <h2>{T.razones}</h2>
              <div className="grid grid-3 razones">
                {d.razones.map((r, i) => (
                  <div className="razon" key={i}>
                    <span className="razon-n">{i + 1}</span>
                    <div>
                      {r.titulo && <strong>{r.titulo}</strong>}
                      {r.texto && <p>{r.texto}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {d.galeria.length > 0 && (
          <section className={bg("galeria")} id="galeria">
            <div className="wrap">
              <h2>{T.galeria}</h2>
              <CarruselGaleria fotos={d.galeria} />
            </div>
          </section>
        )}

        {d.equipo.length > 0 && (
          <section className={bg("equipo")} id="equipo">
            <div className="wrap">
              <h2>{T.equipo}</h2>
              {d.equipo_descripcion && <p className="equipo-desc">{d.equipo_descripcion}</p>}
              <div className="grid grid-4">
                {d.equipo.map((e, i) => (
                  <article className="persona" key={i}>
                    {e.foto ? <img src={e.foto} alt={e.nombre} loading="lazy" /> : <div className="avatar">{e.inicial}</div>}
                    <h3>{e.nombre}</h3>
                    <p className="rol">{e.rol}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {d.testimonios.length > 0 && (
          <section className="testimonios" id="testimonios">
            <img className="testimonios-fondo" src={portada.imagen} alt="" style={{ objectPosition: portada.imagen_posicion }} aria-hidden="true" />
            <div className="testimonios-velo" />
            <div className="wrap">
              <h2 className="t-titulo">{T.testimonios}</h2>
              <div className="t-grid">
                {d.testimonios.map((t, i) => (
                  <blockquote className="t-item" key={i}>
                    <p>”{t.texto}”</p>
                    <footer>— {t.nombre}</footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer" id="contacto">
        <div className="wrap footer-in">
          <div className="foot-col">
            <h6>{d.pie.titulo_visita}</h6>
            {contacto.direccion && (
              <p>
                <a href={contacto.mapa_url} target="_blank" rel="noopener noreferrer">
                  {contacto.direccion}
                </a>
              </p>
            )}
            {d.horarios.map((h, i) => (
              <p key={i}>
                {h.dia}: {h.horario}
              </p>
            ))}
            <p className="foot-links">
              {enlaces
                .filter((e) => e.href !== "#contacto")
                .map((e) => (
                  <span key={e.href}>
                    <a href={e.href}>{e.texto}</a> ·{" "}
                  </span>
                ))}
              <a href="/auth/login">Iniciar sesión</a>
            </p>
          </div>
          <div className="foot-col">
            <h6>{d.pie.titulo_contacto}</h6>
            {contacto.correo && (
              <p>
                <a href={`mailto:${contacto.correo}`}>{contacto.correo}</a>
              </p>
            )}
            {contacto.telefono && (
              <p>{contacto.telefono_url ? <a href={contacto.telefono_url}>{contacto.telefono}</a> : contacto.telefono}</p>
            )}
            {contacto.instagram && (
              <p>
                {contacto.instagram_url ? (
                  <a href={contacto.instagram_url} target="_blank" rel="noopener noreferrer">
                    {contacto.instagram}
                  </a>
                ) : (
                  contacto.instagram
                )}
              </p>
            )}
            <a className="foot-btn" href={contacto.whatsapp_url} target="_blank" rel="noopener noreferrer">
              {d.pie.texto_boton}
            </a>
          </div>
        </div>
        <p className="copy">{d.pie.texto_legal}</p>
      </footer>
    </div>
  );
}
