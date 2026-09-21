import { NextRequest, NextResponse } from "next/server";
import {
  getDonativoById,
  updateDonativoStatus,
  getPedidoById,
  updatePedidoStatus,
  getSuscripcionByPreapprovalId,
  getEnvioSuscripcionPorPago,
  createEnvioSuscripcion,
  getProductoById,
  actualizarSuscripcionMP,
} from "@/lib/db";
import { obtenerPagoMercadoPago, obtenerPagoAutorizadoMP, obtenerSuscripcionMP } from "@/lib/mercadopago";
import { enviarCorreo, correoConfirmacionCobro } from "@/lib/email";
import { formatMXN } from "@/lib/money";

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
 *
 * También llegan aquí (misma URL, mismo `notification_url` implícito de
 * la cuenta) las notificaciones del tópico "subscription_authorized_payment"
 * -- un cobro ya hecho por el motor de Suscripciones (preapproval, ver
 * lib/mercadopago.ts#crearSuscripcionMP). Se manejan aparte más abajo.
 */
export async function POST(req: NextRequest) {
  let paymentId: string | null = null;
  let topicoDetectado: string | null = null;

  try {
    const body = (await req.json().catch(() => null)) as
      | { type?: string; action?: string; data?: { id?: string } }
      | null;
    if ((body?.type === "payment" || body?.type === "subscription_authorized_payment") && body.data?.id) {
      paymentId = body.data.id;
      topicoDetectado = body.type;
    }
  } catch {
    // sin body JSON válido -- se sigue intentando con la query string.
  }

  if (!paymentId) {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("type") ?? searchParams.get("topic");
    const id = searchParams.get("data.id") ?? searchParams.get("id");
    if ((topic === "payment" || topic === "subscription_authorized_payment") && id) {
      paymentId = id;
      topicoDetectado = topic;
    }
  }

  if (!paymentId) {
    // Notificación de un tipo que no es "payment" ni
    // "subscription_authorized_payment" (ej. merchant_order) -- no hay nada
    // que hacer, se responde 200 para que no reintente.
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (topicoDetectado === "subscription_authorized_payment") {
    return manejarCobroSuscripcion(paymentId);
  }

  try {
    const pago = await obtenerPagoMercadoPago(paymentId);
    if (!pago.externalReference) {
      console.warn("MP_WEBHOOK_SIN_EXTERNAL_REFERENCE", paymentId);
      return NextResponse.json({ ok: true });
    }

    // external_reference se manda con un prefijo ("donativo:<id>" o
    // "pedido:<id>", ver lib/mercadopago.ts) para saber en qué tabla
    // buscar. Se mantiene compatibilidad hacia atrás con preferencias
    // creadas antes de este cambio, que mandaban solo el donativoId sin
    // prefijo -- esas solo pueden ser donativos.
    const [tipo, refId] = pago.externalReference.includes(":")
      ? (pago.externalReference.split(":") as [string, string])
      : ["donativo", pago.externalReference];

    if (tipo === "pedido") {
      const pedido = await getPedidoById(refId);
      if (!pedido) {
        console.warn("MP_WEBHOOK_PEDIDO_NO_ENCONTRADO", refId);
        return NextResponse.json({ ok: true });
      }
      const status =
        pago.status === "approved"
          ? "PAGADO"
          : pago.status === "rejected" || pago.status === "cancelled"
            ? "CANCELADO"
            : "PENDIENTE_PAGO";
      await updatePedidoStatus(pedido.id, status, pago.id);
      return NextResponse.json({ ok: true });
    }

    const donativo = await getDonativoById(refId);
    if (!donativo) {
      console.warn("MP_WEBHOOK_DONATIVO_NO_ENCONTRADO", refId);
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

/**
 * Maneja la notificación de un cobro ya hecho por el motor de
 * Suscripciones (preapproval) -- a diferencia de Checkout Pro, aquí no
 * mandamos nosotros el cobro: Mercado Pago cobra solo en cada ciclo y
 * avisa aquí cuando ya pasó. Lo único que hacemos es: (1) encontrar la
 * Suscripcion local por el preapprovalId que trae el pago, (2) registrar
 * el EnvioSuscripcion (con dedupe por mpPaymentId, por si la notificación
 * llega más de una vez -- Mercado Pago no garantiza entrega única), y (3)
 * mandar el correo de confirmación de cobro.
 *
 * OJO: el nombre exacto del campo que relaciona el pago con el
 * preapproval no está 100% confirmado contra una cuenta real de Mercado
 * Pago (ver nota en lib/mercadopago.ts#obtenerPagoAutorizadoMP) -- se
 * intentan varios nombres plausibles ahí. Si Mercado Pago no lo manda,
 * este webhook no puede vincular el cobro a la suscripción y solo lo dejamos
 * en los logs para revisar a mano.
 */
async function manejarCobroSuscripcion(paymentId: string): Promise<NextResponse> {
  try {
    const pago = await obtenerPagoAutorizadoMP(paymentId);

    // Dedupe: si ya existe un EnvioSuscripcion para este mpPaymentId, no se
    // vuelve a crear ni se manda el correo dos veces.
    const yaRegistrado = await getEnvioSuscripcionPorPago(pago.id);
    if (yaRegistrado) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!pago.preapprovalId) {
      console.warn("MP_WEBHOOK_COBRO_SIN_PREAPPROVAL_ID", paymentId, "status:", pago.status);
      return NextResponse.json({ ok: true });
    }

    const suscripcion = await getSuscripcionByPreapprovalId(pago.preapprovalId);
    if (!suscripcion) {
      console.warn("MP_WEBHOOK_SUSCRIPCION_NO_ENCONTRADA", pago.preapprovalId);
      return NextResponse.json({ ok: true });
    }

    const status: "COBRADO" | "FALLIDO" =
      pago.status === "approved" || pago.status === "processed" ? "COBRADO" : "FALLIDO";

    await createEnvioSuscripcion({
      suscripcionId: suscripcion.id,
      status,
      mpPaymentId: pago.id,
      montoCentavos: pago.montoCentavos ?? undefined,
    });

    // Se refresca el status/proximoEnvio de la suscripción consultando
    // directo a Mercado Pago -- así proximoEnvio queda listo para el
    // siguiente ciclo sin tener que calcularlo nosotros a mano.
    try {
      const detalle = await obtenerSuscripcionMP(pago.preapprovalId);
      await actualizarSuscripcionMP(suscripcion.id, {
        mpStatus: detalle.status,
        proximoEnvio: detalle.nextPaymentDate ?? undefined,
      });
    } catch (err) {
      console.error("MP_WEBHOOK_REFRESCAR_SUSCRIPCION_FAILED", err);
      // no bloqueante -- el envío ya quedó registrado arriba.
    }

    if (status === "COBRADO") {
      const producto = await getProductoById(suscripcion.productoId);
      await enviarCorreo({
        to: suscripcion.adoptanteEmail,
        ...correoConfirmacionCobro({
          adoptanteNombre: suscripcion.adoptanteNombre,
          productoNombre: producto?.nombre ?? "tu producto",
          montoTexto: formatMXN(pago.montoCentavos ?? producto?.precioAdoptanteCentavos ?? 0),
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP_WEBHOOK_COBRO_SUSCRIPCION_FAILED", err);
    return NextResponse.json({ ok: false });
  }
}
