import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getGatoById, getRefugioById } from "@/lib/db";
import { CONTACTO_WHATSAPP } from "@/lib/contacto";

export const dynamic = "force-dynamic";

/**
 * Generador automático de flyer/póster por gato -- el "diseño automático"
 * que pidió el usuario a partir de las 3 fotos + los datos que el refugio
 * llena en /refugio (edad, checklist de salud, personalidad, frases).
 *
 * Cómo funciona: `ImageResponse` (next/og, basado en Satori + Resvg) arma
 * un PNG a partir de JSX+CSS en el momento de la petición -- no hace falta
 * ninguna librería de imágenes/canvas adicional ni infraestructura nueva,
 * ya viene incluido en Next.js y corre bien en el plan gratis de Render.
 * Satori solo soporta un subconjunto de CSS (sobre todo flexbox, sin
 * clip-path ni CSS grid) -- por eso el listón zigzag de globals.css
 * (.rescue-ribbon) no se reutiliza aquí, se usa una insignia con esquinas
 * redondeadas en su lugar, misma paleta de colores.
 *
 * Los colores están copiados literales de app/globals.css (.rescue-theme)
 * porque Satori no puede leer var(--rescue-*) de una hoja de estilos
 * externa -- si esos tokens cambian ahí, hay que actualizarlos aquí también.
 */

const INK = "#161412";
const ACCENT = "#f5b301";
const ACCENT_DEEP = "#c88f00";
const PAPER = "#fbf4e6";
const PAPER_ALT = "#f4ead2";

const WIDTH = 1080;
const HEIGHT = 1350;

type FontSet = {
  baloo800: ArrayBuffer;
  baloo700: ArrayBuffer;
  caveat700: ArrayBuffer;
  libre700: ArrayBuffer;
  libre800: ArrayBuffer;
};

let fontsCache: FontSet | null = null;

/** Las fuentes no dependen de la petición -- se leen una sola vez por
 * proceso y se cachean en memoria del módulo (mismo patrón que sugiere la
 * documentación de next/og para fuentes locales). Se leen directo de los
 * paquetes @fontsource ya instalados (mismas fuentes de marca que el resto
 * del sitio) en formato .woff -- next/og soporta ttf/otf/woff, NO woff2. */
async function cargarFuentes(): Promise<FontSet> {
  if (fontsCache) return fontsCache;
  const fontsDir = (pkg: string) => join(process.cwd(), "node_modules", "@fontsource", pkg, "files");
  const toArrayBuffer = (buf: Buffer): ArrayBuffer =>
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

  const [baloo800, baloo700, caveat700, libre700, libre800] = await Promise.all([
    readFile(join(fontsDir("baloo-2"), "baloo-2-latin-800-normal.woff")),
    readFile(join(fontsDir("baloo-2"), "baloo-2-latin-700-normal.woff")),
    readFile(join(fontsDir("caveat"), "caveat-latin-700-normal.woff")),
    readFile(join(fontsDir("libre-franklin"), "libre-franklin-latin-700-normal.woff")),
    readFile(join(fontsDir("libre-franklin"), "libre-franklin-latin-800-normal.woff")),
  ]);

  fontsCache = {
    baloo800: toArrayBuffer(baloo800),
    baloo700: toArrayBuffer(baloo700),
    caveat700: toArrayBuffer(caveat700),
    libre700: toArrayBuffer(libre700),
    libre800: toArrayBuffer(libre800),
  };
  return fontsCache;
}

