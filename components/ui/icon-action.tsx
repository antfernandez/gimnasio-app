import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  icon: LucideIcon;
  /** Texto del tooltip y del `aria-label`. */
  label: string;
  href?: string;
  /** Enlace a un sitio externo: se abre en otra pestaña con `<a>`. */
  externo?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

/** Botón de solo icono con tooltip CSS (hover/focus); enlace si recibe `href`. */
export function IconAction({ icon: Icon, label, href, externo, onClick, disabled }: Props) {
  const contenido = <Icon className="h-4 w-4" />;

  return (
    <span className="group relative inline-flex">
      {href ? (
        <Button asChild variant="ghost" size="icon">
          {externo ? (
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
              {contenido}
            </a>
          ) : (
            <Link href={href} aria-label={label}>
              {contenido}
            </Link>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {contenido}
        </Button>
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
