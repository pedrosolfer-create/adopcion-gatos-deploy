import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { PawDoodle } from "@/components/rescue/Doodles";

const DONATION_TIERS = [
  { amount: 100, impact: "Comida para un gato una semana" },
  { amount: 300, impact: "Una desparasitación completa" },
  { amount: 600, impact: "Una esterilización" },
] as const;

/**
 * Sección "Dona" (id="dona") -- antes vivía mezclada dentro de la sección
 * de adopción; se separó para que la landing fusionada tenga tres bloques
 * claros (Adopta / Dona / Tienda) en vez de uno solo cargado de todo.
 */
export function DonaSection() {
  return (
    <section id="dona" className="rescue-theme bg-[var(--rescue-ink)] text-white scroll-mt-14">
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
            Tu donativo cubre
          </h3>
          <p className="mt-1 text-sm text-white/80">
            Comida, vacunas, desparasitación y esterilización de los gatos mientras esperan un
            hogar, y mantiene abiertas las campañas de rescate y adopción como esta.
          </p>

          {/* Montos sugeridos con su impacto, orden bajo a alto (según
              investigación citada en el chat: el orden bajo-a-alto y
              ligar cada monto a un impacto concreto convierte mejor que
              un monto genérico o solo un campo abierto). El monto libre
              siempre queda disponible también -- no se fuerza a nadie a
              un tier. */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {DONATION_TIERS.map((t) => (
              <div key={t.amount} className="rounded-lg bg-white/10 border border-white/15 px-2.5 py-2 text-center">
                <div className="font-mono font-bold text-sm">${t.amount} MXN</div>
                <div className="mt-0.5 text-[11px] text-white/70 leading-snug">{t.impact}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/60">
            O dona lo que puedas -- cualquier cantidad ayuda, no tiene que ser uno de estos montos.
          </p>

          {/* TODO: reemplazar por los datos bancarios reales (banco,
              CLABE, titular) en cuanto se confirmen -- a propósito NO se
              construyó un checkout con tarjeta/OXXO falso. El titular
              mencionado es Tessie Sit; falta el banco y la CLABE para
              publicarlos aquí. */}
          <a
            href="mailto:donaciones@turefugio.org?subject=Quiero%20donar"
            className="mt-4 inline-block text-sm font-semibold text-[var(--rescue-accent)] underline"
          >
            Escríbenos para donar por transferencia →
          </a>
        </div>
      </div>
    </section>
  );
}
