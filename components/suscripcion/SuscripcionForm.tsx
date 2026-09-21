"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TarjetaBrick } from "./TarjetaBrick";
import { crearSuscripcionAction } from "@/app/suscripcion/actions";
import { formatMXN } from "@/lib/money";

type ProductoPublico = {
  id: string;
  nombre: string;
  precioAdoptanteCentavos: number;
  categoria: string | null;
};

const FRECUENCIAS = [15, 30, 45, 60];

export function SuscripcionForm({
  gatoId,
  productos,
  publicKey,
}: {
  gatoId?: string;
  productos: ProductoPublico[];
  publicKey: string;
}) {
  const router = useRouter();
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState(1);
  const [frecuenciaDias, setFrecuenciaDias] = useState(30);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const producto = useMemo(() => productos.find((p) => p.id === productoId), [productos, productoId]);
  const montoCentavos = (producto?.precioAdoptanteCentavos ?? 0) * cantidad;
  const datosCompletos = Boolean(producto && nombre.trim() && email.trim());

  async function onToken(token: string) {
    setEnviando(true);
    setError(null);
    const resultado = await crearSuscripcionAction({
      gatoId,
      productoId,
      cantidad,
      frecuenciaDias,
      adoptanteNombre: nombre,
      adoptanteTelefono: telefono || undefined,
      adoptanteEmail: email,
      cardToken: token,
    });
    setEnviando(false);
    if (resultado.ok) {
      router.push(`/suscripcion/gracias?id=${resultado.suscripcionId}`);
    } else {
      setError(resultado.error);
      setMostrarTarjeta(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border-2 border-[var(--rescue-ink)]/10 bg-white p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--rescue-ink)]">Producto</span>
          <select
            className="input"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            disabled={mostrarTarjeta}
          >
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} -- {formatMXN(p.precioAdoptanteCentavos)} c/u
                {p.categoria === "COMIDA" ? " (comida)" : p.categoria === "ARENA" ? " (arena)" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--rescue-ink)]">Cantidad por envío</span>
            <input
              type="number"
              min={1}
              max={10}
              className="input"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
              disabled={mostrarTarjeta}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--rescue-ink)]">Cada cuánto</span>
            <select
              className="input"
              value={frecuenciaDias}
              onChange={(e) => setFrecuenciaDias(Number(e.target.value))}
              disabled={mostrarTarjeta}
            >
              {FRECUENCIAS.map((f) => (
                <option key={f} value={f}>
                  {f} días
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--rescue-ink)]">Tu nombre *</span>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={mostrarTarjeta} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--rescue-ink)]">WhatsApp</span>
          <input
            type="tel"
            className="input"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            disabled={mostrarTarjeta}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[var(--rescue-ink)]">Correo *</span>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={mostrarTarjeta}
          />
          <span className="text-[11px] text-[var(--rescue-ink)]/50">
            Aquí te avisamos antes de cada cobro y cuando ya se hizo.
          </span>
        </label>

        <div className="flex justify-between items-baseline border-t border-[var(--rescue-ink)]/10 pt-3">
          <span className="text-sm font-semibold text-[var(--rescue-ink)]">Por envío</span>
          <span className="font-mono font-extrabold text-xl text-[var(--rescue-accent-deep)]">
            {formatMXN(montoCentavos)}
          </span>
        </div>

        {!mostrarTarjeta && (
          <button
            type="button"
            disabled={!datosCompletos}
            onClick={() => setMostrarTarjeta(true)}
            className="rescue-ribbon rescue-display bg-[var(--rescue-accent)] text-[var(--rescue-ink)] px-5 py-2.5 font-extrabold uppercase text-sm disabled:opacity-40"
          >
            Continuar a autorizar tarjeta →
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm font-semibold text-rose bg-rose-tint rounded-lg px-3 py-2">{error}</p>
      )}

      {mostrarTarjeta && (
        <div className="rounded-xl border-2 border-[var(--rescue-ink)]/10 bg-white p-5">
          <p className="text-sm text-[var(--rescue-ink)]/70 mb-3">
            Escribe los datos de tu tarjeta para autorizar el cobro de {formatMXN(montoCentavos)} cada{" "}
            {frecuenciaDias} días. Nunca guardamos tu número de tarjeta -- lo procesa Mercado Pago directamente.
          </p>
          {enviando ? (
            <p className="text-sm text-[var(--rescue-ink)]/70">Autorizando suscripción…</p>
          ) : (
            <TarjetaBrick
              publicKey={publicKey}
              amount={montoCentavos / 100}
              onToken={onToken}
              onError={(mensaje) => setError(mensaje)}
            />
          )}
          <button
            type="button"
            onClick={() => setMostrarTarjeta(false)}
            className="mt-3 text-xs font-mono font-semibold text-[var(--rescue-ink)]/50"
          >
            ← Cambiar datos
          </button>
        </div>
      )}
    </div>
  );
}
