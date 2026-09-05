"use client";

import Script from "next/script";

/**
 * Píxeles de Meta (Facebook/Instagram) y TikTok.
 *
 * Esto es lo que de verdad conecta "gente que ve contenido de gatos en
 * Instagram/TikTok" con la campaña de adopción -- no hay forma de buscar o
 * leer lo que alguien busca dentro de esas apps (es privado y no expuesto
 * por ninguna API), pero SÍ se puede dejar que el propio algoritmo de Meta/
 * TikTok encuentre a esas personas: ellos ya saben quién sigue cuentas de
 * mascotas, interactúa con marcas de alimento para gatos, veterinarias, etc.
 * El píxel le da a ese algoritmo la señal de "esta persona sí llenó el
 * formulario de adopción", para que optimice el anuncio hacia gente parecida
 * (audiencias similares / lookalike) en vez de mostrarlo al azar.
 *
 * No hace nada hasta que se configuren los IDs reales -- ver .env.example.
 * Sin esas variables, este componente no inyecta ningún script.
 */
export function AdPixels() {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  return (
    <>
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
      {tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=i+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
              ttq.load('${tiktokPixelId}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}
    </>
  );
}

/** Dispara el evento de conversión (lead) en ambos píxeles -- llamar solo
 * después de que el formulario de /adopta se envió con éxito. */
export function trackAdoptionLead() {
  if (typeof window === "undefined") return;
  // @ts-expect-error -- fbq se define en tiempo de ejecución por el script de Meta
  if (window.fbq) window.fbq("track", "Lead");
  // @ts-expect-error -- ttq se define en tiempo de ejecución por el script de TikTok
  if (window.ttq) window.ttq.track("SubmitForm");
}
