import PDFDocument from "pdfkit";

export interface PdfColumn {
  header: string;
  key: string;
  /** Peso relativo del ancho de columna (por defecto 1) — no un valor absoluto. */
  width?: number;
  align?: "left" | "right" | "center";
}

/** Genera un PDF tabular simple (título + tabla con salto de página automático) —
 * pdfkit no trae un helper de tabla como jspdf-autotable, así que el layout de
 * columnas/filas se calcula acá a mano. Usado por las rutas de exportación
 * (Sprint 20) para alumnos, pagos y bitácoras. */
export function buildPdfBuffer({
  title,
  subtitle,
  columns,
  rows,
}: {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: Record<string, string | number | null>[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text(title);
    if (subtitle) {
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica").fillColor("#555555").text(subtitle);
      doc.fillColor("#000000");
    }
    doc.moveDown(0.8);

    const startX = doc.page.margins.left;
    const usableWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const totalWeight = columns.reduce((sum, c) => sum + (c.width ?? 1), 0);
    const colWidths = columns.map(
      (c) => (usableWidth * (c.width ?? 1)) / totalWeight,
    );
    const headerHeight = 22;
    const rowHeight = 20;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;

    function drawHeader(y: number) {
      let x = startX;
      doc.fontSize(9).font("Helvetica-Bold");
      columns.forEach((col, i) => {
        doc.text(col.header, x + 4, y + 6, {
          width: colWidths[i] - 8,
          align: col.align ?? "left",
        });
        x += colWidths[i];
      });
      doc
        .moveTo(startX, y + headerHeight)
        .lineTo(startX + usableWidth, y + headerHeight)
        .strokeColor("#999999")
        .stroke();
      doc.font("Helvetica").fillColor("#000000");
    }

    let y = doc.y;
    drawHeader(y);
    y += headerHeight + 4;

    rows.forEach((row) => {
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += headerHeight + 4;
      }
      let x = startX;
      doc.fontSize(8.5).font("Helvetica");
      columns.forEach((col, i) => {
        const value = row[col.key];
        doc.text(value === null || value === undefined ? "" : String(value), x + 4, y + 4, {
          width: colWidths[i] - 8,
          align: col.align ?? "left",
        });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    if (rows.length === 0) {
      doc
        .fontSize(10)
        .fillColor("#666666")
        .text("Sin datos para exportar.", startX, y + 6);
    }

    doc.end();
  });
}
