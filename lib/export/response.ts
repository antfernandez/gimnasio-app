import { NextResponse } from "next/server";

import { buildPdfBuffer, type PdfColumn } from "@/lib/export/pdf";
import { buildXlsxBuffer, type XlsxColumn } from "@/lib/export/xlsx";

export type ExportFormat = "xlsx" | "pdf";

export function parseExportFormat(value: string | null): ExportFormat | null {
  return value === "xlsx" || value === "pdf" ? value : null;
}

/** Arma la respuesta descargable (.xlsx o .pdf) a partir de las mismas columnas y
 * filas — comparte la lógica entre las tres rutas de exportación del Sprint 20. */
export async function buildExportResponse({
  format,
  filename,
  sheetName,
  title,
  subtitle,
  columns,
  rows,
}: {
  format: ExportFormat;
  filename: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: (XlsxColumn & PdfColumn)[];
  rows: Record<string, string | number | null>[];
}): Promise<NextResponse> {
  if (format === "xlsx") {
    const buffer = await buildXlsxBuffer({ sheetName, columns, rows });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const buffer = await buildPdfBuffer({ title, subtitle, columns, rows });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
