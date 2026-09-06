import { v2 as cloudinary } from "cloudinary";

/**
 * Subida de fotos de gatos a Cloudinary.
 *
 * Por qué Cloudinary y no guardar el archivo en disco: Render (plan
 * gratis, que es el que se documenta en README.md) no tiene disco
 * persistente -- cualquier archivo escrito localmente se pierde en el
 * siguiente redeploy o reinicio. Cloudinary tiene plan gratis "para
 * siempre" sin tarjeta de crédito (25 créditos/mes, cada crédito cubre
 * 1GB de almacenamiento o 1GB de banda o 1000 transformaciones --
 * verificado en cloudinary.com/pricing, septiembre 2026), de sobra para
 * las fotos de un refugio chico.
 *
 * Configura estas variables en .env.local / en el dashboard de Render:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Se obtienen del dashboard de Cloudinary (cloudinary.com/console) al
 * crear la cuenta gratis -- no requiere tarjeta.
 */
let configured = false;
function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

const MAX_FOTO_BYTES = 8 * 1024 * 1024; // 8MB -- una foto de celular normal cabe de sobra.

/**
 * Sube una foto (tomada con la cámara del celular o elegida de la galería
 * -- ambas llegan aquí igual, como un File dentro del FormData) y regresa
 * la URL pública ya optimizada. Se limita el ancho a 1200px y se deja que
 * Cloudinary elija automáticamente calidad y formato (quality:auto,
 * fetch_format:auto) para no gastar de más los créditos gratis subiendo
 * fotos a resolución completa de celular (que fácilmente pesan varios MB
 * y miden 3000-4000px de ancho).
 *
 * `folder` separa las fotos por tipo dentro de la misma cuenta de
 * Cloudinary ("gatos", "productos") -- puramente organizativo, no cambia
 * el comportamiento de la subida.
 */
async function subirImagen(file: File, folder: string): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "CLOUDINARY_NOT_CONFIGURED: faltan CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET en las variables de entorno."
    );
  }
  if (file.size > MAX_FOTO_BYTES) {
    throw new Error("FOTO_DEMASIADO_GRANDE");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("ARCHIVO_NO_ES_IMAGEN");
  }

  ensureConfigured();
  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [{ width: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export async function subirFotoGato(file: File): Promise<string> {
  return subirImagen(file, "gatos");
}

/** Igual que subirFotoGato pero para fotos de producto de la tienda (ver
 * app/reportes/actions.ts#addProductoAction). */
export async function subirFotoProducto(file: File): Promise<string> {
  return subirImagen(file, "productos");
}
