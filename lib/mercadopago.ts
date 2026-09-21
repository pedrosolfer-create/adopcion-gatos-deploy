/**
 * Integración con Mercado Pago Checkout Pro para donativos.
 *
 * Por qué Mercado Pago y no Stripe/Conekta: de las pasarelas comparadas
 * (ver README.md / el chat con el usuario), Mercado Pago es la que permite
 * empezar sin RFC confirmado de entrada -- las demás sí lo piden para poder
 * pagar lo recaudado. Decisión explícita del usuario.
 *
 * Cómo funciona Checkout Pro: se crea una "preference" (POST a la API con
 * el concepto y el monto), Mercado Pago regresa una URL (`init_point`) a la
 * que se redirige al donante. Esa URL ya es una pantalla hospedada por
 * Mercado Pago con tarjeta (incluye Apple Pay / Google Pay si el
 * dispositivo los soporta), OXXO y SPEI -- nada de eso se programa aquí,
 * lo arma Mercado Pago del lado de ellos. No se usa el SDK oficial de
 * Mercado Pago (paquete "mercadopago" de npm) a propósito -- es una sola
 * llamada HTTP y el resto del proyecto ya usa `fetch` nativo en vez de
 * agregar dependencias para llamadas sencillas, así que se sigue el mismo
 * patrón en vez de sumar un paquete más.
 *
 * Configura esta variable en .env.local / en el dashboard de Render:
 *   MERCADOPAGO_ACCESS_TOKEN
 * Se obtiene del panel de desarrolladores de Mercado Pago
 * (mercadopago.com.mx/developers/panel/app) -- usar el Access Token de
 * PRODUCCIÓN para cobrar de verdad; el de prueba (TEST-...) sirve para
 * probar el flujo completo sin mover dinero real antes de salir a vivo.
 */

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

/** La "public key" es distinta del access token -- es segura de exponer en
 * el navegador (se usa para inicializar el SDK de Mercado Pago Bricks del
 * lado del cliente) y se obtiene del mismo panel de desarrolladores. Debe
 * ir en una variable que empiece con NEXT_PUBLIC_ para que Next.js la
 * incluya en el bundle del navegador -- sin ese prefijo, el valor se queda
 * solo del lado del servidor y el formulario de tarjeta nunca cargaría. */
export function isMercadoPagoPublicKeyConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY);
}

/** URL pública del sitio, para armar las back_urls y el webhook -- mismo
 * patrón que usaría cualquier variable de entorno del sitio. Sin esto
 * configurado, se cae de vuelta a la URL de producción conocida. */
function siteUrl(): string {
  return process.env.SITE_URL || "https://adopta.ceroluzcerogas.com";
}

/** Llamada compartida a la API de "preferences" de Checkout Pro -- tanto
 * donativos como pedidos de la tienda arman la misma forma de petición,
 * solo cambian los items, el external_reference y las back_urls. */
async function crearPreferencia(input: {
  items: Array<{ title: string; quantity: number; unitPriceCentavos: number }>;
  externalReference: string;
  backUrls: { success: string; pending: string; failure: string };
  statementDescriptor: string;
}): Promise<{ preferenceId: string; initPoint: string }> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_NOT_CONFIGURED: falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno."
    );
  }

  const base = siteUrl();
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: input.items.map((it) => ({
        title: it.title,
        quantity: it.quantity,
        currency_id: "MXN",
        unit_price: Math.round(it.unitPriceCentavos) / 100,
      })),
      external_reference: input.externalReference,
      back_urls: {
        success: input.backUrls.success,
        pending: input.backUrls.pending,
        failure: input.backUrls.failure,
      },
      auto_return: "approved",
      notification_url: `${base}/api/mercadopago/webhook`,
      statement_descriptor: input.statementDescriptor,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`MERCADOPAGO_PREFERENCE_FAILED: ${res.status} ${detalle}`.slice(0, 500));
  }

  const data = (await res.json()) as { id: string; init_point: string };
  return { preferenceId: data.id, initPoint: data.init_point };
}