function Badge({ children, tone = "dashed" }: { children: React.ReactNode; tone?: "dashed" | "accent" | "ink" }) {
  const style =
    tone === "accent"
      ? { backgroundColor: ACCENT, color: INK, border: "none" }
      : tone === "ink"
        ? { backgroundColor: INK, color: "#fff", border: "none" }
        : { backgroundColor: "transparent", color: INK, border: `3px dashed ${ACCENT}` };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "10px 22px",
        fontFamily: "Baloo2",
        fontWeight: 800,
        fontSize: 26,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function edadTexto(edadMeses: number | null, edadAprox: string | null): string | null {
  if (edadMeses !== null && edadMeses !== undefined) {
    if (edadMeses < 12) return `${edadMeses} ${edadMeses === 1 ? "mes" : "meses"} de edad`;
    const anios = Math.floor(edadMeses / 12);
    const resto = edadMeses % 12;
    const partes = [`${anios} ${anios === 1 ? "año" : "años"}`];
    if (resto > 0) partes.push(`${resto} ${resto === 1 ? "mes" : "meses"}`);
    return partes.join(" ") + " de edad";
  }
  return edadAprox || null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const gato = await getGatoById(id);
  if (!gato) {
    return new Response("Gato no encontrado", { status: 404 });
  }

  const refugio = await getRefugioById(gato.refugioId);
  const telefono = refugio?.responsableTelefono || CONTACTO_WHATSAPP;
  const fonts = await cargarFuentes();

  const fotosSecundarias = [gato.fotoUrl2, gato.fotoUrl3].filter((u): u is string => Boolean(u));
  const edad = edadTexto(gato.edadMeses, gato.edadAprox);
  const saludBadges = [
    gato.esterilizado && "Esterilizado",
    gato.desparasitado && "Desparasitado",
    gato.vacunado && "Vacunado",
    gato.sanoListo && "Sano y listo",
  ].filter((v): v is string => Boolean(v));
  const frase = gato.frases[0] || null;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          fontFamily: "LibreFranklin",
        }}
      >
        {/* ---------- Header ---------- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "36px 48px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 999,
              backgroundColor: INK,
              color: "#fff",
              padding: "14px 32px",
              fontFamily: "Baloo2",
              fontWeight: 800,
              fontSize: 32,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            ¡Adopta!
          </div>
          <div style={{ display: "flex", fontSize: 22, color: INK, opacity: 0.5, fontFamily: "LibreFranklin" }}>
            Sistema de adopción de gatos
          </div>
        </div>

        {/* ---------- Fotos ---------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 48px", flex: 1, minHeight: 0 }}>
          <div
            style={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              borderRadius: 28,
              overflow: "hidden",
              border: `6px solid ${INK}`,
              backgroundColor: PAPER_ALT,
            }}
          >
            {gato.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={gato.fotoUrl} alt="" width={WIDTH - 96 - 12} height={9999} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 40, color: INK, opacity: 0.4 }}>
                Sin foto
              </div>
            )}
          </div>
          {fotosSecundarias.length > 0 && (
            <div style={{ display: "flex", gap: 12, height: 240 }}>
              {fotosSecundarias.map((url, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flex: 1,
                    borderRadius: 20,
                    overflow: "hidden",
                    border: `5px solid ${INK}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" width={999} height={240} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Info del gato ---------- */}
        <div style={{ display: "flex", flexDirection: "column", padding: "28px 48px 0", gap: 12 }}>
          <div style={{ display: "flex", fontFamily: "Caveat", fontSize: 104, lineHeight: 0.9, color: INK }}>
            {gato.nombre}
          </div>

          {(edad || gato.sexo) && (
            <div style={{ display: "flex", gap: 12 }}>
              {edad && <Badge>{edad}</Badge>}
              {gato.sexo && <Badge>{gato.sexo}</Badge>}
            </div>
          )}

          {gato.personalidad.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {gato.personalidad.map((p) => (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    backgroundColor: PAPER_ALT,
                    borderRadius: 999,
                    padding: "8px 18px",
                    fontFamily: "LibreFranklinBold",
                    fontWeight: 700,
                    fontSize: 22,
                    color: INK,
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          )}

          {saludBadges.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {saludBadges.map((s) => (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: ACCENT,
                    borderRadius: 999,
                    padding: "8px 18px",
                    fontFamily: "LibreFranklinBold",
                    fontWeight: 700,
                    fontSize: 22,
                    color: INK,
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}

          {frase && (
            <div style={{ display: "flex", fontFamily: "Caveat", fontSize: 46, color: ACCENT_DEEP, marginTop: 2 }}>
              {frase}
            </div>
          )}
        </div>

        {/* ---------- Barra de contacto ---------- */}
        {/* Nota: a propósito sin ícono/emoji -- next/og (Satori) resuelve
         * emojis pidiéndolos a un CDN externo (twemoji) en cada render, lo
         * que suma una llamada de red y un punto de falla más por cada
         * flyer generado. Con solo texto queda igual de claro y no
         * depende de que ese CDN responda. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: INK,
            padding: "30px 48px",
            marginTop: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Baloo2",
              fontWeight: 800,
              fontSize: 30,
              color: ACCENT,
              textTransform: "uppercase",
            }}
          >
            Informes · WhatsApp
          </div>
          <div style={{ display: "flex", marginLeft: "auto", fontFamily: "LibreFranklinExtraBold", fontWeight: 800, fontSize: 40, color: "#fff" }}>
            {telefono}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Baloo2", data: fonts.baloo800, weight: 800, style: "normal" },
        { name: "Baloo2", data: fonts.baloo700, weight: 700, style: "normal" },
        { name: "Caveat", data: fonts.caveat700, weight: 700, style: "normal" },
        { name: "LibreFranklin", data: fonts.libre700, weight: 700, style: "normal" },
        { name: "LibreFranklinBold", data: fonts.libre700, weight: 700, style: "normal" },
        { name: "LibreFranklinExtraBold", data: fonts.libre800, weight: 800, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Disposition": `inline; filename="${gato.nombre.replace(/[^a-z0-9]+/gi, "-")}-flyer.png"`,
      },
    }
  );

  return image;
}
