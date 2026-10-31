/** Compresión de imágenes en el navegador (spec 51): reduce el lado mayor y recomprime a
 * WebP/JPEG hasta quedar bajo `maxBytes`. Solo para uso en componentes cliente. */
export const FOTO_MAX_LADO = 1280;
export const FOTO_MAX_BYTES = 500 * 1024;
export const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"];

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

export async function comprimirImagen(
  file: File,
  maxLado = FOTO_MAX_LADO,
  maxBytes = FOTO_MAX_BYTES,
): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  if (!FOTO_TIPOS.includes(file.type)) {
    throw new Error("Formato no admitido. Usa JPG, PNG o WEBP.");
  }
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const calidad of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const webp = await aBlob(canvas, "image/webp", calidad);
    if (webp && webp.type === "image/webp" && webp.size <= maxBytes) return { blob: webp, extension: "webp" };
    const jpg = await aBlob(canvas, "image/jpeg", calidad);
    if (jpg && jpg.size <= maxBytes) return { blob: jpg, extension: "jpg" };
  }
  throw new Error("No se pudo reducir la imagen a menos de 500 KB. Prueba con otra foto.");
}
