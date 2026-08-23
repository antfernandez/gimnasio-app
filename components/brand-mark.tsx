import { Dumbbell } from "lucide-react";
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
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Dumbbell className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <span className="font-display text-[1.4rem] leading-none tracking-[0.06em] text-secondary-foreground">
        VALINOR
        <span className="block text-[0.55rem] font-sans font-semibold tracking-[0.3em] text-muted-foreground">
          ESTUDIO
        </span>
      </span>
    </Link>
  );
}
