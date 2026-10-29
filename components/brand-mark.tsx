import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  href = "/",
  fijo = false,
  grande = false,
}: {
  className?: string;
  href?: string;
  /** Spec 25: en el panel y el portal el logo es una imagen fija, sin link ni hover,
   * y ~17 % más grande que en las pantallas de acceso. */
  fijo?: boolean;
  /** Spec 36: versión ampliada para las pantallas de login. */
  grande?: boolean;
}) {
  const Wrapper = fijo ? "div" : Link;
  return (
    <Wrapper
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/logo-valinor.png"
        alt="Valinor Estudio"
        width={56}
        height={56}
        className={cn(
          "shrink-0 rounded-full object-cover shadow-sm",
          grande ? "h-20 w-20" : fijo ? "h-14 w-14" : "h-12 w-12",
        )}
        priority
      />
      <span
        className={cn(
          "font-display leading-none tracking-[0.06em] text-secondary-foreground",
          grande ? "text-[2.25rem]" : fijo ? "text-[1.65rem]" : "text-[1.4rem]",
        )}
      >
        VALINOR
        <span className={cn("block font-sans font-semibold tracking-[0.3em] text-muted-foreground", grande ? "text-[0.8rem]" : "text-[0.55rem]")}>
          ESTUDIO
        </span>
      </span>
    </Wrapper>
  );
}
