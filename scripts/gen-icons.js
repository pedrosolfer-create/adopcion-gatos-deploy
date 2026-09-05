/**
 * gen-icons.js
 *
 * Genera los iconos de la PWA (manifest + apple-touch-icon) a partir de un
 * mismo diseño HTML/SVG -- una huella de gato en tinta sobre el dorado de
 * marca ("estilo rescate"), coherente con el resto del sistema. No son
 * archivos subidos a mano: se renderizan con Playwright, igual que los
 * flyers y el anuncio de Instagram, para que sea reproducible.
 *
 * Uso: node scripts/gen-icons.js
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const INK = "#161412";
const GOLD = "#f5b301";

// Huella de gato simplificada: una almohadilla + 4 dedos, centrada en un
// viewBox de 100x100 para que escale limpio a cualquier tamaño de icono.
const PAW_PATH = `
  <g fill="${INK}">
    <ellipse cx="50" cy="66" rx="24" ry="20"/>
    <ellipse cx="26" cy="34" rx="10" ry="13" transform="rotate(-18 26 34)"/>
    <ellipse cx="46" cy="22" rx="10.5" ry="14"/>
    <ellipse cx="66" cy="22" rx="10.5" ry="14"/>
    <ellipse cx="86" cy="36" rx="10" ry="13" transform="rotate(20 86 36)"/>
  </g>
`;

function iconHTML({ size, padding, rounded, bg }) {
  const inner = size - padding * 2;
  return `<!doctype html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:${size}px;height:${size}px;background:transparent;}
    .tile{
      width:${size}px;height:${size}px;
      background:${bg};
      display:flex;align-items:center;justify-content:center;
      border-radius:${rounded ? size * 0.22 : 0}px;
    }
    svg{width:${inner}px;height:${inner}px;}
  </style></head><body>
    <div class="tile">
      <svg viewBox="0 0 100 100">${PAW_PATH}</svg>
    </div>
  </body></html>`;
}

async function renderIcon(browser, opts, outPath) {
  const page = await browser.newPage({
    viewport: { width: opts.size, height: opts.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(iconHTML(opts), { waitUntil: "load" });
  await page.screenshot({ path: outPath, omitBackground: opts.transparent === true });
  await page.close();
}

(async () => {
  const outDir = path.join(__dirname, "..", "public", "icons");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  try {
    // Iconos "any" para el manifest -- fondo dorado, esquinas redondeadas
    // sutiles (el propio Android/iOS le aplica su máscara encima).
    await renderIcon(
      browser,
      { size: 192, padding: 28, rounded: true, bg: GOLD },
      path.join(outDir, "icon-192.png")
    );
    await renderIcon(
      browser,
      { size: 512, padding: 74, rounded: true, bg: GOLD },
      path.join(outDir, "icon-512.png")
    );
    // Maskable: el sistema operativo recorta un círculo/redondeado sobre
    // esto, así que el contenido debe caber en la "zona segura" central
    // (~80% del tamaño) sin fondo transparente.
    await renderIcon(
      browser,
      { size: 512, padding: 96, rounded: false, bg: GOLD },
      path.join(outDir, "icon-maskable-512.png")
    );
    // Apple touch icon: iOS no soporta transparencia ni le aplica máscara,
    // así que se manda ya con esquinas cuadradas (iOS las redondea solo).
    await renderIcon(
      browser,
      { size: 180, padding: 24, rounded: false, bg: GOLD },
      path.join(outDir, "apple-touch-icon.png")
    );
    // Favicon simple en el mismo estilo.
    await renderIcon(
      browser,
      { size: 32, padding: 3, rounded: false, bg: GOLD },
      path.join(outDir, "favicon-32.png")
    );
  } finally {
    await browser.close();
  }
  console.log("Listo: public/icons/*.png");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
