/**
 * Envío de correo transaccional real -- integración NUEVA (antes el sitio
 * nunca mandaba correos, solo guardaba el campo de correo como dato de
 * contacto). Se usa para las suscripciones de reenvío automático:
 * confirmación al autorizar, recordatorio antes de cada cobro y aviso
 * cuando el cobro ya se hizo.
 *
 * Se eligió Resend (resend.com) sobre SMTP/Nodemailer por el mismo
 * criterio que ya se usó para Mercado Pago en este proyecto: una sola
 * llamada HTTP con `fetch` nativo, sin agregar una dependencia nueva al
 * proyecto ni pelear con puertos SMTP que Render pudiera bloquear. Tiene
 * plan gratis (100 correos/día, 3,000/mes -- suficiente para el volumen de
 * un refugio chico) y no pide tarjeta para el plan gratis.
 *
 * Configura esta variable en .env.local / en el dashboard de Render:
 *   RESEND_API_KEY
 * Se obtiene creando una cuenta gratis en resend.com/signup y una API key
 * en el dashboard. IMPORTANTE: sin verificar un dominio propio en Resend,
 * los correos solo se pueden mandar usando su remitente de pruebas
 * ("onboarding@resend.dev") y SOLO llegan a la cuenta de correo con la que
 * te registraste en Resend -- para mandarle correos reales a cualquier
 * adoptante hace falta verificar un dominio propio (ej. un subdominio de
 * ceroluzcerogas.com) en resend.com/domains, agregando los registros DNS
 * que pida en el panel de DirectAdmin donde ya vive el DNS del dominio
 * (mismo lugar donde se agregó el CNAME de `adopta`, ver README/estado del
 * proyecto). Mientras tanto, EMAIL_REMITENTE cae a la dirección de pruebas.
 */

const RESEND_API = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function remitente(): string {
  return process.env.EMAIL_REMITENTE || "Adopción de gatos <onboarding@resend.dev>";
}

/** Envía un correo -- no truena si falla (igual que el resto de
 * integraciones opcionales del proyecto): registra el error en los logs y
 * regresa `false` para que quien llama decida si necesita avisar al
 * usuario o simplemente confiar en el recordatorio de WhatsApp. */
export async function enviarCorreo(input: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("EMAIL_NOT_CONFIGURED: falta RESEND_API_KEY -- no se mandó el correo a", input.to);
    return false;
  }
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: remitente(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      console.error("RESEND_SEND_FAILED", res.status, detalle.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("RESEND_SEND_FAILED", err);
    return false;
  }
}

const ESTILO_BASE = `font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #161412; line-height: 1.5;`;

function envoltura(tituloHtml: string, cuerpoHtml: string): string {
  return `<div style="${ESTILO_BASE} max-width: 480px; margin: 0 auto; padding: 24px;">
    <div style="background:#161412; color:#fff; display:inline-block; padding: 10px 20px; border-radius: 999px; font-weight: 800; margin-bottom: 20px;">${tituloHtml}</div>
    ${cuerpoHtml}
    <p style="margin-top: 28px; font-size: 12px; color: #948c7c;">Sistema de adopción de gatos</p>
  </div>`;
}

export function correoConfirmacionSuscripcion(input: {
  adoptanteNombre: string;
  productoNombre: string;
  cantidad: number;
  frecuenciaDias: number;
  montoTexto: string;
}): { subject: string; html: string } {
  return {
    subject: `Suscripción confirmada: ${input.productoNombre}`,
    html: envoltura(
      "¡Suscripción activada!",
      `<p>Hola ${input.adoptanteNombre},</p>
       <p>Quedó activo el reenvío automático de <strong>${input.cantidad}× ${input.productoNombre}</strong> cada
       <strong>${input.frecuenciaDias} días</strong>, por <strong>${input.montoTexto}</strong> por envío.</p>
       <p>Antes de cada cobro te vamos a avisar por correo y por WhatsApp para que sepas que viene en camino.
       Puedes cancelar cuando quieras escribiéndonos por WhatsApp.</p>`
    ),
  };
}

export function correoRecordatorioEnvio(input: {
  adoptanteNombre: string;
  productoNombre: string;
  fechaProgramada: string;
  montoTexto: string;
}): { subject: string; html: string } {
  return {
    subject: `Tu próximo envío de ${input.productoNombre} está por llegar`,
    html: envoltura(
      "Próximo envío",
      `<p>Hola ${input.adoptanteNombre},</p>
       <p>El <strong>${input.fechaProgramada}</strong> se procesará tu siguiente envío de
       <strong>${input.productoNombre}</strong> por <strong>${input.montoTexto}</strong>, a la tarjeta que
       autorizaste.</p>
       <p>Si algo cambió (dirección, quieres pausar o cancelar), escríbenos por WhatsApp antes de esa fecha.</p>`
    ),
  };
}

export function correoConfirmacionCobro(input: {
  adoptanteNombre: string;
  productoNombre: string;
  montoTexto: string;
}): { subject: string; html: string } {
  return {
    subject: `Cobrado: tu envío de ${input.productoNombre} va en camino`,
    html: envoltura(
      "Cobro confirmado",
      `<p>Hola ${input.adoptanteNombre},</p>
       <p>Se cobró <strong>${input.montoTexto}</strong> por tu envío de <strong>${input.productoNombre}</strong> --
       en breve el refugio se pone en contacto por WhatsApp para coordinar la entrega.</p>`
    ),
  };
}
