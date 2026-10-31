import {
  ArchiveRestore,
  ArchiveX,
  Banknote,
  Eye,
  MessageCircle,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Color representativo por icono (spec 50); WhatsApp usa el verde de marca. */
const COLOR_POR_ICONO = new Map<LucideIcon, string>([
  [MessageCircle, "text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#1da851]"],
  [Pencil, "text-blue-600 hover:bg-blue-600/10 hover:text-blue-700"],
  [Eye, "text-sky-600 hover:bg-sky-600/10 hover:text-sky-700"],
  [Trash2, "text-red-600 hover:bg-red-600/10 hover:text-red-700"],
  [ArchiveX, "text-amber-600 hover:bg-amber-600/10 hover:text-amber-700"],
  [ArchiveRestore, "text-emerald-600 hover:bg-emerald-600/10 hover:text-emerald-700"],
  [Banknote, "text-emerald-700 hover:bg-emerald-700/10 hover:text-emerald-800"],
  [UserX, "text-red-600 hover:bg-red-600/10 hover:text-red-700"],
  [UserCheck, "text-emerald-600 hover:bg-emerald-600/10 hover:text-emerald-700"],
]);

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
  const color = COLOR_POR_ICONO.get(Icon) ?? "";

  return (
    <span className="group relative inline-flex">
      {href ? (
        <Button asChild variant="ghost" size="icon" className={color}>
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
          className={color}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {contenido}
        </Button>
      )}
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full mb-1 z-10 hidden w-max max-w-[11rem] whitespace-normal rounded-md bg-foreground px-2 py-1 text-center text-xs text-background group-focus-within:block group-hover:block ${
          tooltipDerecha ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
