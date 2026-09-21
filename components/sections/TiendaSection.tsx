import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { Carrito } from "@/components/tienda/Carrito";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import type { Producto } from "@/lib/db";

/** Sección "Tienda" (id="tienda") -- antes era su propia página en /tienda;
 * ahora vive como tercer bloque de la landing fusionada. La ruta /tienda
 * sigue existiendo, pero solo como redirección hacia aquí (ver
 * app/tienda/page.tsx) para no romper links que ya existan. */
export function TiendaSection({ productos }: { productos: Producto[] }) {
  return (
    <section id="tienda" className="rescue-theme rescue-theme--green scroll-mt-14">
      <div className="bg-[var(--rescue-ink)] text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
          <RibbonBanner tone="accent">Tienda</RibbonBanner>
          <h2 className="rescue-script text-5xl sm:text-6xl mt-4">Comida, arena y más para tu gato</h2>
          <p className="mt-3 text-white/80 max-w-xl">
            Si ya adoptaste con nosotros, tienes 10% de descuento en todo. Además, el 10% de cada
            compra se destina a los refugios.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <Carrito productos={productos} pagoEnLineaDisponible={isMercadoPagoConfigured()} />
        </div>
      </div>
    </section>
  );
}
