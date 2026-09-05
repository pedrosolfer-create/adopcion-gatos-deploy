import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El formulario de "Agregar gato" manda la foto como parte del body
      // de una Server Action (app/refugio/actions.ts -- addGatoAction). Por
      // default Next.js limita ese body a 1MB, muy por debajo de lo que
      // pesa una foto de celular normal (2-8MB) -- sin este límite más alto
      // la subida se rechaza en seco (413) antes de que el código de la
      // acción llegue siquiera a ejecutarse, y en el navegador se ve como
      // que el botón "Guardar gato" no hace nada. 10mb deja margen sobre
      // el límite de 8MB que ya valida lib/cloudinary.ts (MAX_FOTO_BYTES),
      // más el overhead del encoding multipart/form-data.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
