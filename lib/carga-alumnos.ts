import ExcelJS from "exceljs";

import { CAMPOS_MEDIDA } from "@/lib/medidas";
import { parseRut } from "@/lib/rut";
import type { MedidasAvance } from "@/lib/types";

/** Spec 34: carga masiva de alumnos. Plantilla Excel, lectura y validación previa.
 * Todo corre en el servidor; los valores del archivo se tratan como no confiables. */

export const TEMPLATE_VERSION = "1";
export const MAX_FILAS = 200;
export const MAX_BYTES = 5 * 1024 * 1024;

const HOJA_ALUMNOS = "Alumnos";
const HOJA_LISTAS = "Listas";
const HOJA_META = "_meta";

type ColDef = {
  key: string;
  header: string;
  grupo: string;
  requerida?: boolean;
  width: number;
  ayuda: string;
  ejemplo?: string | number | Date;
};

const EJEMPLO_FECHA = new Date(Date.UTC(1990, 4, 15));

const COLUMNAS: ColDef[] = [
  { key: "rut", header: "RUT", grupo: "Identificación", requerida: true, width: 15, ayuda: "Cualquier formato (12.345.678-9). Debe ser válido y único en el gimnasio.", ejemplo: "11.111.111-1" },
  { key: "nombres", header: "Nombres", grupo: "Identificación", requerida: true, width: 20, ayuda: "Texto. La fila de ejemplo se ignora mientras este campo empiece con EJEMPLO.", ejemplo: "EJEMPLO María" },
  { key: "apellidos", header: "Apellidos", grupo: "Identificación", requerida: true, width: 20, ayuda: "Texto.", ejemplo: "Pérez Soto" },
  { key: "fecha_nacimiento", header: "Fecha de nacimiento", grupo: "Identificación", width: 18, ayuda: "DD/MM/AAAA.", ejemplo: EJEMPLO_FECHA },
  { key: "sexo", header: "Sexo", grupo: "Identificación", width: 16, ayuda: "Lista: Femenino, Masculino, Otro, Prefiere no decir.", ejemplo: "Femenino" },
  { key: "email", header: "Email", grupo: "Contacto", width: 26, ayuda: "Formato válido; único por gimnasio.", ejemplo: "maria@correo.cl" },
  { key: "telefono", header: "Teléfono", grupo: "Contacto", width: 16, ayuda: "Se normaliza a +56… (celular de 9 dígitos o con prefijo 56).", ejemplo: "9 1234 5678" },
  { key: "direccion", header: "Dirección", grupo: "Contacto", width: 26, ayuda: "Texto.", ejemplo: "Av. Principal 123" },
  { key: "comuna", header: "Comuna", grupo: "Contacto", width: 16, ayuda: "Texto.", ejemplo: "Providencia" },
  { key: "contacto_emergencia_nombre", header: "Contacto emergencia (nombre)", grupo: "Contacto", width: 24, ayuda: "Texto.", ejemplo: "Juan Pérez" },
  { key: "contacto_emergencia_telefono", header: "Contacto emergencia (teléfono)", grupo: "Contacto", width: 24, ayuda: "Mismo formato que Teléfono.", ejemplo: "9 8765 4321" },
  { key: "plan", header: "Plan", grupo: "Membresía", requerida: true, width: 20, ayuda: "Nombre de un plan vigente del gimnasio (lista desplegable).", ejemplo: "" },
  { key: "fecha_inicio", header: "Fecha de inicio", grupo: "Membresía", requerida: true, width: 16, ayuda: "DD/MM/AAAA. Si va vacía se usa la fecha de hoy.", ejemplo: new Date(Date.UTC(2026, 0, 5)) },
  { key: "estado", header: "Estado", grupo: "Membresía", width: 12, ayuda: "Activo o Inactivo. Por defecto Activo.", ejemplo: "Activo" },
  { key: "vigente_hasta", header: "Vigente hasta", grupo: "Membresía", width: 16, ayuda: "DD/MM/AAAA, opcional. Crea un pago inicial (monto del plan) que cubre desde la fecha de inicio hasta esta fecha.", ejemplo: new Date(Date.UTC(2026, 11, 31)) },
  { key: "medicion_corporal", header: "Medición corporal", grupo: "Membresía", width: 18, ayuda: "Sí o No. Por defecto No.", ejemplo: "Sí" },
  { key: "plan_nutricional", header: "Plan nutricional", grupo: "Membresía", width: 16, ayuda: "Sí o No. Por defecto No.", ejemplo: "No" },
  { key: "alergias", header: "Alergias", grupo: "Salud", width: 24, ayuda: "Texto libre; alimenta la ficha de salud.", ejemplo: "Ninguna conocida" },
  { key: "enfermedades", header: "Enfermedades", grupo: "Salud", width: 24, ayuda: "Texto libre.", ejemplo: "" },
  { key: "lesiones", header: "Lesiones", grupo: "Salud", width: 24, ayuda: "Texto libre.", ejemplo: "" },
  { key: "objetivos_salud", header: "Objetivos de salud", grupo: "Salud", width: 24, ayuda: "Texto libre.", ejemplo: "Mejorar movilidad" },
  { key: "registrar_avances", header: "Registrar avances propios", grupo: "Permisos", width: 22, ayuda: "Sí o No. Por defecto No.", ejemplo: "No" },
  { key: "registrar_bitacora", header: "Registrar bitácora propia", grupo: "Permisos", width: 22, ayuda: "Sí o No. Por defecto No.", ejemplo: "No" },
  { key: "peso_kg", header: "Peso (kg)", grupo: "Medidas iniciales", width: 12, ayuda: "Número entre 20 y 500. Si hay al menos una medida inicial se crea un avance con la fecha de inicio.", ejemplo: 62.5 },
  { key: "estatura_cm", header: "Estatura (cm)", grupo: "Medidas iniciales", width: 14, ayuda: "Número entre 50 y 260.", ejemplo: 165 },
  ...CAMPOS_MEDIDA.map<ColDef>((m) => ({
    key: m.campo,
    header: `${m.etiqueta} (cm)`,
    grupo: "Medidas iniciales",
    width: 16,
    ayuda: "Número en centímetros, mayor a 0 y menor a 300.",
  })),
  { key: "observaciones", header: "Observaciones", grupo: "Otros", width: 30, ayuda: "Texto; se guarda como nota del alumno.", ejemplo: "" },
];

