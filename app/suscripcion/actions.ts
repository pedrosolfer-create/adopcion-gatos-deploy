"use server";

import { redirect } from "next/navigation";
import {
  createSuscripcion,
  actualizarSuscripcionMP,
  getProductoById,
  getGatoById,
  updateSuscripcionStatus,
} from "@/lib/db";
import { crearSuscripcionMP, cancelarSuscripcionMP } from "@/lib/mercadopago";
import { enviarCorreo, correoConfirmacionSuscripcion } from "@/lib/email";
import { formatMXN } from "@/lib/money";

const FRECUENCIAS_VALIDAS = [15, 30, 45, 60];

/**
 * Crea la suscripción de reenvío automático -- se llama directo desde el
 * cliente (no es un <form action=...> tradicional) porque el token de
 * tarjeta se genera de forma asíncrona en el navegador (Mercado Pago
 * Bricks, ver components/suscripcion/TarjetaBrick.tsx) DESPUÉS de que la
 * persona ya llenó el resto del formulario -- un Server Action normal
 * puede recibir cualquier objeto serializable, no solo un FormData, así
 * que esto es una forma igual de válida de invocarlo.
 *
 * Se crea el registro en la base ANTES de llamar a Mercado Pago (mismo
 * patrón que createPedido/createDonativo) para tener rastro incluso si la
 * suscripción falla del lado de Mercado Pago -- si falla, el registro
 * local queda en CANCELADA con la razón en notas, no se pierde el intento.
 */
export async function crearSuscripcionAction(input: {
  gatoId?: string;
  productoId: string;
  cantidad: number;
  frecuenciaDias: number;
  adoptanteNombre: string;
  adoptanteTelefono?: string;
  adoptanteEmail: string;
  cardToken: string;
}): Promise<{ ok: true; suscripcionId: string } | { ok: false; error: string }> {
  if (!input.adoptanteNombre.trim() || !input.adoptanteEmail.trim() || !input.cardToken) {
    return { ok: false, error: "Faltan datos obligatorios." };
  }
  const producto = await getProductoById(input.productoId);
  if (!producto || !producto.activo || !producto.categoria) {
    return { ok: false, error: "Ese producto ya no está disponible para suscripción." };
  }
  const cantidad = Math.max(1, Math.floor(input.cantidad) || 1);
  const frecuenciaDias = FRECUENCIAS_VALIDAS.includes(input.frecuenciaDias) ? input.frecuenciaDias : 30;
  // El precio SIEMPRE se vuelve a calcular aquí desde el producto real en
  // la base -- nunca se confía en un monto que venga del navegador (mismo
  // criterio que createPedido en lib/db.ts).
  const montoCentavos = producto.precioAdoptanteCentavos * cantidad;

  // El refugioId se deriva del gato en el servidor (nunca de un valor que
  // mande el navegador) -- es solo informativo (para que el equipo filtre
  // suscripciones por refugio), pero igual no hay razón para confiar en un
  // dato que la persona podría manipular.
  const gato = input.gatoId ? await getGatoById(input.gatoId) : null;

  const suscripcion = await createSuscripcion({
    gatoId: gato?.id,
    refugioId: gato?.refugioId,
    productoId: producto.id,
    cantidad,
    adoptanteNombre: input.adoptanteNombre.trim(),
    adoptanteTelefono: input.adoptanteTelefono?.trim() || undefined,
    adoptanteEmail: input.adoptanteEmail.trim(),
    frecuenciaDias,
  });

  try {
    const mp = await crearSuscripcionMP({
      cardTokenId: input.cardToken,
      payerEmail: input.adoptanteEmail.trim(),
      reason: `${producto.nombre} x${cantidad} cada ${frecuenciaDias} días`,
      frequencyDays: frecuenciaDias,
      transactionAmountCentavos: montoCentavos,
      externalReference: suscripcion.id,
    });
    await actualizarSuscripcionMP(suscripcion.id, { mpStatus: mp.status, proximoEnvio: mp.nextPaymentDate ?? undefined });
  } catch (err) {
    console.error("CREAR_SUSCRIPCION_MP_FAILED", err);
    await updateSuscripcionStatus(suscripcion.id, "CANCELADA");
    return {
      ok: false,
      error:
        "No se pudo autorizar el cobro con Mercado Pago. Verifica los datos de la tarjeta o intenta de nuevo en unos minutos.",
    };
  }

  await enviarCorreo({
    to: input.adoptanteEmail.trim(),
    ...correoConfirmacionSuscripcion({
      adoptanteNombre: input.adoptanteNombre.trim(),
      productoNombre: producto.nombre,
      cantidad,
      frecuenciaDias,
      montoTexto: formatMXN(montoCentavos),
    }),
  });

  return { ok: true, suscripcionId: suscripcion.id };
}

/** Cancela una suscripción -- se llama desde /reportes o /refugio. Cancela
 * primero del lado de Mercado Pago (para que de verdad deje de cobrar) y
 * solo si eso funciona, actualiza el registro local -- si Mercado Pago
 * falla, es mejor que el equipo lo note (el status local se queda como
 * estaba) a que el sistema "crea" que ya canceló cuando en realidad
 * Mercado Pago va a seguir cobrando. */
export async function cancelarSuscripcionAction(formData: FormData) {
  const id = String(formData.get("suscripcionId") ?? "");
  const mpPreapprovalId = String(formData.get("mpPreapprovalId") ?? "");
  if (!id) return;

  if (mpPreapprovalId) {
    try {
      await cancelarSuscripcionMP(mpPreapprovalId);
    } catch (err) {
      console.error("CANCELAR_SUSCRIPCION_MP_FAILED", err);
      redirect(`${String(formData.get("volverA") ?? "/reportes")}?suscripcionError=1`);
    }
  }
  await updateSuscripcionStatus(id, "CANCELADA");
  redirect(String(formData.get("volverA") ?? "/reportes"));
}
