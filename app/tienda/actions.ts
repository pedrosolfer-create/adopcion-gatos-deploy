"use server";

import { redirect } from "next/navigation";
import { createPedido } from "@/lib/db";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

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
  // alguien manipule el JSON del carrito en el navegador, no puede pagar
  // (cuando haya pasarela conectada) un precio distinto al real.
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

  redirect(`/tienda/gracias?pedido=${pedido.id}`);
}
