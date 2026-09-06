import Link from "next/link";
import { getPedidoById } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { WhatsAppBar } from "@/components/rescue/WhatsAppBar";
import { CONTACTO_WHATSAPP } from "@/lib/contacto";

/**
 * A dónde llega el comprador cuando Mercado Pago todavía no está
 * configurado (falta MERCADOPAGO_ACCESS_TOKEN) o si crear la preferencia
 * falló -- ver app/tienda/actions.ts. Mismo espíritu que app/donar/manual:
 * nada de checkout falso, se le dice claramente que el pago en línea con
 * esta forma no está disponible todavía y se le pasa a WhatsApp con el
 * pedido ya armado para que el equipo lo cierre a mano (transferencia,
 * OXXO por su cuenta, etc.).
 */
export default async function TiendaManualPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const { pedido: pedidoId } = await searchParams;
  const pedido = pedidoId ? await getPedidoById(pedidoId) : null;

  const resumen = pedido
    ? pedido.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(", ")
    : null;
  const mensaje = pedido
    ? `Hola, quiero pagar mi pedido: ${resumen} -- total ${formatMXN(pedido.totalCentavos)}. ¿Cómo le hago?`
    : "Hola, quiero pagar un pedido de la tienda. ¿Cómo le hago?";

  return (
    <main className="rescue-theme rescue-theme--green">
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-[var(--rescue-ink)] text-white">
        <RibbonBanner tone="accent">Casi listo</RibbonBanner>
        <p className="mt-5 text-white/85 max-w-md">
          El pago en línea con tarjeta, OXXO o transferencia todavía no está activo en el sitio.
          Escríbenos por WhatsApp con tu pedido y te decimos cómo depositar (banco, OXXO o donde
          prefieras) y cómo recoges o te enviamos tus productos -- es rápido.
        </p>
        {pedido && (
          <div className="mt-6 rounded-xl bg-white/10 p-4 text-left text-sm w-full max-w-sm">
            <ul className="flex flex-col gap-1">
              {pedido.items.map((it) => (
                <li key={it.productoId} className="flex justify-between gap-2">
                  <span>
                    {it.cantidad}× {it.nombre}
                  </span>
                  <span className="font-mono">{formatMXN(it.precioUnitarioCentavos * it.cantidad)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-white/15 mt-2 pt-2 font-semibold">
              <span>Total</span>
              <span className="font-mono text-[var(--rescue-accent)]">{formatMXN(pedido.totalCentavos)}</span>
            </div>
          </div>
        )}
        <div className="mt-8 w-full max-w-sm">
          <WhatsAppBar phone={CONTACTO_WHATSAPP} message={mensaje} label="Escríbenos" />
        </div>
        <Link href="/#tienda" className="mt-8 text-sm font-semibold text-[var(--rescue-accent)] underline">
          ← Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
