"use server";

import { redirect } from "next/navigation";
import { createLead, type LeadSource } from "@/lib/db";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function bool(fd: FormData, key: string): boolean | undefined {
  const v = fd.get(key);
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export async function submitAdoptaFormAction(formData: FormData) {
  const nombre = str(formData, "nombre");
  const telefono = str(formData, "telefono");
  const ciudad = str(formData, "ciudad");
  if (!nombre || !telefono || !ciudad) return;

  const sourceRaw = str(formData, "source");
  const utmSource = str(formData, "utmSource");
  // "source" sigue siendo la categoría gruesa que ya usaba el resto del
  // sistema (SOURCE_META en /reportes, etc.) -- el detalle fino de qué
  // plataforma/campaña/anuncio exacto trajo el lead vive en las columnas
  // utm_* de abajo, sin importar cuántas plataformas de anuncios se agreguen
  // a futuro (Instagram, TikTok, Amazon Ads, ...).
  let source: LeadSource = "FORMULARIO_SITIO";
  if (sourceRaw === "ANUNCIO_INSTAGRAM" || utmSource.toLowerCase().includes("instagram")) {
    source = "ANUNCIO_INSTAGRAM";
  } else if (utmSource) {
    source = "OTRO";
  }

  await createLead({
    source,
    nombre,
    telefono,
    email: str(formData, "email") || undefined,
    ciudad,
    tipoVivienda: str(formData, "tipoVivienda") || undefined,
    viviendaEnRenta: bool(formData, "viviendaEnRenta"),
    permiteMascotasRenta: bool(formData, "permiteMascotasRenta"),
    tieneOtrasMascotas: bool(formData, "tieneOtrasMascotas"),
    otrasMascotasDetalle: str(formData, "otrasMascotasDetalle") || undefined,
    experienciaPrevia: bool(formData, "experienciaPrevia"),
    todaLaFamiliaDeAcuerdo: bool(formData, "todaLaFamiliaDeAcuerdo"),
    comentario: str(formData, "comentario") || undefined,
    utmSource: utmSource || undefined,
    utmMedium: str(formData, "utmMedium") || undefined,
    utmCampaign: str(formData, "utmCampaign") || undefined,
    utmContent: str(formData, "utmContent") || undefined,
  });

  // TODO (mejora continua): disparar aquí la notificación real -- Telegram
  // Bot API + correo -- en cuanto haya credenciales configuradas. Ahora
  // mismo el aviso al equipo es revisar /reportes o la tabla Lead.
  redirect("/adopta/gracias");
}
