import { FileSpreadsheet, FileText, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Botón "Exportar" (Sprint 20): descarga el respaldo completo del recurso (todas las
 * filas del gimnasio). Si se pasan `filtros`, se reenvían a la ruta, que exporta todas
 * las filas que los cumplen (no solo la página visible) — ver `app/api/export/*`.
 */
export function ExportMenu({
  resource,
  filtros,
}: {
  resource: "alumnos" | "pagos" | "bitacora";
  filtros?: Record<string, string | undefined>;
}) {
  const href = (format: "xlsx" | "pdf") => {
    const qs = new URLSearchParams({ format });
    for (const [k, v] of Object.entries(filtros ?? {})) if (v) qs.set(k, v);
    return `/api/export/${resource}?${qs.toString()}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg">
          <Sheet className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={href("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel (.xlsx)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={href("pdf")}>
            <FileText className="h-4 w-4" />
            PDF
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
