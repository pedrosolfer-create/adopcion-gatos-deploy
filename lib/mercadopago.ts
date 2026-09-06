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
