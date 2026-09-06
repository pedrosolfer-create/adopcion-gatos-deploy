import Link from "next/link";
import { getPedidoById } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { HeartDoodle } from "@/components/rescue/Doodles";

const MENSAJES: Record<string, { titulo: string; texto: string }> = {
  pendiente: {
    titulo: "Pedido en proceso",
    texto:
      "Tu pago quedó pendiente de confirmar (esto pasa con OXXO y SPEI -- se acredita cuando " +
      "completas el pago en la tienda o tu banco procesa la transferencia). No necesitas hacer " +
      "nada más de tu parte, el equipo prepara tu pedido en cuanto se confirme.",
  },
  fallo: {
    titulo: "No se pudo completar el pago",
    texto: "El pago no se completó -- puedes intentar de nuevo desde la tienda.",
  },
};

/** Página a la que Mercado Pago regresa al comprador después del checkout
 * (success / pending / failure -- ver back_urls en
 * lib/mercadopago.ts#crearPreferenciaPedido). El estado real y definitivo
 * del pago lo confirma el webhook (app/api/mercadopago/webhook/route.ts),
 * no esta página -- esto solo refleja lo que Mercado Pago reportó en el
 * momento del regreso. Si Mercado Pago no está configurado, el comprador
 * nunca pasa por aquí directo -- cae primero a /tienda/manual. */
export default async function TiendaGraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; estado?: string }>;
}) {
  const { pedido: pedidoId, estado } = await searchParams;
  const pedido = pedidoId ? await getPedidoById(pedidoId) : null;
  const msg = estado ? MENSAJES[estado] : null;

  return (
    // bg-[var(--rescue-ink)]/text-white van en el div interno, no en el
    // mismo elemento que "rescue-theme" -- ver el comentario en
    // components/sections/DonaSection.tsx para el porqué (choque de @layer
    // de Tailwind contra CSS plano; esto ya estaba así desde antes de esta
    // ronda -- se corrige de una vez porque es el mismo bug).
    <main className="rescue-theme rescue-theme--green">
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-[var(--rescue-ink)] text-white">
        <HeartDoodle className="w-14 h-14 mb-4" color="var(--rescue-accent)" />
        <RibbonBanner tone="accent">{msg ? msg.titulo : "¡Pedido recibido!"}</RibbonBanner>
        <p className="mt-5 text-white/85 max-w-md">
          {msg
            ? msg.texto
            : "Gracias por tu compra -- el equipo coordina contigo por WhatsApp cómo recoges o te " +
              "enviamos tu pedido."}
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
            <p className="mt-2 text-[11px] text-white/60">
              De tu compra, {formatMXN(pedido.montoRefugiosCentavos)} se destinan a refugios.
            </p>
          </div>
        )}
        <Link href="/tienda" className="mt-8 text-sm font-semibold text-[var(--rescue-accent)] underline">
          ← Seguir viendo la tienda
        </Link>
      </div>
    </main>
  );
}
