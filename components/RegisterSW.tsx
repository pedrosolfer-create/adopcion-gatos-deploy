"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker (public/sw.js) en cuanto la página carga.
 * Sin esto, el navegador nunca sabe que existe -- es lo que junto con el
 * manifest hace que el sistema sea instalable como PWA.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("No se pudo registrar el service worker:", err);
    });
  }, []);

  return null;
}
