import { getGatoById, listProductosSuscribibles } from "@/lib/db";
import { isMercadoPagoPublicKeyConfigured } from "@/lib/mercadopago";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { SuscripcionForm } from "@/components/suscripcion/SuscripcionForm";

export const dynamic = "force-dynamic";

/**
 * Página pública para que el adoptante configure el reenvío automático de
 * comida/arena -- se llega aquí desde el link "Configurar envíos
 * automáticos" que aparece en /refugio junto a un gato marcado ADOPTADO
 * (ver app/refugio/page.tsx), con ?gatoId=... precargado, pero también
 * funciona sin gatoId (el equipo puede compartir el link genérico).
 */
export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ gatoId?: string }>;
}) {
  const { gatoId } = await searchParams;
  const gato = gatoId ? await getGatoById(gatoId) : null;
  const productos = await listProductosSuscribibles();
  const publicKeyLista = isMercadoPagoPublicKeyConfigured();

  return (
    <div className="rescue-theme min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-lg px-4 sm:px-6 py-10 sm:py-14">
        <RibbonBanner tone="dark" className="mb-4">
          Reenvío automático
        </RibbonBanner>
        <h1 className="rescue-display text-3xl font-extrabold text-[var(--rescue-ink)] mb-1">
          {gato ? `Comida y arena para ${gato.nombre}` : "Comida y arena a domicilio"}
        </h1>
        <p className="text-sm text-[var(--rescue-ink)]/70 mb-6">
          Elige qué producto quieres recibir, cada cuánto, y autoriza el cobro con tu tarjeta --
          te avisamos por correo y WhatsApp antes de cada envío. Puedes cancelar cuando quieras.
        </p>

        {!publicKeyLista ? (
          <div className="rounded-xl border-2 border-[var(--rescue-ink)]/10 bg-white p-5 text-sm text-[var(--rescue-ink)]/70">
            Los envíos automáticos con tarjeta todavía no están activados en este sitio -- si
            quieres recibir comida o arena periódicamente, escríbenos directo por WhatsApp y lo
            coordinamos a mano mientras tanto.
          </div>
        ) : productos.length === 0 ? (
          <div className="rounded-xl border-2 border-[var(--rescue-ink)]/10 bg-white p-5 text-sm text-[var(--rescue-ink)]/70">
            Todavía no hay productos disponibles para reenvío automático.
          </div>
        ) : (
          <SuscripcionForm
            gatoId={gato?.id}
            productos={productos.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              precioAdoptanteCentavos: p.precioAdoptanteCentavos,
              categoria: p.categoria,
            }))}
            publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!}
          />
        )}
      </div>
    </div>
  );
}
