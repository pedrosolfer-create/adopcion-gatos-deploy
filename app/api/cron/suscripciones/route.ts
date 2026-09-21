import { NextRequest, NextResponse } from "next/server";
import {
  listSuscripcionesParaRecordar,
  marcarRecordatorioSuscripcionEnviado,
  getProductoById,
} from "@/lib/db";
import { enviarCorreo, correoRecordatorioEnvio } from "@/lib/email";
import { formatMXN } from "@/lib/money";

/**
 * Endpoint de recordatorios de suscripción -- a diferencia del cobro en sí
 * (que lo hace solo el motor de Suscripciones de Mercado Pago, ver
 * lib/mercadopago.ts), este proyecto SÍ necesita un disparador propio para
 * mandar el correo de "tu próximo envío está por llegar" ANTES de que
 * Mercado Pago cobre -- Mercado Pago no manda ese aviso previo, solo la
 * notificación de cuando ya cobró (que atiende el webhook, ver
 * app/api/mercadopago/webhook/route.ts).
 *
 * Este proyecto no tiene un scheduler propio (Render free tier no lo
 * incluye) -- hace falta un disparador externo gratuito que llame esta URL
 * periódicamente (ej. cron-job.org, una vez al día). Ver claude/estado-del-
 * sistema.md para instrucciones de cómo configurarlo -- es la misma idea
 * que ya se usa para evitar que el sitio se duerma en el plan gratis de
 * Render.
 *
 * Protegido con CRON_SECRET -- sin esto, cualquiera podría llamar este
 * endpoint y disparar correos a los adoptantes. Se manda como
 * `?secret=...` en la URL (más simple de configurar en un cron externo que
 * un header Authorization) o como header `x-cron-secret`.
 */
export async function GET(req: NextRequest) {
  const secretConfigurado = process.env.CRON_SECRET;
  if (!secretConfigurado) {
    console.error("CRON_SUSCRIPCIONES_SIN_SECRET: falta CRON_SECRET en las variables de entorno.");
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const secretRecibido = searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (secretRecibido !== secretConfigurado) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  // "Próximo cobro en los siguientes 2 días" -- da margen para que el
  // recordatorio llegue antes del cobro sin importar a qué hora del día
  // corra el disparador externo.
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + 2);
  const fechaLimiteISO = fechaLimite.toISOString();

  const suscripciones = await listSuscripcionesParaRecordar(fechaLimiteISO);

  let enviados = 0;
  let fallidos = 0;

  for (const s of suscripciones) {
    if (!s.proximoEnvio) continue;
    try {
      const producto = await getProductoById(s.productoId);
      const montoCentavos = producto ? producto.precioAdoptanteCentavos * s.cantidad : 0;
      const fechaProgramada = new Date(s.proximoEnvio).toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const ok = await enviarCorreo({
        to: s.adoptanteEmail,
        ...correoRecordatorioEnvio({
          adoptanteNombre: s.adoptanteNombre,
          productoNombre: producto?.nombre ?? "tu producto",
          fechaProgramada,
          montoTexto: formatMXN(montoCentavos),
        }),
      });
      // Se marca como enviado aunque el correo haya fallado (ej.
      // RESEND_API_KEY sin configurar) -- si no se marcara, el cron lo
      // reintentaría en cada corrida sin que cambie nada; el error ya
      // quedó en los logs de enviarCorreo() para revisar a mano.
      await marcarRecordatorioSuscripcionEnviado(s.id, s.proximoEnvio);
      if (ok) enviados++;
      else fallidos++;
    } catch (err) {
      console.error("CRON_SUSCRIPCIONES_RECORDATORIO_FAILED", s.id, err);
      fallidos++;
    }
  }

  return NextResponse.json({ ok: true, revisadas: suscripciones.length, enviados, fallidos });
}
