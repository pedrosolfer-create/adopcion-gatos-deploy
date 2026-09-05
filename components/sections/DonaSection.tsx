import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { PawDoodle } from "@/components/rescue/Doodles";
import { iniciarDonativoAction } from "@/app/donar/actions";

/**
 * Montos sugeridos, de menor a mayor (orden pedido explícitamente por el
 * usuario) y cada uno ligado a algo concreto en vez de un monto genérico --
 * investigado en el chat contra costos típicos en México (rangos, no
 * precios exactos de un veterinario en particular; el usuario puede
 * ajustarlos cuando quiera, son solo constantes aquí abajo).
 */
const DONATION_TIERS = [
  { amount: 120, concepto: "Desparasitar a un gato" },
  { amount: 250, concepto: "Una vacuna" },
  { amount: 350, concepto: "Esterilización (campaña de bajo costo)" },
  { amount: 550, concepto: "Una bolsa de comida" },
  { amount: 1300, concepto: "Esterilización (veterinaria particular)" },
] as const;

/**
 * Sección "Dona" (id="dona") -- antes vivía mezclada dentro de la sección
 * de adopción; se separó para que la landing fusionada tenga tres bloques
 * claros (Adopta / Dona / Tienda) en vez de uno solo cargado de todo.
 *
 * Cada botón manda a iniciarDonativoAction (app/donar/actions.ts), que
 * crea el registro del donativo y redirige a pagar -- a Mercado Pago si ya
 * está configurado (tarjeta con Apple Pay/Google Pay, OXXO, SPEI, todo
 * dentro de su checkout hospedado), o a una pantalla para cerrar el
 * donativo por WhatsApp mientras tanto (/donar/manual). Nunca un checkout
 * falso que aparente cobrar sin poder hacerlo de verdad.
 */
export function DonaSection({ montoError }: { montoError?: boolean } = {}) {
  return (
    <section id="dona" className="rescue-theme scroll-mt-14">
      {/* bg-[var(--rescue-ink)]/text-white van en este div interno, NUNCA en
          el mismo elemento que lleva la clase "rescue-theme" -- esa clase
          vive como CSS plano (fuera de cualquier @layer de Tailwind) en
          globals.css, así que su propio `background`/`color` siempre le
          gana a las utilidades de Tailwind (que sí están en @layer
          utilities) cuando compiten en el mismo elemento, sin importar el
          orden en el archivo. Este es el mismo patrón que ya usan
          TiendaSection/AdoptaSection/Carrito. */}
      <div className="bg-[var(--rescue-ink)] text-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-14 sm:py-16 text-center">
        <RibbonBanner tone="accent" className="mx-auto">
          Dona
        </RibbonBanner>
        <p className="mt-4 text-white/80 max-w-xl mx-auto">
          No todos pueden adoptar en este momento -- pero cualquiera puede ayudar a que el
          refugio siga rescatando.
        </p>

        <div className="mt-8 text-left rounded-xl bg-white/10 p-5 sm:p-6 max-w-md mx-auto">
          <h3 className="rescue-display font-extrabold text-lg flex items-center gap-2">
            <PawDoodle className="w-5 h-5" color="var(--rescue-accent)" />
            Elige a qué quieres que ayude tu donativo
          </h3>
          {montoError && (
            <p className="mt-2 text-xs font-semibold text-white bg-rose/30 rounded-lg px-3 py-2">
              Ese monto no es válido -- tiene que ser entre $20 y $50,000 MXN. Intenta de nuevo.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {DONATION_TIERS.map((t) => (
              <form key={t.amount} action={iniciarDonativoAction}>
                <input type="hidden" name="concepto" value={t.concepto} />
                <input type="hidden" name="monto" value={t.amount} />
                <button
                  type="submit"
                  className="w-full flex items-center justify-between gap-3 rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-left hover:bg-white/20 transition-colors"
                >
                  <span className="text-sm text-white/90">{t.concepto}</span>
                  <span className="font-mono font-bold text-[var(--rescue-accent)] shrink-0">
                    ${t.amount} MXN
                  </span>
                </button>
              </form>
            ))}

            {/* Monto libre -- se pide como último botón, después de los
                montos sugeridos, para no competir con ellos (la
                investigación citada en el chat dice que ordenar de menor a
                mayor y mostrar el impacto de cada monto convierte mejor
                que empezar por un campo abierto). */}
            <details className="group mt-1">
              <summary className="cursor-pointer list-none rounded-lg border border-dashed border-white/25 px-4 py-3 text-center text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition-colors [&::-webkit-details-marker]:hidden">
                Donar otra cantidad
              </summary>
              <form
                action={iniciarDonativoAction}
                className="mt-2 flex flex-col gap-2 rounded-lg bg-white/5 p-3"
              >
                <input type="hidden" name="concepto" value="Donativo libre" />
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-white/70">¿Cuánto quieres donar? (MXN)</span>
                  <input
                    type="number"
                    name="monto"
                    min={20}
                    max={50000}
                    step="1"
                    required
                    placeholder="Ej. 200"
                    className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--rescue-accent)]"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--rescue-accent)] text-[var(--rescue-ink)] font-bold text-sm py-2 hover:opacity-90 transition-opacity"
                >
                  Continuar
                </button>
              </form>
            </details>
          </div>

          <p className="mt-4 text-xs text-white/60">
            Puedes pagar con tarjeta (incluye Apple Pay / Google Pay desde tu celular), OXXO,
            transferencia (SPEI) o coordinando por WhatsApp -- lo que te sea más fácil.
          </p>
        </div>
      </div>
      </div>
    </section>
  );
}
