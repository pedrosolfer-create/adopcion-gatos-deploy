"use client";

import { useMemo, useState } from "react";
import { submitPedidoAction } from "@/app/tienda/actions";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { formatMXN } from "@/lib/money";

type ProductoPublico = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precioNormalCentavos: number;
  precioAdoptanteCentavos: number;
  fotoUrl: string | null;
  stock: number | null;
};

const PORCENTAJE_REFUGIOS = 0.1; // debe coincidir con lib/db.ts#PORCENTAJE_REFUGIOS

const ID_RESUMEN = "carrito-resumen";

/** Tarjeta de un producto -- tiene su propio selector de cantidad (1 por
 * default) independiente del carrito, para poder ofrecer "Comprar ahora"
 * (salta directo al checkout con solo este producto) sin obligar a pasar
 * primero por "Agregar al carrito". */
function ProductoCard({
  producto,
  onAgregar,
  onComprarAhora,
}: {
  producto: ProductoPublico;
  onAgregar: (id: string, cantidad: number) => void;
  onComprarAhora: (id: string, cantidad: number) => void;
}) {
  const [cantidad, setCantidad] = useState(1);

  return (
    <div className="rounded-xl bg-white border-2 border-[var(--rescue-ink)]/10 p-4 flex flex-col gap-2">
      {producto.fotoUrl && (
        <div className="aspect-square rounded-lg overflow-hidden bg-[var(--rescue-paper-alt)] mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={producto.fotoUrl} alt={producto.nombre} className="w-full h-full object-contain" />
        </div>
      )}
      <h3 className="rescue-display font-extrabold text-base text-[var(--rescue-ink)]">{producto.nombre}</h3>
      {producto.descripcion && <p className="text-sm text-[var(--rescue-ink)]/70">{producto.descripcion}</p>}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xs line-through text-[var(--rescue-ink)]/40">
          {formatMXN(producto.precioNormalCentavos)}
        </span>
        <span className="font-mono font-extrabold text-[var(--rescue-accent-deep)] text-lg">
          {formatMXN(producto.precioAdoptanteCentavos)}
        </span>
        <span className="text-[10px] font-mono text-[var(--rescue-ink)]/50">precio adoptante (-10%)</span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          className="w-7 h-7 rounded-full bg-[var(--rescue-paper-alt)] font-bold"
        >
          −
        </button>
        <span className="font-mono text-sm w-4 text-center">{cantidad}</span>
        <button
          type="button"
          onClick={() => setCantidad((c) => c + 1)}
          className="w-7 h-7 rounded-full bg-[var(--rescue-paper-alt)] font-bold"
        >
          +
        </button>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onAgregar(producto.id, cantidad)}
          className="rounded-lg border-2 border-[var(--rescue-ink)] text-[var(--rescue-ink)] px-3 py-2 font-bold text-xs uppercase hover:bg-[var(--rescue-paper-alt)] transition"
        >
          Agregar al carrito
        </button>
        <button
          type="button"
          onClick={() => onComprarAhora(producto.id, cantidad)}
          className="rescue-ribbon rescue-display bg-[var(--rescue-accent)] text-[var(--rescue-ink)] px-3 py-2 font-extrabold text-xs uppercase hover:opacity-90 transition"
        >
          Comprar →
        </button>
      </div>
    </div>
  );
}

export function Carrito({
  productos,
  pagoEnLineaDisponible,
}: {
  productos: ProductoPublico[];
  /** Si Mercado Pago está configurado en el servidor -- cambia el mensaje
   * de qué pasa al confirmar el pedido (checkout real vs. WhatsApp
   * manual). Viene de isMercadoPagoConfigured() en TiendaSection, un
   * server component -- Carrito es cliente y no puede leer esa variable
   * de entorno directo. */
  pagoEnLineaDisponible: boolean;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [esAdoptante, setEsAdoptante] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const productoPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const cartCount = Object.values(cart).reduce((s, c) => s + c, 0);
  const totalCentavos = Object.entries(cart).reduce((sum, [id, cantidad]) => {
    const p = productoPorId.get(id);
    if (!p) return sum;
    const precio = esAdoptante ? p.precioAdoptanteCentavos :