const COLOR_GRUPO: Record<string, string> = {
  Identificación: "FFE8DCC8",
  Contacto: "FFDCE8D8",
  Membresía: "FFD8E2EE",
  Salud: "FFEED8D8",
  Permisos: "FFE6D8EE",
  "Medidas iniciales": "FFEEE8D0",
  Otros: "FFE4E4E4",
};

const SEXOS: { etiqueta: string; valor: string }[] = [
  { etiqueta: "Femenino", valor: "femenino" },
  { etiqueta: "Masculino", valor: "masculino" },
  { etiqueta: "Otro", valor: "otro" },
  { etiqueta: "Prefiere no decir", valor: "no_indica" },
];

export type PlanCarga = { id: string; nombre: string; precio: number | null };

function encabezado(c: ColDef): string {
  return c.requerida ? `${c.header}*` : c.header;
}

/** Texto sin tildes ni mayúsculas, para comparar cabeceras y nombres de plan. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Plantilla
// ---------------------------------------------------------------------------

export async function buildTemplateBuffer(planes: PlanCarga[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Valinor Estudio";
  wb.created = new Date();

  const hoja = wb.addWorksheet(HOJA_ALUMNOS, { views: [{ state: "frozen", ySplit: 1 }] });
  const instrucciones = wb.addWorksheet("Instrucciones");
  const listas = wb.addWorksheet(HOJA_LISTAS, { state: "hidden" });
  const meta = wb.addWorksheet(HOJA_META, { state: "veryHidden" });

  meta.getCell("A1").value = "template_version";
  meta.getCell("B1").value = TEMPLATE_VERSION;

  // Listas: A planes, B sexo, C estado, D sí/no
  listas.getCell("A1").value = "Planes vigentes";
  planes.forEach((p, i) => (listas.getCell(`A${i + 2}`).value = p.nombre));
  listas.getCell("B1").value = "Sexo";
  SEXOS.forEach((s, i) => (listas.getCell(`B${i + 2}`).value = s.etiqueta));
  listas.getCell("C1").value = "Estado";
  ["Activo", "Inactivo"].forEach((v, i) => (listas.getCell(`C${i + 2}`).value = v));
  listas.getCell("D1").value = "Sí/No";
  ["Sí", "No"].forEach((v, i) => (listas.getCell(`D${i + 2}`).value = v));

  hoja.columns = COLUMNAS.map((c) => ({ header: encabezado(c), key: c.key, width: c.width }));
  const cabecera = hoja.getRow(1);
  cabecera.height = 32;
  COLUMNAS.forEach((c, i) => {
    const cell = cabecera.getCell(i + 1);
    cell.font = { bold: true, color: { argb: c.requerida ? "FF9B1C1C" : "FF1F1F1F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_GRUPO[c.grupo] } };
    cell.border = { bottom: { style: "medium", color: { argb: c.requerida ? "FF9B1C1C" : "FF888888" } } };
  });

  const ejemplo: Record<string, string | number | Date> = {};
  for (const c of COLUMNAS) if (c.ejemplo !== undefined && c.ejemplo !== "") ejemplo[c.key] = c.ejemplo;
  ejemplo.plan = planes[0]?.nombre ?? "";
  hoja.addRow(ejemplo);
  hoja.getRow(2).font = { italic: true, color: { argb: "FF777777" } };

  const ultima = MAX_FILAS + 1;
  const validar = (key: string, regla: ExcelJS.DataValidation) => {
    const col = hoja.getColumn(key).letter;
    for (let n = 2; n <= ultima; n++) hoja.getCell(`${col}${n}`).dataValidation = regla;
  };
  const fechas = ["fecha_nacimiento", "fecha_inicio", "vigente_hasta"];
  for (const key of fechas) {
    hoja.getColumn(key).numFmt = "dd/mm/yyyy";
    validar(key, {
      type: "date",
      operator: "greaterThan",
      allowBlank: true,
      formulae: [new Date(Date.UTC(1900, 0, 1))],
      showErrorMessage: true,
      errorTitle: "Fecha inválida",
      error: "Usa el formato DD/MM/AAAA.",
    });
  }
  const lista = (key: string, formula: string, titulo: string) =>
    validar(key, {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: titulo,
      error: "Elige un valor de la lista.",
    });
  lista("plan", `${HOJA_LISTAS}!$A$2:$A$${Math.max(planes.length, 1) + 1}`, "Plan");
  lista("sexo", `${HOJA_LISTAS}!$B$2:$B$${SEXOS.length + 1}`, "Sexo");
  lista("estado", `${HOJA_LISTAS}!$C$2:$C$3`, "Estado");
  for (const key of ["medicion_corporal", "plan_nutricional", "registrar_avances", "registrar_bitacora"]) {
    lista(key, `${HOJA_LISTAS}!$D$2:$D$3`, "Sí/No");
  }
  const numero = (key: string, min: number, max: number) =>
    validar(key, {
      type: "decimal",
      operator: "between",
      allowBlank: true,
      formulae: [min, max],
      showErrorMessage: true,
      errorTitle: "Número inválido",
      error: `Ingresa un número entre ${min} y ${max}.`,
    });
  numero("peso_kg", 20, 500);
  numero("estatura_cm", 50, 260);
  for (const m of CAMPOS_MEDIDA) numero(m.campo, 1, 299);

  instrucciones.columns = [
    { key: "a", width: 34 },
    { key: "b", width: 28 },
    { key: "c", width: 90 },
  ];
  const t = instrucciones.addRow(["Carga masiva de alumnos"]);
  t.font = { bold: true, size: 14 };
  instrucciones.addRow([]);
  [
    `Completa la hoja "${HOJA_ALUMNOS}": una fila por alumno. Las columnas con * son obligatorias.`,
    `Máximo ${MAX_FILAS} filas por archivo y 5 MB. Borra la fila de ejemplo (la que empieza con EJEMPLO) o se ignora.`,
    "No cambies, quites ni reordenes los nombres de las cabeceras de la fila 1.",
    "Las fechas van como DD/MM/AAAA. Las fórmulas no se evalúan: pega solo valores.",
    "Un RUT que ya existe en el gimnasio se marca como Duplicado y se omite (o se actualiza, si lo eliges al validar).",
    "Se valida todo antes de importar; solo se importan las filas válidas. No se crean accesos al portal ni se envían correos.",
  ].forEach((txt) => instrucciones.addRow([txt]));
  instrucciones.addRow([]);
  const h = instrucciones.addRow(["Columna", "Grupo", "Regla"]);
  h.font = { bold: true };
  for (const c of COLUMNAS) {
    instrucciones.addRow([encabezado(c), c.grupo, c.ayuda]);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

type Crudo = string | number | Date | null;
export type FilaCruda = { fila: number; valores: Record<string, Crudo> };

function valorCelda(v: ExcelJS.CellValue): Crudo {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "object") {
    if ("result" in v) return valorCelda(v.result as ExcelJS.CellValue); // solo el valor, no la fórmula
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
  }
  return null;
}

export type LecturaArchivo =
  | { ok: true; filas: FilaCruda[] }
  | { ok: false; error: string };

export async function leerArchivo(buffer: Buffer): Promise<LecturaArchivo> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    return { ok: false, error: "No se pudo leer el archivo. Sube un .xlsx descargado desde el template." };
  }

  const version = wb.getWorksheet(HOJA_META)?.getCell("B1").value;
  if (String(version ?? "") !== TEMPLATE_VERSION) {
    return { ok: false, error: "El archivo no corresponde al template vigente. Descarga el template actualizado." };
  }
  const hoja = wb.getWorksheet(HOJA_ALUMNOS);
  if (!hoja) return { ok: false, error: `Falta la hoja "${HOJA_ALUMNOS}".` };

  const colPorKey = new Map<string, number>();
  const cab = hoja.getRow(1);
  const porHeader = new Map(COLUMNAS.map((c) => [normalizar(c.header), c.key]));
  cab.eachCell((cell, n) => {
    const key = porHeader.get(normalizar(String(valorCelda(cell.value) ?? "")));
    if (key) colPorKey.set(key, n);
  });
  const faltan = COLUMNAS.filter((c) => c.requerida && !colPorKey.has(c.key)).map((c) => c.header);
  if (faltan.length > 0) {
    return { ok: false, error: `Faltan columnas obligatorias en la cabecera: ${faltan.join(", ")}.` };
  }

  const filas: FilaCruda[] = [];
  for (let n = 2; n <= hoja.rowCount; n++) {
    const row = hoja.getRow(n);
    const valores: Record<string, Crudo> = {};
    let alguno = false;
    for (const [key, col] of colPorKey) {
      const v = valorCelda(row.getCell(col).value);
      valores[key] = v;
      if (v !== null && String(v).trim() !== "") alguno = true;
    }
    if (!alguno) continue;
    if (typeof valores.nombres === "string" && /^ejemplo\b/i.test(valores.nombres.trim())) continue;
    filas.push({ fila: n, valores });
  }
  if (filas.length === 0) return { ok: false, error: "El archivo no tiene filas con datos." };
  if (filas.length > MAX_FILAS) {
    return { ok: false, error: `El archivo tiene ${filas.length} filas; el máximo es ${MAX_FILAS}.` };
  }
  return { ok: true, filas };
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

export type FilaImportable = {
  rut: number;
  dig_ver: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  direccion: string | null;
  comuna: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  plan_id: string | null;
  fecha_inicio: string;
  vigente_hasta: string | null;
  activo: boolean;
  medicion_corporal: boolean;
  plan_nutricional: boolean;
  registrar_avances: boolean;
  registrar_bitacora: boolean;
  alergias: string | null;
  enfermedades: string | null;
  lesiones: string | null;
  objetivos_salud: string | null;
  peso_kg: number | null;
  medidas: MedidasAvance;
  observaciones: string | null;
};

export type EstadoFila = "valida" | "error" | "duplicada" | "actualizar";

export type FilaResultado = {
  fila: number;
  rut: string;
  nombre: string;
  estado: EstadoFila;
  motivos: string[];
  datos?: FilaImportable;
};

export type ContextoValidacion = {
  planes: PlanCarga[];
  /** RUT existentes en el gimnasio → correo actual del alumno. */
  existentes: Map<number, string | null>;
  /** Correos ya usados en el gimnasio → RUT del dueño del correo. */
  emailsExistentes: Map<string, number>;
  actualizar: boolean;
  hoy: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(v: Crudo, max = 500): string | null {
  if (v === null) return null;
  const s = (v instanceof Date ? "" : String(v))
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
  return s === "" ? null : s;
}

