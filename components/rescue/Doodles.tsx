/** Corazón dibujado a mano (contorno) -- doodle decorativo, no un ícono de
 * librería, a propósito para que combine con el estilo de los flyers de
 * referencia (Benito/Enzo/Kori). */
export function HeartDoodle({
  className = "",
  color = "currentColor",
  strokeWidth = 6,
}: {
  className?: string;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 100 90" className={className} fill="none" aria-hidden="true">
      <path
        d="M50 82C22 62 6 45 6 27 6 12 18 3 32 3c9 0 15 5 18 11 3-6 9-11 18-11 14 0 26 9 26 24 0 18-16 35-44 55Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Huella de gato, rellena -- para el badge "AMOR" y acentos sueltos. */
export function PawDoodle({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
      <ellipse cx="50" cy="68" rx="27" ry="22" />
      <ellipse cx="16" cy="36" rx="13" ry="16" transform="rotate(-24 16 36)" />
      <ellipse cx="41" cy="15" rx="12.5" ry="16" />
      <ellipse cx="69" cy="15" rx="12.5" ry="16" />
      <ellipse cx="94" cy="36" rx="13" ry="16" transform="rotate(24 94 36)" />
    </svg>
  );
}

/** Un par de "chispas" (destellos) -- el acento junto a "¡ADOPTA!" en los
 * flyers de referencia. */
export function SparkleDoodle({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <path d="M10 2 L12 9 L19 11 L12 13 L10 20 L8 13 L1 11 L8 9 Z" fill={color} />
      <path d="M30 20 L31.5 25 L36 26.5 L31.5 28 L30 33 L28.5 28 L24 26.5 L28.5 25 Z" fill={color} />
    </svg>
  );
}

export function WhatsAppGlyph({ className = "", color = "#161412" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill={color} aria-hidden="true">
      <path d="M16.02 3C9.4 3 4 8.36 4 14.94c0 2.35.68 4.53 1.86 6.39L4 29l7.9-1.83a12.9 12.9 0 0 0 4.12.67c6.62 0 12.02-5.36 12.02-11.94C28.04 8.36 22.64 3 16.02 3Zm0 21.7c-1.45 0-2.85-.36-4.08-1.04l-.29-.16-3.55.82.85-3.45-.19-.3a9.63 9.63 0 0 1-1.5-5.13c0-5.35 4.38-9.7 9.76-9.7 5.38 0 9.76 4.35 9.76 9.7 0 5.36-4.38 9.26-9.76 9.26Zm5.34-7.28c-.29-.15-1.74-.85-2.01-.95-.27-.1-.47-.15-.66.15-.2.29-.76.95-.93 1.15-.17.19-.34.22-.63.07-.29-.15-1.24-.45-2.36-1.44-.87-.77-1.46-1.71-1.63-2-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.49.1-.19.05-.36-.02-.51-.07-.15-.66-1.57-.9-2.15-.24-.57-.48-.49-.66-.5h-.56c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.42 0 1.43 1.02 2.81 1.17 3 .15.19 2 3.05 4.86 4.28.68.29 1.21.46 1.62.59.68.22 1.3.19 1.79.11.55-.08 1.74-.71 1.98-1.4.24-.68.24-1.27.17-1.4-.07-.13-.26-.2-.55-.35Z" />
    </svg>
  );
}
