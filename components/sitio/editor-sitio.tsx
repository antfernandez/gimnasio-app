"use client";

import { Check, ExternalLink, History, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  guardarBorrador,
  listarVersiones,
  publicarSitio,
  restaurarVersion,
  type VersionSitio,
} from "@/app/protected/sitio/actions";
import { ICONOS } from "@/components/sitio/iconos-servicio";
import { BotonSubirAGaleria, ImageUploader } from "@/components/sitio/image-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACENTOS,
  ICONOS_SERVICIO,
  MEDIDAS_PORTADA,
  MAX_DESCRIPCION_EQUIPO,
  TITULOS_SECCION as T,
  normalizarAcento,
  type AcentoSitio,
  type ContenidoSitio,
  type ItemEquipo,
  type ItemHorario,
  type ItemPorQueElegirnos,
  type ItemServicio,
  type ItemTarifa,
  type ItemTestimonio,
} from "@/lib/sitio";
import { IMAGEN_PORTADA_POR_DEFECTO } from "@/lib/sitio-template";
import { cn } from "@/lib/utils";

const AUTOGUARDADO_MS = 1200;

function ListaEditable<T>({
  items,
  onChange,
  nuevoItem,
  addLabel,
  max,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  nuevoItem: () => T;
  addLabel: string;
  max?: number;
  children: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const actualizar = (i: number, patch: Partial<T>) => {
    const copia = items.slice();
    copia[i] = { ...copia[i], ...patch };
    onChange(copia);
  };
  const eliminar = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="relative rounded-[9px] border border-input p-4 pr-10">
          <button
            type="button"
            onClick={() => eliminar(i)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
            aria-label="Eliminar"
          >
            <X className="h-4 w-4" />
          </button>
          {children(item, (patch) => actualizar(i, patch))}
        </div>
      ))}
      {max !== undefined && items.length >= max ? (
        <p className="text-xs text-muted-foreground">Máximo {max}.</p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...items, nuevoItem()])}
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

function Seccion({
  titulo,
  descripcion,
  children,
  abiertaPorDefecto = false,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
  abiertaPorDefecto?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <details open={abiertaPorDefecto}>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {titulo}
          </summary>
          {descripcion && (
            <p className="mb-4 mt-1 text-xs text-muted-foreground">{descripcion}</p>
          )}
          <div className="mt-4">{children}</div>
        </details>
      </CardContent>
    </Card>
  );
}

