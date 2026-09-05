import Link from "next/link";
import { getDonativoById } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { HeartDoodle } from "@/components/rescue/Doodles";

const MENSAJES: Record<string, { titulo: string; texto: string }> = {
  pendiente: {
    titulo: "Donativo en proceso",
    texto:
      "Tu pago quedó pendiente de confirmar (esto pasa con OXXO y SPEI -- se acredita cuando " +
      "completas el pago en la tienda o tu banco procesa la transferencia). No necesitas hacer " +
      "nada más de tu parte.",
  },
  fallo: {
    titulo: "No se pudo completar el donativo",
    texto: "El pago no se completó -- puedes intentar de nuevo desde la sección de donativos.",
  },
};

/** Página a la que Mercado Pago regresa al donante después del checkout
 * (success / pending / failure -- ver back_urls en lib/mercadopago.ts). El
 * estado real y definitivo del pago lo confirma el webhook
 * (app/api/mercadopago/webhook/route.ts), no esta página -- esto solo
 * refleja lo que Mercado Pago reportó en el momento del regreso. */
export default async function DonarGraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ donativo?: string; estado?: string }>;
}) {
  const { donativo: donativoId, estado } = await searchParams;
  const donativo = donativoId ? await getDonativoById(donativoId) : null;
  const msg = estado ? MENSAJES[estado] : null;

  return (
    // bg-[var(--rescue-ink)]/text-white van en el div interno, no en el
    // mismo elemento que "rescue-theme" -- ver el comentario en
    // components/sections/DonaSection.tsx para el porqué (choque de @layer
    // de Tailwind contra CSS plano).
    <main className="rescue-theme">
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-[var(--rescue-ink)] text-white">
        <HeartDoodle className="w-14 h-14 mb-4" color="var(--rescue-accent)" />
        <RibbonBanner tone="accent">{msg ? msg.titulo : "¡Gracias por tu donativo!"}</RibbonBanner>
        <p className="mt-5 text-white/85 max-w-md">
          {msg
            ? msg.texto
            : "Tu apoyo ayuda directo a la comida, vacunas y cuidado de los gatos del refugio mientras esperan un hogar."}
        </p>
        {donativo && (
          <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm w-full max-w-sm flex justify-between gap-2">
            <span>{donativo.concepto}</span>
            <span className="font-mono font-semibold text-[var(--rescue-accent)]">
              {formatMXN(donativo.montoCentavos)}
            </span>
          </div>
        )}
        <Link href="/#dona" className="mt-8 text-sm font-semibold text-[var(--rescue-accent)] underline">
          ← Volver a la sección de donativos
        </Link>
      </div>
    </main>
  );
}
