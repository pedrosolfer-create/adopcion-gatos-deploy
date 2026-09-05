import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hashing de passwords, separado de lib/auth.ts a propósito: este archivo no
 * importa nada de Next.js (auth.ts sí importa "next/headers"), así que
 * scripts standalone como scripts/seed.ts -- que corren fuera de una
 * request de Next -- pueden usarlo sin arrastrar código que solo funciona
 * dentro del servidor de Next.
 */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");
  if (candidate.length !== hashBuffer.length) return false;
  return timingSafeEqual(candidate, hashBuffer);
}
