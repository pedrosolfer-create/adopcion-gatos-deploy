import { timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Autenticación simple por password para dos roles:
 *
 * - "equipo": una sola password compartida (variable de entorno
 *   EQUIPO_PASSWORD) para el equipo central que ve TODOS los refugios.
 *   Es intencionalmente simple (no hay cuentas individuales) porque hoy es
 *   un solo equipo -- si más adelante se necesitan cuentas por persona,
 *   este archivo es el único que hay que reescribir.
 * - "refugio": cada refugio tiene su propio usuario+password (guardado en
 *   la tabla Refugio, con el password hasheado -- nunca en texto plano).
 *
 * La sesión se guarda en una cookie httpOnly firmada con HMAC (no es un JWT
 * de librería, pero el mecanismo es el mismo: nadie puede fabricar ni
 * alterar una sesión sin conocer SESSION_SECRET).
 */

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-inseguro-cambia-esto-en-produccion";
const COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.warn(
    "[auth] SESSION_SECRET no está definida -- usando un secreto de desarrollo inseguro. " +
      "Define SESSION_SECRET en producción o cualquiera puede fabricar sesiones."
  );
}

export { hashPassword, verifyPasswordHash } from "./password";

// ---------- sesión firmada ----------

export type SessionPayload = { role: "equipo" } | { role: "refugio"; refugioId: string };

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
}

function encodeSession(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;
  // comparación en tiempo constante para evitar timing attacks sobre la firma
  const expected = sign(json);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function verifyEquipoPassword(password: string): boolean {
  const expected = process.env.EQUIPO_PASSWORD;
  if (!expected) {
    console.warn("[auth] EQUIPO_PASSWORD no está definida -- el login del equipo va a rechazar todo.");
    return false;
  }
  // longitud puede filtrar info por timing, pero para un password compartido
  // de uso interno el riesgo es bajo; se prioriza simplicidad aquí.
  if (password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}