export function EditorSitio({
  gimnasioId,
  slug,
  contenidoInicial,
  colorAcentoInicial,
  publicadoAtInicial,
}: {
  gimnasioId: string;
  slug: string | null;
  contenidoInicial: ContenidoSitio;
  colorAcentoInicial: AcentoSitio;
  publicadoAtInicial: string | null;
}) {
  const [contenido, setContenido] = useState(contenidoInicial);
  const [colorAcento, setColorAcento] = useState<AcentoSitio>(colorAcentoInicial);
  const [guardando, setGuardando] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState<Date | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [publicadoAt, setPublicadoAt] = useState(publicadoAtInicial);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const [versiones, setVersiones] = useState<VersionSitio[] | null>(null);
  const [cargandoVersiones, setCargandoVersiones] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Valores tal cual llegaron del servidor — no una bandera de "primer render", que el
  // doble-invoke de efectos de React Strict Mode en desarrollo vuelve poco confiable
  // (el ref ya queda en `false` tras la primera invocación, así que la segunda
  // dispara un autoguardado fantasma sin cambios reales). Comparar contra esto en vez
  // de contra un booleano es inmune a eso: `contenido`/`tema`/`colorAcento` solo dejan
  // de ser referencia-igual a lo inicial cuando el usuario edita algo de verdad.
  const inicialRef = useRef({ contenido: contenidoInicial, colorAcento: colorAcentoInicial });

  useEffect(() => {
    const sinCambios =
      contenido === inicialRef.current.contenido &&
      colorAcento === inicialRef.current.colorAcento;
    if (sinCambios) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setGuardando(true);
      setErrorGuardado(null);
      const res = await guardarBorrador(colorAcento, contenido);
      setGuardando(false);
      if (res.ok) setGuardadoEn(new Date());
      else setErrorGuardado(res.error);
    }, AUTOGUARDADO_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [contenido, colorAcento]);

  const handlePublicar = async () => {
    setPublicando(true);
    const res = await publicarSitio();
    setPublicando(false);
    if (res.ok) setPublicadoAt(res.publicadoAt);
  };

  const abrirVersiones = async () => {
    if (versiones) {
      setVersiones(null);
      return;
    }
    setCargandoVersiones(true);
    setVersiones(await listarVersiones());
    setCargandoVersiones(false);
  };

  const handleRestaurar = async (version: VersionSitio) => {
    setRestaurando(version.id);
    const res = await restaurarVersion(version.id);
    setRestaurando(null);
    if (res.ok) {
      setContenido(version.contenido);
      setColorAcento(normalizarAcento(version.color_acento));
      setGuardadoEn(new Date());
      setVersiones(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[9px] border border-border bg-secondary/40 px-5 py-4">
        <div className="text-sm text-muted-foreground">
          {guardando ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando borrador…
            </span>
          ) : errorGuardado ? (
            <span className="text-destructive">{errorGuardado}</span>
          ) : guardadoEn ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> Borrador guardado{" "}
              {guardadoEn.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            "Los cambios se guardan solos."
          )}
          <div className="mt-0.5">
            {publicadoAt
              ? `Publicado por última vez ${new Date(publicadoAt).toLocaleString("es-CL")}`
              : "Todavía no has publicado tu sitio."}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={abrirVersiones}>
            <History className="h-4 w-4" />
            {cargandoVersiones ? "Cargando…" : "Versiones anteriores"}
          </Button>
          {slug && publicadoAt && (
            <Button asChild variant="outline" size="sm">
              <a href={`/g/${slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Ver sitio público
              </a>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/vista-previa-sitio" target="_blank">
              Vista previa
            </Link>
          </Button>
          <Button type="button" size="sm" disabled={publicando} onClick={handlePublicar}>
            {publicando ? "Publicando…" : "Publicar cambios"}
          </Button>
        </div>
      </div>

      {!slug && (
        <div className="rounded-[9px] border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Tu gimnasio todavía no tiene un enlace público (slug). Escríbenos para
          asignarte uno antes de compartir tu sitio.
        </div>
      )}

      {versiones && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Últimas versiones publicadas
            </h3>
            {versiones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay versiones publicadas.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {versiones.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-[9px] px-3.5 py-2.5 text-sm hover:bg-primary/10"
                  >
                    <span>{new Date(v.created_at).toLocaleString("es-CL")}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={restaurando === v.id}
                      onClick={() => handleRestaurar(v)}
                    >
                      {restaurando === v.id ? "Restaurando…" : "Restaurar al borrador"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Seccion titulo="Apariencia" abiertaPorDefecto>
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label>Color de acento</Label>
            <div className="flex flex-wrap gap-2">
              {ACENTOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.nombre}
                  aria-label={a.nombre}
                  aria-pressed={colorAcento === a.id}
                  onClick={() => setColorAcento(a.id)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform",
                    colorAcento === a.id
                      ? "border-secondary-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: a.color }}
                >
                  {colorAcento === a.id && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion titulo={T.portada} abiertaPorDefecto>
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label>Imagen de portada</Label>
            <div className="rounded-[9px] border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Medidas a considerar</p>
              <ul className="mt-1 list-disc pl-4">
                <li>
                  Tamaño recomendado: <strong>{MEDIDAS_PORTADA.ancho} x {MEDIDAS_PORTADA.alto} px</strong>, formato{" "}
                  {MEDIDAS_PORTADA.formato}. Se muestra a todo el ancho de la página.
                </li>
                <li>Formatos PNG, JPG o WebP; hasta {MEDIDAS_PORTADA.pesoMaxMb} MB.</li>
                <li>{MEDIDAS_PORTADA.zonaSegura}</li>
                <li>Puedes arrastrar la foto para elegir qué parte queda visible.</li>
              </ul>
            </div>
            <div className="w-full max-w-[560px]">
            <ImageUploader
              gimnasioId={gimnasioId}
              value={contenido.hero.imagen_url}
              onChange={(url) =>
                setContenido({ ...contenido, hero: { ...contenido.hero, imagen_url: url } })
              }
              aspecto="aspect-[11/4]"
              dimensionesRecomendadas={{ ancho: MEDIDAS_PORTADA.ancho, alto: MEDIDAS_PORTADA.alto }}
              posicion={{ x: contenido.hero.imagen_pos_x, y: contenido.hero.imagen_pos_y }}
              onPosicionChange={(pos) =>
                setContenido({
                  ...contenido,
                  hero: { ...contenido.hero, imagen_pos_x: pos.x, imagen_pos_y: pos.y },
                })
              }
            />
            </div>
            {!contenido.hero.imagen_url && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática local */}
                <img
                  src={IMAGEN_PORTADA_POR_DEFECTO}
                  alt="Foto por defecto"
                  className="h-12 w-32 rounded-[6px] border border-input object-cover"
                />
                <span>Mientras no subas una foto, el sitio muestra esta foto por defecto.</span>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Título</Label>
            <Input
              value={contenido.hero.titulo}
              onChange={(e) =>
                setContenido({ ...contenido, hero: { ...contenido.hero, titulo: e.target.value } })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Firma bajo el nombre (opcional)</Label>
            <Input
              placeholder="by Flavia Reyes"
              value={contenido.hero.firma}
              onChange={(e) =>
                setContenido({ ...contenido, hero: { ...contenido.hero, firma: e.target.value } })
              }
            />
            <p className="text-xs text-muted-foreground">Se muestra en cursiva bajo el nombre, arriba a la izquierda.</p>
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo</Label>
            <Textarea
              className="min-h-[70px]"
              value={contenido.hero.subtitulo}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  hero: { ...contenido.hero, subtitulo: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Texto del botón</Label>
              <Input
                value={contenido.hero.cta_texto}
                onChange={(e) =>
                  setContenido({
                    ...contenido,
                    hero: { ...contenido.hero, cta_texto: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>WhatsApp del botón</Label>
              <p className="text-xs text-muted-foreground">Si lo dejas vacío se usa el WhatsApp de contacto y, si tampoco existe, el teléfono.</p>
              <Input
                placeholder="+56 9 0000 0000"
                value={contenido.hero.cta_whatsapp}
                onChange={(e) =>
                  setContenido({
                    ...contenido,
                    hero: { ...contenido.hero, cta_whatsapp: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion titulo={T.servicios} descripcion="Ej. Musculación, spinning, box. Cada servicio puede llevar imagen arriba, icono junto al título y un párrafo.">
        <ListaEditable<ItemServicio>
          items={contenido.servicios}
          onChange={(servicios) => setContenido({ ...contenido, servicios })}
          nuevoItem={() => ({ nombre: "", descripcion: "", icono: "", imagen_url: null })}
          addLabel="Agregar servicio"
        >
          {(item, update) => (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Imagen (opcional, va arriba · recomendado 800 x 450 px, 16:9, hasta 5 MB)
                </Label>
                <div className="w-full max-w-[320px]">
                  <ImageUploader
                    gimnasioId={gimnasioId}
                    value={item.imagen_url}
                    onChange={(url) => update({ imagen_url: url })}
                    aspecto="aspect-video"
                    dimensionesRecomendadas={{ ancho: 800, alto: 450 }}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Icono junto al título (opcional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => update({ icono: "" })}
                    aria-pressed={item.icono === ""}
                    className={cn(
                      "rounded-[9px] border px-2.5 py-1.5 text-xs",
                      item.icono === "" ? "border-secondary-foreground bg-secondary" : "border-input hover:bg-secondary",
                    )}
                  >
                    Sin icono
                  </button>
                  {ICONOS_SERVICIO.map((id) => {
                    const { Icono, nombre } = ICONOS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        title={nombre}
                        aria-label={nombre}
                        aria-pressed={item.icono === id}
                        onClick={() => update({ icono: id })}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-[9px] border",
                          item.icono === id ? "border-secondary-foreground bg-secondary" : "border-input hover:bg-secondary",
                        )}
                      >
                        <Icono className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <Input
                placeholder="Nombre del servicio"
                value={item.nombre}
                onChange={(e) => update({ nombre: e.target.value })}
              />
              <Textarea
                placeholder="Descripción breve"
                className="min-h-[60px]"
                value={item.descripcion}
                onChange={(e) => update({ descripcion: e.target.value })}
              />
            </div>
          )}
        </ListaEditable>
      </Seccion>

      <Seccion
        titulo={T.planes}
        descripcion="En “Qué incluye” puedes escribir una línea (se muestra como descripción) o varias (se muestran como lista de beneficios con check)."
      >
        <ListaEditable<ItemTarifa>
          items={contenido.tarifas}
          onChange={(tarifas) => setContenido({ ...contenido, tarifas })}
          nuevoItem={() => ({ plan: "", precio: "", descripcion: "", destacado: false })}
          addLabel="Agregar plan"
        >
          {(item, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Nombre del plan"
                value={item.plan}
                onChange={(e) => update({ plan: e.target.value })}
              />
              <Input
                placeholder="Precio (ej. $25.000/mes)"
                value={item.precio}
                onChange={(e) => update({ precio: e.target.value })}
              />
              <Textarea
                placeholder="Qué incluye"
                className="min-h-[60px] sm:col-span-2"
                value={item.descripcion}
                onChange={(e) => update({ descripcion: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
                <Checkbox
                  checked={item.destacado ?? false}
                  onCheckedChange={(v) => update({ destacado: v === true })}
                />
                Destacar como &ldquo;Más elegido&rdquo;
              </label>
            </div>
          )}
        </ListaEditable>
      </Seccion>

      <Seccion titulo={T.nosotros} descripcion="Texto de presentación del gimnasio/estudio.">
        <div className="grid gap-2">
          <Label>Texto</Label>
          <Textarea
            className="min-h-[140px]"
            value={contenido.sobre_nosotros ?? ""}
            onChange={(e) =>
              setContenido({ ...contenido, sobre_nosotros: e.target.value })
            }
          />
        </div>
      </Seccion>

      <Seccion titulo={T.razones} descripcion="Hasta 3 razones, cada una con título y una frase, que aparecen bajo “Sobre nosotros”.">
        <ListaEditable<ItemPorQueElegirnos>
          items={contenido.por_que_elegirnos}
          onChange={(por_que_elegirnos) => setContenido({ ...contenido, por_que_elegirnos })}
          nuevoItem={() => ({ titulo: "", texto: "" })}
          addLabel="Agregar razón"
          max={3}
        >
          {(item, update) => (
            <div className="grid gap-3">
              <Input
                placeholder="Título (ej. Coaching real)"
                value={item.titulo}
                onChange={(e) => update({ titulo: e.target.value })}
              />
              <Textarea
                placeholder="Frase breve"
                className="min-h-[60px]"
                value={item.texto}
                onChange={(e) => update({ texto: e.target.value })}
              />
            </div>
          )}
        </ListaEditable>
      </Seccion>

      <Seccion titulo={T.galeria} descripcion="El texto (caption) aparece sobre la foto en el carrusel. Si no hay fotos, la sección no se muestra en el sitio.">
        <div className="flex flex-col gap-4">
          {contenido.galeria.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {contenido.galeria.map((foto, i) => (
                <div key={i} className="relative flex flex-col gap-2">
                  <div className="relative aspect-square overflow-hidden rounded-[9px] border border-input">
                    {/* eslint-disable-next-line @next/next/no-img-element -- host de Supabase Storage no está allowlisteado para next/image */}
                    <img src={foto.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setContenido({
                          ...contenido,
                          galeria: contenido.galeria.filter((_, idx) => idx !== i),
                        })
                      }
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Quitar foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="Caption (opcional)"
                    value={foto.caption}
                    onChange={(e) => {
                      const galeria = contenido.galeria.slice();
                      galeria[i] = { ...galeria[i], caption: e.target.value };
                      setContenido({ ...contenido, galeria });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <BotonSubirAGaleria
            gimnasioId={gimnasioId}
            onUploaded={(url) =>
              setContenido({ ...contenido, galeria: [...contenido.galeria, { url, caption: "" }] })
            }
          />
        </div>
      </Seccion>

      <Seccion titulo={T.equipo} descripcion="La descripción se muestra bajo el título, antes de las tarjetas.">
        <div className="mb-5 grid gap-2">
          <Label>Descripción del equipo</Label>
          <Textarea
            className="min-h-[90px]"
            maxLength={MAX_DESCRIPCION_EQUIPO}
            value={contenido.equipo_descripcion}
            onChange={(e) =>
              setContenido({ ...contenido, equipo_descripcion: e.target.value.slice(0, MAX_DESCRIPCION_EQUIPO) })
            }
          />
          <p className="text-right text-xs text-muted-foreground">
            {contenido.equipo_descripcion.length}/{MAX_DESCRIPCION_EQUIPO}
          </p>
        </div>
        <ListaEditable<ItemEquipo>
          items={contenido.equipo}
          onChange={(equipo) => setContenido({ ...contenido, equipo })}
          nuevoItem={() => ({ nombre: "", rol: "", foto_url: null })}
          addLabel="Agregar integrante"
        >
          {(item, update) => (
            <div className="grid gap-3 sm:grid-cols-[96px_1fr]">
              <ImageUploader
                gimnasioId={gimnasioId}
                value={item.foto_url}
                onChange={(url) => update({ foto_url: url })}
                aspecto="aspect-square"
              />
              <div className="grid gap-3">
                <Input
                  placeholder="Nombre"
                  value={item.nombre}
                  onChange={(e) => update({ nombre: e.target.value })}
                />
                <Input
                  placeholder="Rol (ej. Instructor de spinning)"
                  value={item.rol}
                  onChange={(e) => update({ rol: e.target.value })}
                />
              </div>
            </div>
          )}
        </ListaEditable>
      </Seccion>

      <Seccion titulo={T.testimonios}>
        <ListaEditable<ItemTestimonio>
          items={contenido.testimonios}
          onChange={(testimonios) => setContenido({ ...contenido, testimonios })}
          nuevoItem={() => ({ nombre: "", texto: "" })}
          addLabel="Agregar testimonio"
        >
          {(item, update) => (
            <div className="grid gap-3">
              <Input
                placeholder="Nombre del alumno"
                value={item.nombre}
                onChange={(e) => update({ nombre: e.target.value })}
              />
              <Textarea
                placeholder="Qué dijo"
                className="min-h-[60px]"
                value={item.texto}
                onChange={(e) => update({ texto: e.target.value })}
              />
            </div>
          )}
        </ListaEditable>
      </Seccion>

      <Seccion titulo={T.pie}
        descripcion="Todo el pie del sitio sale de acá; el contacto ya no tiene una sección aparte. Los horarios del pie son los del bloque Horarios.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Dirección</Label>
            <Input
              value={contenido.ubicacion.direccion}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  ubicacion: { ...contenido.ubicacion, direccion: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Enlace al mapa (opcional)</Label>
            <Input
              placeholder="https://maps.google.com/..."
              value={contenido.ubicacion.mapa_url}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  ubicacion: { ...contenido.ubicacion, mapa_url: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Teléfono</Label>
            <Input
              value={contenido.contacto.telefono}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  contacto: { ...contenido.contacto, telefono: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Correo</Label>
            <Input
              type="email"
              value={contenido.contacto.email}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  contacto: { ...contenido.contacto, email: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Instagram</Label>
            <Input
              placeholder="@tu_gimnasio"
              value={contenido.contacto.instagram}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  contacto: { ...contenido.contacto, instagram: e.target.value },
                })
              }
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Título de la columna izquierda</Label>
            <Input
              value={contenido.pie.titulo_visita}
              onChange={(e) => setContenido({ ...contenido, pie: { ...contenido.pie, titulo_visita: e.target.value } })}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Título de la columna derecha</Label>
            <Input
              value={contenido.pie.titulo_contacto}
              onChange={(e) => setContenido({ ...contenido, pie: { ...contenido.pie, titulo_contacto: e.target.value } })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Texto del botón de WhatsApp</Label>
            <Input
              value={contenido.pie.texto_boton}
              onChange={(e) => setContenido({ ...contenido, pie: { ...contenido.pie, texto_boton: e.target.value } })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Texto legal</Label>
            <Input
              value={contenido.pie.texto_legal}
              onChange={(e) => setContenido({ ...contenido, pie: { ...contenido.pie, texto_legal: e.target.value } })}
            />
            <p className="text-xs text-muted-foreground">Puedes usar {"{anio}"} y {"{titulo}"}.</p>
          </div>
          <div className="grid gap-2">
            <Label>WhatsApp</Label>
            <Input
              placeholder="+56 9 0000 0000"
              value={contenido.contacto.whatsapp}
              onChange={(e) =>
                setContenido({
                  ...contenido,
                  contacto: { ...contenido.contacto, whatsapp: e.target.value },
                })
              }
            />
          </div>
        </div>
        <div className="mt-6 grid gap-2">
          <Label>Horarios (se muestran en la columna izquierda del pie)</Label>
          <ListaEditable<ItemHorario>
            items={contenido.horarios}
            onChange={(horarios) => setContenido({ ...contenido, horarios })}
            nuevoItem={() => ({ dia: "", horario: "" })}
            addLabel="Agregar horario"
          >
            {(item, update) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Ej. Lunes a viernes"
                  value={item.dia}
                  onChange={(e) => update({ dia: e.target.value })}
                />
                <Input
                  placeholder="Ej. 07:00 - 22:00"
                  value={item.horario}
                  onChange={(e) => update({ horario: e.target.value })}
                />
              </div>
            )}
          </ListaEditable>
        </div>
      </Seccion>
    </div>
  );
}
