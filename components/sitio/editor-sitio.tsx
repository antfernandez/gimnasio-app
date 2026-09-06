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
import { BotonSubirAGaleria, ImageUploader } from "@/components/sitio/image-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACENTOS,
  type ContenidoSitio,
  type ItemEquipo,
  type ItemHorario,
  type ItemPorQueElegirnos,
  type ItemServicio,
  type ItemTarifa,
  type ItemTestimonio,
  type TemaSitio,
} from "@/lib/sitio";
import { cn } from "@/lib/utils";

const AUTOGUARDADO_MS = 1200;

function ListaEditable<T>({
  items,
  onChange,
  nuevoItem,
  addLabel,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  nuevoItem: () => T;
  addLabel: string;
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
  temaInicial,
  colorAcentoInicial,
  publicadoAtInicial,
}: {
  gimnasioId: string;
  slug: string | null;
  contenidoInicial: ContenidoSitio;
  temaInicial: TemaSitio;
  colorAcentoInicial: string;
  publicadoAtInicial: string | null;
}) {
  const [contenido, setContenido] = useState(contenidoInicial);
  const [tema, setTema] = useState(temaInicial);
  const [colorAcento, setColorAcento] = useState(colorAcentoInicial);
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
  const inicialRef = useRef({ contenido: contenidoInicial, tema: temaInicial, colorAcento: colorAcentoInicial });

  useEffect(() => {
    const sinCambios =
      contenido === inicialRef.current.contenido &&
      tema === inicialRef.current.tema &&
      colorAcento === inicialRef.current.colorAcento;
    if (sinCambios) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setGuardando(true);
      setErrorGuardado(null);
      const res = await guardarBorrador(tema, colorAcento, contenido);
      setGuardando(false);
      if (res.ok) setGuardadoEn(new Date());
      else setErrorGuardado(res.error);
    }, AUTOGUARDADO_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [contenido, tema, colorAcento]);

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
      setTema(version.tema as TemaSitio);
      setColorAcento(version.color_acento);
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
            <Label>Tema</Label>
            <div className="flex gap-3">
              {(["oscuro", "claro"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTema(t)}
                  className={cn(
                    "rounded-[9px] border px-4 py-2 text-sm capitalize transition-colors",
                    tema === t
                      ? "border-primary bg-primary/10 text-secondary-foreground"
                      : "border-input text-muted-foreground hover:border-secondary-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Color de acento</Label>
            <div className="flex flex-wrap gap-2">
              {ACENTOS.map((a) => (
                <button
                  key={a.valor}
                  type="button"
                  title={a.nombre}
                  onClick={() => setColorAcento(a.valor)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform",
                    colorAcento === a.valor
                      ? "border-secondary-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: a.valor }}
                >
                  {colorAcento === a.valor && (
                    <Check className="h-4 w-4" style={{ color: a.ink }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Hero (portada)" abiertaPorDefecto>
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label>Imagen de portada</Label>
            <ImageUploader
              gimnasioId={gimnasioId}
              value={contenido.hero.imagen_url}
              onChange={(url) =>
                setContenido({ ...contenido, hero: { ...contenido.hero, imagen_url: url } })
              }
            />
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

      <Seccion titulo="Sobre nosotros" descripcion="Texto de presentación del gimnasio/estudio.">
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

      <Seccion titulo="Servicios" descripcion="Ej. Musculación, spinning, box.">
        <ListaEditable<ItemServicio>
          items={contenido.servicios}
          onChange={(servicios) => setContenido({ ...contenido, servicios })}
          nuevoItem={() => ({ nombre: "", descripcion: "" })}
          addLabel="Agregar servicio"
        >
          {(item, update) => (
            <div className="grid gap-3">
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

      <Seccion titulo="Horarios">
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
      </Seccion>

      <Seccion
        titulo="Planes y tarifas"
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

      <Seccion titulo="Por qué elegirnos" descripcion="3 razones cortas que aparecen junto a “Sobre nosotros”.">
        <ListaEditable<ItemPorQueElegirnos>
          items={contenido.por_que_elegirnos}
          onChange={(por_que_elegirnos) => setContenido({ ...contenido, por_que_elegirnos })}
          nuevoItem={() => ({ titulo: "", texto: "" })}
          addLabel="Agregar razón"
        >
          {(item, update) => (
            <div className="grid gap-3">
              <Input
                placeholder="Título (ej. Coaching real)"
                value={item.titulo}
                onChange={(e) => update({ titulo: e.target.value })}
              />
              <Textarea
                placeholder="Texto breve"
                className="min-h-[60px]"
                value={item.texto}
                onChange={(e) => update({ texto: e.target.value })}
              />
            </div>
          )}
        </ListaEditable>
      </Seccion>

      <Seccion titulo="Galería de fotos" descripcion="El texto (caption) aparece sobre la foto en el carrusel del sitio.">
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

      <Seccion titulo="Testimonios">
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

      <Seccion titulo="Equipo / instructores">
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

      <Seccion titulo="Ubicación y contacto">
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
      </Seccion>
    </div>
  );
}
