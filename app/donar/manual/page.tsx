import Link from "next/link";
import { getDonativoById } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { WhatsAppBar } from "@/components/rescue/WhatsAppBar";
import { CONTACTO_WHATSAPP } from "@/lib/contacto";

/**
 * A dónde llega el donante cuando Mercado Pago todavía no está configurado
 * (falta MERCADOPAGO_ACCESS_TOKEN) o si crear la preferencia falló -- ver
 * app/donar/actions.ts. Nada de checkout falso: se le dice claramente que
 * el pago en línea con esta forma no está disponible todavía y se le pasa
 * a WhatsApp con el concepto y monto ya armados para que el equipo cierre
 * el donativo a mano (transferencia, OXXO por su cuenta, etc.).
 */
export default async function DonarManualPage({
  searchParams,
}: {
  searchParams: Promise<{ donativo?: string }>;
}) {
  const { donativo: donativoId } = await searchParams;
  const donativo = donativoId ? await getDonativoById(donativoId) : null;

  const mensaje = donativo
    ? `Hola, quiero hacer un donativo de ${formatMXN(donativo.montoCentavos)} (${donativo.concepto}). ¿Cómo le hago?`
    : "Hola, quiero hacer un donativo. ¿Cómo le hago?";

  return (
    <main className="rescue-theme min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-[var(--rescue-ink)] text-white">
      <RibbonBanner tone="accent">Casi listo</RibbonBanner>
      <p className="mt-5 text-white/85 max-w-md">
        El pago en línea con tarjeta, OXXO o transferencia todavía no está activo en el sitio.
        Escríbenos por WhatsApp con el monto que elegiste y te decimos cómo depositar (banco,
        OXXO o donde prefieras) -- es rápido.
      </p>
      {donativo && (
        <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm w-full max-w-sm flex justify-between gap-2">
          <span>{donativo.concepto}</span>
          <span className="font-mono font-semibold text-[var(--rescue-accent)]">
            {formatMXN(donativo.montoCentavos)}
          </span>
        </div>
      )}
      <div className="mt-8 w-full max-w-sm">
        <WhatsAppBar phone={CONTACTO_WHATSAPP} message={mensaje} label="Escríbenos" />
      </div>
      <Link href="/#dona" className="mt-8 text-sm font-semibold text-[var(--rescue-accent)] underline">
        ← Volver a la sección de donativos
      </Link>
    </main>
  );
}