/** external_reference se manda con un prefijo ("donativo:"/"pedido:") para
 * que el webhook sepa en qué tabla buscar sin tener que adivinar --
 * ver app/api/mercadopago/webhook/route.ts. */
export async function crearPreferenciaDonativo(input: {
  donativoId: string;
  concepto: string;
  montoCentavos: number;
}): Promise<{ preferenceId: string; initPoint: string }> {
  const base = siteUrl();
  return crearPreferencia({
    items: [{ title: `Donativo: ${input.concepto}`, quantity: 1, unitPriceCentavos: input.montoCentavos }],
    externalReference: `donativo:${input.donativoId}`,
    backUrls: {
      success: `${base}/donar/gracias?donativo=${input.donativoId}`,
      pending: `${base}/donar/gracias?donativo=${input.donativoId}&estado=pendiente`,
      failure: `${base}/donar/gracias?donativo=${input.donativoId}&estado=fallo`,
    },
    statementDescriptor: "DONATIVO GATOS",
  });
}

/** Igual que crearPreferenciaDonativo pero para un pedido de la tienda --
 * cada producto del carrito va como su propio renglón en Checkout Pro (así
 * el comprador ve el desglose real en la pantalla de pago de Mercado Pago,
 * no solo un monto total). */
export async function crearPreferenciaPedido(input: {
  pedidoId: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitarioCentavos: number }>;
}): Promise<{ preferenceId: string; initPoint: string }> {
  const base = siteUrl();
  return crearPreferencia({
    items: input.items.map((it) => ({
      title: it.nombre,
      quantity: it.cantidad,
      unitPriceCentavos: it.precioUnitarioCentavos,
    })),
    externalReference: `pedido:${input.pedidoId}`,
    backUrls: {
      success: `${base}/tienda/gracias?pedido=${input.pedidoId}`,
      pending: `${base}/tienda/gracias?pedido=${input.pedidoId}&estado=pendiente`,
      failure: `${base}/tienda/gracias?pedido=${input.pedidoId}&estado=fallo`,
    },
    statementDescriptor: "TIENDA GATOS",
  });
}

// ---------- Suscripciones (reenvío automático de comida/arena) ----------
//
// A diferencia de Donativos/Tienda (Checkout Pro -- un solo cobro, el
// comprador paga en una pantalla hospedada por Mercado Pago), las
// suscripciones usan el producto "Suscripciones" de Mercado Pago
// (preapproval): el adoptante autoriza el cobro recurrente UNA vez -- con
// un formulario de tarjeta EMBEBIDO en nuestro propio sitio (Mercado Pago
// Bricks, ver components/suscripcion/TarjetaBrick.tsx) que genera un
// card_token_id sin que el número de tarjeta pase nunca por este
// servidor -- y a partir de ahí es el motor de Mercado Pago el que cobra
// automáticamente en cada ciclo (con reintentos automáticos si una
// tarjeta falla), no un cron nuestro. Documentación: preapproval con
// card_token_id + status "authorized" ("Subscriptions with authorized
// payment, no associated plan").
//
// OJO -- esta integración está escrita contra la documentación pública de
// Mercado Pago pero NO se pudo probar de punta a punta contra una cuenta
// real (el usuario todavía no tiene MERCADOPAGO_ACCESS_TOKEN configurado
// ni para el flujo de Checkout Pro que ya existía). Antes de anunciarla
// como lista para cobrar dinero real, hay que probarla con una tarjeta de
// prueba en una cuenta de Mercado Pago en modo sandbox.

export interface SuscripcionMP {
  preapprovalId: string;
  status: string;
  nextPaymentDate: string | null;
}

/** Crea la suscripción (preapproval) ya autorizada -- requiere un
 * card_token_id ya generado del lado del cliente (Bricks). `frequencyDays`
 * es el número de días entre cada cobro (ej. 30) -- Mercado Pago también
 * acepta frecuencias en "months", pero aquí siempre se manda en días para
 * poder ofrecer frecuencias como "cada 15 días" que no encajan en meses
 * completos. */