function iso(y: number, m: number, d: number): string | null {
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return f.toISOString().slice(0, 10);
}

/** DD/MM/AAAA, fecha de Excel o número de serie → ISO. `undefined` = formato inválido. */
function fecha(v: Crudo): string | null | undefined {
  if (v === null || (typeof v === "string" && v.trim() === "")) return null;
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    if (v < 1 || v > 80000) return undefined;
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10);
  }
  const m = v.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  return m ? (iso(Number(m[3]), Number(m[2]), Number(m[1])) ?? undefined) : undefined;
}

function telefono(v: Crudo): string | null | undefined {
  const s = texto(v, 40);
  if (!s) return null;
  let d = s.replace(/[\s\-().+]/g, "");
  if (!/^\d+$/.test(d)) return undefined;
  if (d.startsWith("56") && d.length === 11) d = d.slice(2);
  if (d.length === 9) return `+56${d}`;
  if (d.length === 8) return `+569${d}`;
  return undefined;
}

function siNo(v: Crudo, defecto: boolean): boolean | undefined {
  const s = texto(v, 10);
  if (!s) return defecto;
  const n = normalizar(s);
  if (["si", "s", "1", "true", "yes"].includes(n)) return true;
  if (["no", "n", "0", "false"].includes(n)) return false;
  return undefined;
}

