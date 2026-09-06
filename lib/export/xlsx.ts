import ExcelJS from "exceljs";

export interface XlsxColumn {
  header: string;
  key: string;
  width?: number;
}

/** Genera un .xlsx de una sola hoja a partir de columnas tipadas y filas planas —
 * usado por las rutas de exportación (Sprint 20) para alumnos, pagos y bitácoras. */
export async function buildXlsxBuffer({
  sheetName,
  columns,
  rows,
}: {
  sheetName: string;
  columns: XlsxColumn[];
  rows: Record<string, string | number | null>[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Valinor Estudio";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 20,
  }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
