"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Sube directo a Supabase Storage desde el navegador (sesión del dueño, gobernada por
 * las políticas RLS de `storage.objects` de la migración 0005) — no pasa por un server
 * action, evita mandar el archivo completo por el body de una acción de servidor. */
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
 * imagen actual con opción de quitarla, o el botón de subida si no hay ninguna. */
export function ImageUploader({
  gimnasioId,
  value,
  onChange,
  aspecto = "aspect-video",
}: {
  gimnasioId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspecto?: string;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div>
      {value ? (
        <div className={`relative ${aspecto} overflow-hidden rounded-[9px] border border-input`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- host de Supabase Storage no está allowlisteado para next/image */}
          <img src={value} alt="" className="h-full w-full object-cover" />
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