export async function crearSuscripcionMP(input: {
  cardTokenId: string;
  payerEmail: string;
  reason: string;
  frequencyDays: number;
  transactionAmountCentavos: number;
  externalReference: string;
}): Promise<SuscripcionMP> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED");

  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      card_token_id: input.cardTokenId,
      back_url: siteUrl(),
      status: "authorized",
      auto_recurring: {
        frequency: input.frequencyDays,
        frequency_type: "days",
        transaction_amount: Math.round(input.transactionAmountCentavos) / 100,
        currency_id: "MXN",
        start_date: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`MERCADOPAGO_PREAPPROVAL_FAILED: ${res.status} ${detalle}`.slice(0, 500));
  }

  const data = (await res.json()) as { id: string; status: string; next_payment_date?: string };
  return { preapprovalId: data.id, status: data.status, nextPaymentDate: data.next_payment_date ?? null };
}

/** Cancela una suscripción del lado de Mercado Pago -- deja de cobrar en
 * ciclos futuros. Se llama cuando el refugio/equipo cancela desde
 * /reportes o /refugio. */
export async function cancelarSuscripcionMP(preapprovalId: string): Promise<void> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED");

  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`MERCADOPAGO_CANCEL_PREAPPROVAL_FAILED: ${res.status} ${detalle}`.slice(0, 500));
  }
}

/** Consulta el estado actual de una suscripción -- se usa para refrescar
 * mpStatus/proximoEnvio (ej. desde el webhook o un refresco manual desde
 * /reportes), en vez de confiar en que nunca cambie. */
export async function obtenerSuscripcionMP(preapprovalId: string): Promise<SuscripcionMP> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED");

  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`MERCADOPAGO_GET_PREAPPROVAL_FAILED: ${res.status}`);
  const data = (await res.json()) as { id: string; status: string; next_payment_date?: string };
  return { preapprovalId: data.id, status: data.status, nextPaymentDate: data.next_payment_date ?? null };
}

/** Detalle de un cobro recurrente ya realizado -- lo consulta el webhook
 * cuando llega la notificación de tópico "subscription_authorized_payment"
 * (ver app/api/mercadopago/webhook). `preapprovalId` es lo que permite
 * relacionar el cobro con la Suscripcion en nuestra base -- el nombre
 * exacto de ese campo en la respuesta no está 100% confirmado contra una
 * cuenta real (ver nota arriba), así que se buscan varios nombres
 * plausibles antes de rendirse. */
export async function obtenerPagoAutorizadoMP(paymentId: string): Promise<{
  id: string;
  status: string;
  preapprovalId: string | null;
  montoCentavos: number | null;
}> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED");

  const res = await fetch(`https://api.mercadopago.com/authorized_payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`MERCADOPAGO_GET_AUTHORIZED_PAYMENT_FAILED: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  const preapprovalId =
    (data.preapproval_id as string) ?? (data.preapprovalId as string) ?? (data.subscription_id as string) ?? null;
  const montoPesos = (data.transaction_amount as number) ?? (data.amount as number) ?? null;
  return {
    id: String(data.id),
    status: String(data.status ?? "unknown"),
    preapprovalId,
    montoCentavos: montoPesos !== null ? Math.round(montoPesos * 100) : null,
  };
}

/** Consulta un pago por su id -- lo usa el webhook para confirmar el
 * estado real en vez de confiar ciegamente en lo que diga la notificación
 * (Mercado Pago recomienda esto: la notificación solo avisa "algo cambió",
 * hay que ir a preguntar el estado real con el id que trae). */
export async function obtenerPagoMercadoPago(paymentId: string): Promise<{
  id: string;
  status: string;
  externalReference: string | null;
}> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED");

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`MERCADOPAGO_GET_PAYMENT_FAILED: ${res.status}`);
  }
  const data = (await res.json()) as { id: number; status: string; external_reference: string | null };
  return { id: String(data.id), status: data.status, externalReference: data.external_reference };
}
