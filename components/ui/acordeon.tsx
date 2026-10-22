import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  /** Encabezado siempre visible; actúa como disparador. */
  titulo: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

/** Acordeón nativo (`<details>/<summary>`), colapsado por defecto. */
export function Acordeon({ titulo, children, defaultOpen, className }: Props) {
  return (
    <details open={defaultOpen} className={cn("group", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">{titulo}</div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
