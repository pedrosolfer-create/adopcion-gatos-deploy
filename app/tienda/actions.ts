"use server";

import { redirect } from "next/navigation";
import { createPedido, setPedidoPreferenceId } from "@/lib/db";
import { isMercadoPagoConfigured, crearPreferenciaPedido } from "@/lib/mercadopago";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/**
 * Crea el pedido (siempre, para tener rastro incluso si Mercado Pago falla
 * o no está configurado) y manda al comprador a pagar -- mismo patrón que
 * iniciarDonativoAction en app/donar/actions.ts:
 * - Si Mercado Pago está configurado, a su checkout hospedado (tarjeta con
 *   Apple Pay/Google Pay si el celular lo soporta, OXXO, SPEI -- todo eso
 *   lo arma Mercado Pago).
 * - Si no, a /tienda/manual, con el pedido ya creado, para que el
 *   comprador escriba por WhatsApp y el equipo cierre el pedido a mano.
 *
 * OJO con el orden: redirect() se llama SIEMPRE fuera de cualquier
 * try/catch (arma `destino` primero) -- ver el mismo comentario en
 * app/donar/actions.ts para el porqué.
 */
export async function submitPedidoAction(formData: FormData) {
  const compradorNombre = str(formData, "compradorNombre");
  const compradorTelefono = str(formData, "compradorTelefono");
  const itemsRaw = str(formData, "itemsJson");
  if (!compradorNombre || !compradorTelefono || !itemsRaw) return;

  let items: Array<{ productoId: string; cantidad: number }>;
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return;
  }
  if (!Array.isArray(items) || items.length === 0) return;

  // OJO: los precios y nombres NO vienen del formulario -- createPedido los
  // vuelve a buscar en la base de datos por productoId, así que aunque
  // alguien manipule el JSON del carrito en el navegador, no puede pagar un
  // precio distinto al real.
  const pedido = await createPedido({
    compradorNombre,
    compradorTelefono,
    compradorEmail: str(formData, "compradorEmail") || undefined,
    esAdoptante: str(formData, "esAdoptante") === "1",
    items: items
      .filter((it) => it && typeof it.productoId === "string" && Number(it.cantidad) > 0)
      .map((it) => ({ productoId: it.productoId, cantidad: Math.floor(Number(it.cantidad)) })),
  });

  if (pedido.items.length === 0) return;

  let destino = `/tienda/manual?pedido=${pedido.id}`;
  if (isMercadoPagoConfigured()) {
    try {
      const { preferenceId, initPoint } = await crearPreferenciaPedido({
        pedidoId: pedido.id,
        items: pedido.items,
      });
      await setPedidoPreferenceId(pedido.id, preferenceId);
      destino = initPoint;
    } catch (err) {
      console.error("CREAR_PREFERENCIA_PEDIDO_FAILED", err);
      // destino ya quedó apuntando a /tienda/manual -- se sigue ese camino.
    }
  }

  redirect(destino);
}
