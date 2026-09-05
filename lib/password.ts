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

/**
 * Requisitos de fortaleza para passwords nuevas (ej. al registrar un
 * refugio). No se aplica a passwords ya existentes -- verifyPasswordHash
 * sigue validando cualquier password ya guardada sin importar si cumple
 * estas reglas, para no dejar fuera a cuentas creadas antes de que
 * existieran estos requisitos.
 */
export const PASSWORD_REQUIREMENTS = [
  "8 caracteres como mínimo",
  "1 letra minúscula",
  "1 letra mayúscula",
  "1 número",
  "1 carácter especial",
  "Sin espacios",
] as const;

export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (/\s/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9\s]/.test(password)) return false;
  return true;
}
