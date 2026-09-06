import { FileSpreadsheet, FileText, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Botón "Exportar" (Sprint 20): descarga siempre el respaldo completo del recurso
 * (todas las filas del gimnasio), sin importar el filtro activo en pantalla — ver
 * nota en cada ruta de `app/api/export/*`.
 */
export function ExportMenu({ resource }: { resource: "alumnos" | "pagos" | "bitacora" }) {
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
          <a href={`/api/export/${resource}?format=xlsx`}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel (.xlsx)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/export/${resource}?format=pdf`}>
            <FileText className="h-4 w-4" />
            PDF
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
