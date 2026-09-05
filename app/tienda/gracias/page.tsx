import Link from "next/link";
import { getPedidoById } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { HeartDoodle } from "@/components/rescue/Doodles";

export default async function TiendaGraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const { pedido: pedidoId } = await searchParams;
  const pedido = pedidoId ? await getPedidoById(pedidoId) : null;

  return (
    // bg-[var(--rescue-ink)]/text-white van en el div interno, no en el
    // mismo elemento que "rescue-theme" -- ver el comentario en
    // components/sections/DonaSection.tsx para el porqué (choque de @layer
    // de Tailwind contra CSS plano; esto ya estaba así desde antes de esta
    // ronda -- se corrige de una vez porque es el mismo bug).
    <main className="rescue-theme rescue-theme--green">
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-[var(--rescue-ink)] text-white">
        <HeartDoodle className="w-14 h-14 mb-4" color="var(--rescue-accent)" />
        <RibbonBanner tone="accent">¡Pedido recibido!</RibbonBanner>
        <p className="mt-5 text-white/85 max-w-md">
          El equipo te contacta por WhatsApp o correo para coordinar cómo pagas y cómo recoges o
          te enviamos tu pedido -- todavía no hay pago en línea conectado.
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
        <Link href="/tienda" className="mt-8 text-sm font-semibold text-[var(--rescue-accent)] underline">
          ← Seguir viendo la tienda
        </Link>
      </div>
    </main>
  );
}
