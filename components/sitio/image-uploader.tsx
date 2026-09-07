"use client";

import { ImagePlus, Loader2, Move, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type DimensionesRecomendadas = { ancho: number; alto: number };

export type PosicionImagen = { x: number; y: number };

/** Sube directo a Supabase Storage desde el navegador (sesión del dueño, gobernada por
 * las políticas RLS de `storage.objects` de la migración 0005) — no pasa por un server
 * action, evita mandar el archivo completo por el body de una acción de servidor.
 * Las dimensiones recomendadas son solo una guía (mostrada en el botón de subida):
 * no se valida el tamaño ni la proporción real del archivo, para no bloquear al dueño
 * si su foto no viene exactamente recortada — para eso está el ajuste de posición. */
async function subirImagenSitio(gimnasioId: string, file: File): Promise<string> {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error("Formato no admitido. Usa PNG, JPG, WEBP o GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen pesa más de 5MB.");
  }

  const supabase = createClient();
  const nombreLimpio = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const ruta = `${gimnasioId}/${crypto.randomUUID()}-${nombreLimpio}`;
  const { error } = await supabase.storage
    .from("sitio-imagenes")
    .upload(ruta, file, { cacheControl: "3600" });
  if (error) throw error;

  const { data } = supabase.storage.from("sitio-imagenes").getPublicUrl(ruta);
  return data.publicUrl;
}

/** Selector de una sola imagen (hero, foto de un integrante del equipo): muestra la
 * imagen actual con opción de quitarla, o el botón de subida si no hay ninguna.
 * Cuando se pasan `posicion`/`onPosicionChange` (portada), la imagen se puede arrastrar
 * para mover su `object-position` — así el dueño puede encuadrarla a su gusto sin
 * depender de que el archivo venga recortado exactamente en la proporción del hero. */
export function ImageUploader({
  gimnasioId,
  value,
  onChange,
  aspecto = "aspect-video",
  dimensionesRecomendadas,
  posicion,
  onPosicionChange,
}: {
  gimnasioId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspecto?: string;
  dimensionesRecomendadas?: DimensionesRecomendadas;
  posicion?: PosicionImagen;
  onPosicionChange?: (posicion: PosicionImagen) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const arrastrando = useRef(false);
  const puedeReposicionar = Boolean(onPosicionChange);

  const handleFile = async (file: File) => {
    setError(null);
    setSubiendo(true);
    try {
      onChange(await subirImagenSitio(gimnasioId, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  const moverPosicion = (target: HTMLElement, clientX: number, clientY: number) => {
    if (!onPosicionChange) return;
    const rect = target.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    onPosicionChange({ x: Math.round(x), y: Math.round(y) });
  };

  return (
    <div>
      {value ? (
        <div className={`relative ${aspecto} overflow-hidden rounded-[9px] border border-input`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- host de Supabase Storage no está allowlisteado para next/image */}
          <img
            src={value}
            alt=""
            draggable={false}
            className={`h-full w-full object-cover ${puedeReposicionar ? "cursor-move touch-none select-none" : ""}`}
            style={posicion ? { objectPosition: `${posicion.x}% ${posicion.y}%` } : undefined}
            onPointerDown={(e) => {
              if (!puedeReposicionar) return;
              arrastrando.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              moverPosicion(e.currentTarget, e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!arrastrando.current) return;
              moverPosicion(e.currentTarget, e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              arrastrando.current = false;
            }}
          />
          {puedeReposicionar && (
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
              <Move className="h-3 w-3" />
              Arrastra la foto para ajustar el encuadre
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Quitar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className={`flex ${aspecto} w-full flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed border-input text-sm text-muted-foreground hover:border-secondary-foreground hover:bg-secondary disabled:opacity-50`}
        >
          {subiendo ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          {subiendo ? "Subiendo…" : "Subir imagen"}
          {dimensionesRecomendadas && !subiendo && (
            <span className="text-xs">
              Tamaño recomendado: {dimensionesRecomendadas.ancho} x {dimensionesRecomendadas.alto} px
              {puedeReposicionar && " (otros tamaños también funcionan, luego puedes ajustar el encuadre)"}
            </span>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_PERMITIDOS.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Botón para agregar una foto más a una lista (galería): no muestra preview propio,
 * solo dispara `onUploaded` con la URL para que el llamador la agregue a su arreglo. */
export function BotonSubirAGaleria({
  gimnasioId,
  onUploaded,
}: {
  gimnasioId: string;
  onUploaded: (url: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSubiendo(true);
    try {
      onUploaded(await subirImagenSitio(gimnasioId, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={subiendo}
        onClick={() => inputRef.current?.click()}
      >
        {subiendo ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {subiendo ? "Subiendo…" : "Agregar foto"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_PERMITIDOS.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