function numero(v: Crudo, min: number, max: number): number | null | undefined {
  if (v === null || (typeof v === "string" && v.trim() === "")) return null;
  const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

export function validarFilas(filas: FilaCruda[], ctx: ContextoValidacion): FilaResultado[] {
  const planPorNombre = new Map(ctx.planes.map((p) => [normalizar(p.nombre), p]));
  const rutsVistos = new Set<number>();
  const emailsVistos = new Map<string, number>();
  const resultados: FilaResultado[] = [];

  for (const { fila, valores: v } of filas) {
    const motivos: string[] = [];
    const rutTexto = texto(v.rut, 20) ?? "";
    const nombres = texto(v.nombres, 100);
    const apellidos = texto(v.apellidos, 100);

    const rut = rutTexto ? parseRut(rutTexto) : null;
    if (!rutTexto) motivos.push("RUT obligatorio");
    else if (!rut) motivos.push("RUT inválido");
    if (!nombres) motivos.push("Nombres obligatorio");
    if (!apellidos) motivos.push("Apellidos obligatorio");

    if (rut) {
      if (rutsVistos.has(rut.rut)) {
        motivos.push("RUT repetido en el archivo");
      }
      rutsVistos.add(rut.rut);
    }

    const nacimiento = fecha(v.fecha_nacimiento);
    if (nacimiento === undefined) motivos.push("Fecha de nacimiento mal formada (DD/MM/AAAA)");
    else if (nacimiento && (nacimiento > ctx.hoy || nacimiento < "1900-01-01")) {
      motivos.push("Fecha de nacimiento fuera de rango");
    }

    let sexo: string | null = null;
    const sexoTxt = texto(v.sexo, 30);
    if (sexoTxt) {
      sexo = SEXOS.find((s) => normalizar(s.etiqueta) === normalizar(sexoTxt))?.valor ?? null;
      if (!sexo) motivos.push("Sexo inválido (Femenino, Masculino, Otro, Prefiere no decir)");
    }

    const email = texto(v.email, 200)?.toLowerCase() ?? null;
    if (email) {
      if (!EMAIL_RE.test(email)) motivos.push("Email inválido");
      else {
        const dueñoArchivo = emailsVistos.get(email);
        const dueñoBd = ctx.emailsExistentes.get(email);
        if (dueñoArchivo !== undefined && dueñoArchivo !== rut?.rut) {
          motivos.push("Email repetido en el archivo");
        } else if (dueñoBd !== undefined && dueñoBd !== rut?.rut) {
          motivos.push("Email ya registrado en otro alumno");
        }
        if (rut && dueñoArchivo === undefined) emailsVistos.set(email, rut.rut);
      }
    }

    const tel = telefono(v.telefono);
    if (tel === undefined) motivos.push("Teléfono inválido");
    const telEmergencia = telefono(v.contacto_emergencia_telefono);
    if (telEmergencia === undefined) motivos.push("Teléfono de emergencia inválido");

    const existe = rut ? ctx.existentes.has(rut.rut) : false;

    // Plan, inicio y vigencia solo cuentan para alumnos nuevos; al actualizar se ignoran.
    const planTxt = texto(v.plan, 100);
    let plan: PlanCarga | null = null;
    if (!(existe && ctx.actualizar)) {
      if (!planTxt) motivos.push("Plan obligatorio");
      else {
        plan = planPorNombre.get(normalizar(planTxt)) ?? null;
        if (!plan) motivos.push(`Plan "${planTxt}" inexistente o no vigente`);
      }
    }

    const inicio = fecha(v.fecha_inicio);
    if (inicio === undefined) motivos.push("Fecha de inicio mal formada (DD/MM/AAAA)");
    const fechaInicio = inicio ?? ctx.hoy;
    const hasta = fecha(v.vigente_hasta);
    if (hasta === undefined) motivos.push("Vigente hasta mal formada (DD/MM/AAAA)");
    else if (hasta && inicio !== undefined && hasta < fechaInicio) {
      motivos.push("Vigente hasta no puede ser anterior a la fecha de inicio");
    }

    const estadoTxt = texto(v.estado, 20);
    let activo = true;
    if (estadoTxt) {
      const n = normalizar(estadoTxt);
      if (n === "activo") activo = true;
      else if (n === "inactivo") activo = false;
      else motivos.push("Estado inválido (Activo o Inactivo)");
    }

    const flags = {
      medicion_corporal: siNo(v.medicion_corporal, false),
      plan_nutricional: siNo(v.plan_nutricional, false),
      registrar_avances: siNo(v.registrar_avances, false),
      registrar_bitacora: siNo(v.registrar_bitacora, false),
    };
    for (const [k, val] of Object.entries(flags)) {
      if (val === undefined) {
        motivos.push(`${COLUMNAS.find((c) => c.key === k)!.header}: usa Sí o No`);
      }
    }

    const peso = numero(v.peso_kg, 20, 500);
    if (peso === undefined) motivos.push("Peso fuera de rango (20 a 500 kg)");
    const estatura = numero(v.estatura_cm, 50, 260);
    if (estatura === undefined) motivos.push("Estatura fuera de rango (50 a 260 cm)");
    const medidas: MedidasAvance = {};
    for (const m of CAMPOS_MEDIDA) {
      const n = numero(v[m.campo], 1, 299);
      if (n === undefined) motivos.push(`${m.etiqueta} fuera de rango (1 a 299 cm)`);
      else if (n !== null) medidas[m.campo] = n;
    }
    if (typeof estatura === "number") medidas.estatura_cm = estatura;

    const base = { fila, rut: rut ? `${rut.rut}-${rut.dv}` : rutTexto, nombre: [nombres, apellidos].filter(Boolean).join(" ") };

    if (motivos.length > 0) {
      resultados.push({ ...base, estado: "error", motivos });
      continue;
    }
    if (existe && !ctx.actualizar) {
      resultados.push({ ...base, estado: "duplicada", motivos: ["El RUT ya existe en el gimnasio; se omite"] });
      continue;
    }

    resultados.push({
      ...base,
      estado: existe ? "actualizar" : "valida",
      motivos: existe ? ["El RUT ya existe; se actualizarán sus datos de contacto y ficha"] : [],
      datos: {
        rut: rut!.rut,
        dig_ver: rut!.dv,
        nombres: nombres!,
        apellidos: apellidos!,
        email,
        telefono: tel ?? null,
        fecha_nacimiento: nacimiento ?? null,
        sexo,
        direccion: texto(v.direccion, 200),
        comuna: texto(v.comuna, 100),
        contacto_emergencia_nombre: texto(v.contacto_emergencia_nombre, 100),
        contacto_emergencia_telefono: telEmergencia ?? null,
        plan_id: plan?.id ?? null,
        fecha_inicio: fechaInicio,
        vigente_hasta: hasta ?? null,
        activo,
        medicion_corporal: flags.medicion_corporal!,
        plan_nutricional: flags.plan_nutricional!,
        registrar_avances: flags.registrar_avances!,
        registrar_bitacora: flags.registrar_bitacora!,
        alergias: texto(v.alergias, 1000),
        enfermedades: texto(v.enfermedades, 1000),
        lesiones: texto(v.lesiones, 1000),
        objetivos_salud: texto(v.objetivos_salud, 1000),
        peso_kg: peso ?? null,
        medidas,
        observaciones: texto(v.observaciones, 1000),
      },
    });
  }
  return resultados;
}

// ---------------------------------------------------------------------------
// Reporte de errores
// ---------------------------------------------------------------------------

export type ErrorCarga = { fila: number; rut: string; nombre: string; estado: string; motivo: string };

export async function buildReporteErroresBuffer(errores: ErrorCarga[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Valinor Estudio";
  const hoja = wb.addWorksheet("Filas con error");
  hoja.columns = [
    { header: "Fila en el archivo", key: "fila", width: 18 },
    { header: "RUT", key: "rut", width: 16 },
    { header: "Nombre", key: "nombre", width: 28 },
    { header: "Resultado", key: "estado", width: 14 },
    { header: "Motivo", key: "motivo", width: 70 },
  ];
  hoja.getRow(1).font = { bold: true };
  errores.forEach((e) => hoja.addRow(e));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
