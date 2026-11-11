import Image from "next/image";

import { imagenZona } from "@/lib/zona-imagen";
import { cn } from "@/lib/utils";

/** Silueta con la zona trabajada resaltada. No renderiza nada si la zona no tiene imagen. */
export function ZonaImagen({
  zona,
  className,
}: {
  zona: string | null | undefined;
  className?: string;
}) {
  const src = imagenZona(zona);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={`Zona trabajada: ${zona}`}
      width={514}
      height={760}
      className={cn("h-auto rounded-[9px] bg-secondary/40", className)}
    />
  );
}
