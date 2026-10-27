import PDFDocument from "pdfkit";

import { formatFecha } from "@/lib/format";
import { listarMedidas } from "@/lib/medidas";
import { textoPlanificado, textoRealizado, type SesionProgreso } from "@/lib/progreso";
import type { Avance } from "@/lib/types";

type Punto = { etiqueta: string; valor: number };

const COLOR = "#8a6a1f";
const GRIS = "#666666";

/** PDF de progreso de un alumno para un período (año o mes): resumen, gráficos
 * (sesiones por período y peso corporal) y tablas de detalle de bitácora y avances. */
export function buildProgresoPdf({
  alumno,
  gimnasio,
  periodo,
  sesionesPorPeriodo,
  sesiones,
  avances,
}: {
  alumno: string;
  gimnasio: string;
  periodo: string;
  /** Barras del gráfico: meses del año o semanas del mes. */
  sesionesPorPeriodo: Punto[];
  sesiones: SesionProgreso[];
  avances: Avance[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const x0 = doc.page.margins.left;
    const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const limite = () => doc.page.height - doc.page.margins.bottom;
    const asegurar = (alto: number) => {
      if (doc.y + alto > limite()) doc.addPage();
    };

    const titulo = (t: string) => {
      asegurar(40);
      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text(t, x0);
      doc.moveDown(0.4);
    };

    // Encabezado
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#000000").text(`Progreso · ${alumno}`);
    doc.font("Helvetica").fontSize(10).fillColor(GRIS).text(`${gimnasio} · ${periodo}`);
    doc.fillColor("#000000");

    // Resumen
    const registros = sesiones.reduce((n, s) => n + s.registros.length, 0);
    const pesos = avances.filter((a) => a.peso_kg != null).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    titulo("Resumen");
    doc.font("Helvetica").fontSize(10);
    doc.text(`Sesiones registradas: ${sesiones.length}`);
    doc.text(`Ejercicios registrados: ${registros}`);
    if (pesos.length > 0) {
      const ini = pesos[0].peso_kg!;
      const fin = pesos[pesos.length - 1].peso_kg!;
      doc.text(`Peso corporal: ${ini} kg → ${fin} kg (${fin - ini >= 0 ? "+" : ""}${(fin - ini).toFixed(1)} kg)`);
    }

    // Gráfico de barras: sesiones
    titulo("Sesiones por período");
    asegurar(150);
    const alto = 110;
    const y0 = doc.y + 8;
    const max = Math.max(1, ...sesionesPorPeriodo.map((p) => p.valor));
    const paso = ancho / Math.max(1, sesionesPorPeriodo.length);
    doc.moveTo(x0, y0 + alto).lineTo(x0 + ancho, y0 + alto).strokeColor("#999999").stroke();
    sesionesPorPeriodo.forEach((p, i) => {
      const h = (p.valor / max) * (alto - 14);
      const bx = x0 + i * paso + paso * 0.2;
      doc.rect(bx, y0 + alto - h, paso * 0.6, h).fillColor(COLOR).fill();
      doc.fillColor("#000000").font("Helvetica").fontSize(8);
      doc.text(String(p.valor), bx - 4, y0 + alto - h - 11, { width: paso * 0.6 + 8, align: "center" });
      doc.fillColor(GRIS).text(p.etiqueta, x0 + i * paso, y0 + alto + 4, { width: paso, align: "center" });
    });
    doc.fillColor("#000000");
    doc.y = y0 + alto + 22;

    // Gráfico de línea: peso
    titulo("Peso corporal");
    if (pesos.length < 2) {
      doc.font("Helvetica").fontSize(9).fillColor(GRIS).text("Se necesitan al menos dos registros de peso en el período.");
      doc.fillColor("#000000");
    } else {
      asegurar(150);
      const py = doc.y + 8;
      const valores = pesos.map((p) => p.peso_kg!);
      const min = Math.min(...valores);
      const maxP = Math.max(...valores);
      const rango = maxP - min || 1;
      const pts = pesos.map((p, i) => ({
        x: x0 + 30 + (i / (pesos.length - 1)) * (ancho - 40),
        y: py + (alto - 20) - ((p.peso_kg! - min) / rango) * (alto - 30),
        peso: p.peso_kg!,
        fecha: p.fecha,
      }));
      doc.moveTo(x0 + 30, py + alto - 20).lineTo(x0 + ancho, py + alto - 20).strokeColor("#999999").stroke();
      doc.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => doc.lineTo(p.x, p.y));
      doc.strokeColor(COLOR).lineWidth(1.5).stroke().lineWidth(1);
      doc.font("Helvetica").fontSize(8);
      pts.forEach((p, i) => {
        doc.circle(p.x, p.y, 2.5).fillColor(COLOR).fill();
        doc.fillColor("#000000").text(String(p.peso), p.x - 15, p.y - 12, { width: 30, align: "center" });
        if (pts.length <= 8 || i % Math.ceil(pts.length / 8) === 0) {
          doc.fillColor(GRIS).text(formatFecha(p.fecha).slice(0, 5), p.x - 18, py + alto - 14, { width: 36, align: "center" });
        }
      });
      doc.fillColor("#000000");
      doc.y = py + alto + 8;
    }

    // Tabla genérica
    const tabla = (cols: { h: string; w: number }[], filas: string[][]) => {
      const total = cols.reduce((n, c) => n + c.w, 0);
      const anchos = cols.map((c) => (c.w / total) * ancho);
      const encabezado = () => {
        const y = doc.y;
        doc.font("Helvetica-Bold").fontSize(8.5);
        let x = x0;
        cols.forEach((c, i) => {
          doc.text(c.h, x + 3, y, { width: anchos[i] - 6, lineBreak: false });
          x += anchos[i];
        });
        doc.moveTo(x0, y + 13).lineTo(x0 + ancho, y + 13).strokeColor("#999999").stroke();
        doc.y = y + 17;
      };
      encabezado();
      doc.font("Helvetica").fontSize(8.5);
      for (const fila of filas) {
        const alturas = fila.map((t, i) => doc.heightOfString(t, { width: anchos[i] - 6 }));
        const h = Math.max(...alturas) + 4;
        if (doc.y + h > limite()) {
          doc.addPage();
          encabezado();
          doc.font("Helvetica").fontSize(8.5);
        }
        const y = doc.y;
        let x = x0;
        fila.forEach((t, i) => {
          doc.text(t, x + 3, y, { width: anchos[i] - 6 });
          x += anchos[i];
        });
        doc.y = y + h;
      }
    };

    titulo("Detalle de bitácora");
    if (sesiones.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(GRIS).text("Sin sesiones registradas en el período.");
      doc.fillColor("#000000");
    } else {
      const orden = [...sesiones].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      tabla(
        [
          { h: "Fecha", w: 11 },
          { h: "Rutina", w: 17 },
          { h: "Ejercicio", w: 24 },
          { h: "Plan", w: 14 },
          { h: "Registro", w: 14 },
          { h: "Notas", w: 20 },
        ],
        orden.flatMap((s) =>
          s.registros.map((r) => [
            formatFecha(s.fecha),
            s.rutinaNombre,
            r.ejercicio,
            textoPlanificado(r),
            textoRealizado(r),
            r.notas ?? "",
          ]),
        ),
      );
    }

    titulo("Avances corporales");
    if (avances.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(GRIS).text("Sin avances registrados en el período.");
    } else {
      tabla(
        [
          { h: "Fecha", w: 12 },
          { h: "Peso", w: 10 },
          { h: "Medidas", w: 58 },
          { h: "Notas", w: 20 },
        ],
        [...avances]
          .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
          .map((a) => [
            formatFecha(a.fecha),
            a.peso_kg != null ? `${a.peso_kg} kg` : "—",
            listarMedidas(a.medidas)
              .map((m) => `${m.etiqueta} ${m.valor}`)
              .join(" · ") || "—",
            a.notas ?? "",
          ]),
      );
    }

    doc.end();
  });
}
