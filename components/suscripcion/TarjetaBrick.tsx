"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => {
      bricks: () => {
        create: (
          type: string,
          containerId: string,
          settings: Record<string, unknown>
        ) => Promise<{ unmount?: () => void }>;
      };
    };
  }
}

const SDK_SRC = "https://sdk.mercadopago.com/js/v2";
const CONTAINER_ID = "mp-card-brick-container";

/**
 * Formulario de tarjeta embebido (Mercado Pago Bricks, "Card Payment
 * Brick") -- el número de tarjeta, fecha y CVV se escriben dentro de este
 * mismo sitio (mismo diseño, sin ventana emergente ni redirección), pero
 * viajan directo del navegador del adoptante a los servidores de Mercado
 * Pago dentro de un iframe que ellos controlan -- este componente y el
 * resto del sitio nunca reciben ni ven el número de tarjeta, solo el
 * "token" seguro que Mercado Pago genera a partir de él.
 *
 * `amount` es el monto del primer cobro -- Mercado Pago lo pide para poder
 * mostrar el desglose en el formulario, aunque aquí siempre se cobra en una
 * sola exhibición (no se ofrecen meses sin intereses para este flujo).
 */
export function TarjetaBrick({
  publicKey,
  amount,
  onToken,
  onError,
}: {
  publicKey: string;
  amount: number;
  onToken: (token: string) => void;
  onError: (mensaje: string) => void;
}) {
  const controllerRef = useRef<{ unmount?: () => void } | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function cargarSDK(): Promise<void> {
      if (window.MercadoPago) return;
      await new Promise<void>((resolve, reject) => {
        const existente = document.querySelector(`script[src="${SDK_SRC}"]`);
        if (existente) {
          existente.addEventListener("load", () => resolve());
          existente.addEventListener("error", () => reject(new Error("No se pudo cargar el SDK de Mercado Pago")));
          return;
        }
        const script = document.createElement("script");
        script.src = SDK_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar el SDK de Mercado Pago"));
        document.head.appendChild(script);
      });
    }

    async function init() {
      try {
        await cargarSDK();
        if (cancelado || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey);
        const bricksBuilder = mp.bricks();
        const controller = await bricksBuilder.create("cardPayment", CONTAINER_ID, {
          initialization: { amount },
          customization: {
            visual: { style: { theme: "bootstrap" } },
            paymentMethods: { minInstallments: 1, maxInstallments: 1 },
          },
          callbacks: {
            onReady: () => setCargando(false),
            onSubmit: (formData: { token?: string }) => {
              return new Promise<void>((resolve, reject) => {
                if (!formData.token) {
                  onError("No se pudo generar el token de la tarjeta -- revisa los datos e intenta de nuevo.");
                  reject();
                  return;
                }
                onToken(formData.token);
                resolve();
              });
            },
            onError: (error: unknown) => {
              console.error("MP_BRICK_ERROR", error);
              onError("Hubo un problema leyendo los datos de la tarjeta -- verifica el número, fecha y CVV.");
            },
          },
        });
        controllerRef.current = controller;
      } catch (err) {
        console.error("MP_BRICK_INIT_FAILED", err);
        if (!cancelado) onError("No se pudo cargar el formulario de tarjeta de Mercado Pago. Intenta recargar la página.");
      }
    }

    init();
    return () => {
      cancelado = true;
      controllerRef.current?.unmount?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, amount]);

  return (
    <div>
      {cargando && <p className="text-sm text-[var(--rescue-ink)]/60 mb-2">Cargando formulario seguro de tarjeta…</p>}
      <div id={CONTAINER_ID} />
    </div>
  );
}
