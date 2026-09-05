import { NextRequest, NextResponse } from "next/server";
import { getDonativoById, updateDonativoStatus } from "@/lib/db";
import { obtenerPagoMercadoPago } from "@/lib/mercadopago";

/**
 * Webhook de Mercado Pago -- se configura solo (la URL se manda como
 * `notification_url` al crear cada preferencia en
 * lib/mercadopago.ts#crearPreferenciaDonativo), no hay nada que configurar
 * a mano en el panel de Mercado Pago para que esto funcione.
 *
 * Por qué se vuelve a consultar el pago con obtenerPagoMercadoPago() en vez
 * de confiar en lo que venga en el body: Mercado Pago recomienda esto
 * explícitamente -- la notificación solo avisa "hay un cambio en este id",
 * no es una fuente confiable del estado real (alguien podría mandar un
 * POST falso a esta URL con cualquier id). Se responde 200 siempre que se
 * pudo procesar la notificación (aunque el donativo no se encuentre), para
 * que Mercado Pago no reintente de más -- los errores quedan en los logs
 * de Render para revisar a mano si hace falta.
 *
 * TODO (pendiente, no bloqueante): esto no verifica la firma HMAC que
 * Mercado Pago puede mandar en el header `x-signature` -- endurecer esto
 * más adelante para que no cualquiera pueda mandar un POST fabricado.
 */
export async function POST(req: NextRequest) {
  let paymentId: string | null = null;

  try {
    const body = (await req.json().catch(() => null)) as
      | { type?: string; data?: { id?: string } }
      | null;
    if (body?.type === "payment" && body.data?.id) {
      paymentId = body.data.id;
    }
  } catch {
    // sin body JSON válido -- se sigue intentando con la query string.
  }

  if (!paymentId) {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("type") ?? searchParams.get("topic");
    const id = searchParams.get("data.id") ?? searchParams.get("id");
    if (topic === "payment" && id) paymentId = id;
  }

  if (!paymentId) {
    // Notificación de un tipo que no es "payment" (ej. merchant_order) --
    // no hay nada que hacer, se responde 200 para que no reintente.
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const pago = await obtenerPagoMercadoPago(paymentId);
    if (!pago.externalReference) {
      console.warn("MP_WEBHOOK_SIN_EXTERNAL_REFERENCE", paymentId);
      return NextResponse.json({ ok: true });
    }

    // external_reference se manda como el donativoId (ver
    // crearPreferenciaDonativo -- NO es el preferenceId de Mercado Pago).
    const donativo = await getDonativoById(pago.externalReference);
    if (!donativo) {
      console.warn("MP_WEBHOOK_DONATIVO_NO_ENCONTRADO", pago.externalReference);
      return NextResponse.json({ ok: true });
    }

    const status =
      pago.status === "approved"
        ? "PAGADO"
        : pago.status === "rejected" || pago.status === "cancelled"
          ? "CANCELADO"
          : "PENDIENTE";
    await updateDonativoStatus(donativo.id, status, pago.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP_WEBHOOK_FAILED", err);
    // 200 igual -- ya quedó en los logs, y responder error solo hace que
    // Mercado Pago reintente sin que cambie nada (el error no es transitorio
    // si es, por ejemplo, un token inválido).
    return NextResponse.json({ ok: false });
  }
}
