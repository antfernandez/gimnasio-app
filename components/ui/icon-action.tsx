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
  /** Ancla el tooltip al borde derecho del icono (columnas pegadas al borde de una tabla). */
  tooltipDerecha?: boolean;
};

/** Botón de solo icono con tooltip CSS (hover/focus); enlace si recibe `href`. */
export function IconAction({ icon: Icon, label, href, externo, onClick, disabled, tooltipDerecha }: Props) {
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
        className={`pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-focus-within:block group-hover:block ${
          tooltipDerecha ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
