"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
/* eslint-disable @next/next/no-img-element -- URL firmada de Storage, ya comprimida */
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "recetas-fotos";

/** Foto opcional de la receta (spec 51). Comprime en el navegador y sube directo a Storage;
 * el formulario solo envía la ruta en el campo oculto `foto_path` (vacío = sin foto). */
export function RecetaFotoInput({
  gimnasioId,
  fotoPath,
  fotoUrl,
}: {
  gimnasioId: string;
  fotoPath: string | null;
  fotoUrl: string | null;
}) {
  const [path, setPath] = useState(fotoPath ?? "");
  const [url, setUrl] = useState(fotoUrl);
  const [subida, setSubida] = useState<string | null>(null); // ruta subida en esta sesión
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Una foto subida y descartada antes de guardar no queda huérfana en Storage.
  const borrarSubidaPrevia = async () => {
    if (subida) await createClient().storage.from(BUCKET).remove([subida]);
    setSubida(null);
  };

  const elegir = async (file: File) => {
    setError(null);
    setSubiendo(true);
    try {
      const { blob, extension } = await comprimirImagen(file);
      const supabase = createClient();
      const ruta = `${gimnasioId}/${crypto.randomUUID()}.${extension}`;
      const { error: errSubida } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, blob, { contentType: blob.type, cacheControl: "3600" });
      if (errSubida) throw errSubida;
      await borrarSubidaPrevia();
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 3600);
      setPath(ruta);
      setSubida(ruta);
      setUrl(data?.signedUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const quitar = async () => {
    await borrarSubidaPrevia();
    setPath("");
    setUrl(null);
  };

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Foto del plato</span>
      <input type="hidden" name="foto_path" value={path} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void elegir(f);
        }}
      />
      {path && url ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-[9px] border border-border">
          <img src={url} alt="Foto de la preparación" className="aspect-[4/3] w-full object-cover" />
          <button
            type="button"
            onClick={quitar}
            aria-label="Quitar foto"
            className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-foreground shadow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div>
        <Button type="button" variant="outline" size="sm" disabled={subiendo} onClick={() => inputRef.current?.click()}>
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {path ? "Cambiar foto" : "Subir foto"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Se reduce automáticamente (máx. 1280 px y 500 KB). Formatos JPG, PNG o WEBP.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
