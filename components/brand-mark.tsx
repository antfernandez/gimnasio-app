import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/logo-valinor.png"
        alt="Valinor Estudio"
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full object-cover shadow-sm"
        priority
      />
      <span className="font-display text-[1.4rem] leading-none tracking-[0.06em] text-secondary-foreground">
        VALINOR
        <span className="block text-[0.55rem] font-sans font-semibold tracking-[0.3em] text-muted-foreground">
          ESTUDIO
        </span>
      </span>
    </Link>
  );
}
