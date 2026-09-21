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

export function Carrito({ productos }: { productos: ProductoPublico[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [esAdoptante, setEsAdoptante] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const productoPorId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const cartCount = Object.values(cart).reduce((s, c) => s + c, 0);
  const totalCentavos = Object.entries(cart).reduce((sum, [id, cantidad]) => {
    const p = productoPorId.get(id);
    if (!p) return sum;
    const precio = esAdoptante ? p.precioAdoptanteCentavos : p.precioNormalCentavos;
    return sum + precio * cantidad;
  }, 0);

  function addToCart(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function removeFromCart(id: string) {
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return next;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  const itemsJson = JSON.stringify(
    Object.entries(cart).map(([productoId, cantidad]) => ({ productoId, cantidad }))
  );

  if (productos.length === 0) {
    return (
      <p className="text-sm text-[var(--rescue-ink)]/70">
        Todavía no hay productos en la tienda -- vuelve pronto.
      </p>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
        {productos.map((p) => {
          const cantidad = cart[p.id] ?? 0;
          return (
            <div key={p.id} className="rounded-xl bg-white border-2 border-[var(--rescue-ink)]/10 p-4 flex flex-col gap-2">
              <h3 className="rescue-display font-extrabold text-base text-[var(--rescue-ink)]">{p.nombre}</h3>
              {p.descripcion && <p className="text-sm text-[var(--rescue-ink)]/70">{p.descripcion}</p>}
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xs line-through text-[var(--rescue-ink)]/40">
                  {formatMXN(p.precioNormalCentavos)}
                </span>
                <span className="font-mono font-extrabold text-[var(--rescue-accent-deep)] text-lg">
                  {formatMXN(p.precioAdoptanteCentavos)}
                </span>
                <span className="text-[10px] font-mono text-[var(--rescue-ink)]/50">precio adoptante</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => removeFromCart(p.id)}
                  disabled={cantidad === 0}
                  className="w-7 h-7 rounded-full bg-[var(--rescue-paper-alt)] font-bold disabled:opacity-30"
                >
                  −
                </button>
                <span className="font-mono text-sm w-4 text-center">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => addToCart(p.id)}
                  className="w-7 h-7 rounded-full bg-[var(--rescue-accent)] text-[var(--rescue-ink)] font-bold"
                >
                  +
                </button>
                <span className="ml-auto text-xs font-mono font-semibold text-[var(--rescue-ink)]">
                  {cantidad > 0
                    ? `Agregado (${cantidad})`
                    : "Agregar al carrito"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Carrito / checkout ---------- */}
      <div className="lg:sticky lg:top-6 rounded-xl bg-[var(--rescue-ink)] text-white p-5 flex flex-col gap-3">
        <RibbonBanner tone="accent" className="self-start !py-1.5 !px-3 text-xs">
          Tu carrito
        </RibbonBanner>

        {cartCount === 0 && <p className="text-sm text-white/70 mt-2">Todavía no has agregado productos.</p>}

        {cartCount > 0 && (
          <>
            <ul className="text-sm flex flex-col gap-1 mt-2">
              {Object.entries(cart).map(([id, cantidad]) => {
                const p = productoPorId.get(id);
                if (!p) return null;
                const precio = esAdoptante ? p.precioAdoptanteCentavos : p.precioNormalCentavos;
                return (
                  <li key={id} className="flex justify-between gap-2">
                    <span>
                      {cantidad}× {p.nombre}
                    </span>
                    <span className="font-mono">{formatMXN(precio * cantidad)}</span>
                  </li>
                );
              })}
            </ul>

            <label className="flex items-center gap-2 text-xs text-white/80 mt-2">
              <input
                type="checkbox"
                checked={esAdoptante}
                onChange={(e) => setEsAdoptante(e.target.checked)}
              />
              Ya adopté un gato aquí (aplica el precio de adoptante)
            </label>

            <div className="flex justify-between items-baseline border-t border-white/15 pt-2 mt-1">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-mono font-extrabold text-xl text-[var(--rescue-accent)]">
                {formatMXN(totalCentavos)}
              </span>
            </div>

            {!checkoutOpen && (
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="rescue-ribbon rescue-display bg-[var(--rescue-accent)] text-[var(--rescue-ink)] px-4 py-2.5 font-extrabold uppercase text-sm mt-2"
              >
                Continuar pedido →
              </button>
            )}

            {checkoutOpen && (
              <form action={submitPedidoAction} className="flex flex-col gap-2 mt-2 text-sm">
                <input type="hidden" name="itemsJson" value={itemsJson} />
                <input type="hidden" name="esAdoptante" value={esAdoptante ? "1" : "0"} />
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-white/70">Tu nombre *</span>
                  <input name="compradorNombre" required className="input text-[var(--rescue-ink)]" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-white/70">Teléfono (WhatsApp) *</span>
                  <input name="compradorTelefono" required type="tel" className="input text-[var(--rescue-ink)]" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-white/70">Correo (opcional)</span>
                  <input name="compradorEmail" type="email" className="input text-[var(--rescue-ink)]" />
                </label>
                <p className="text-[11px] text-white/60 mt-1">
                  Todavía no hay pago en línea conectado -- al enviar, el equipo te contacta por
                  WhatsApp o correo para coordinar cómo pagas.
                </p>
                <button
                  type="submit"
                  className="rescue-ribbon rescue-display bg-[var(--rescue-accent)] text-[var(--rescue-ink)] px-4 py-2.5 font-extrabold uppercase text-sm mt-1"
                >
                  Confirmar pedido →
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
