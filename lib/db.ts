import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPasswordHash } from "./password";

/**
 * Capa de datos del sistema de adopción de gatos.
 *
 * MIGRADO de `node:sqlite` a PostgreSQL (pensado para un plan gratuito como
 * Neon o Supabase) porque el servidor donde corre la app en producción
 * (Render, plan gratis) no ofrece disco persistente -- un archivo SQLite se
 * perdería en cada reinicio/deploy. Requiere la variable de entorno
 * DATABASE_URL con el connection string de Postgres.
 *
 * El resto de la aplicación (páginas, acciones) solo llama a las funciones
 * de este archivo, nunca SQL directo. La diferencia visible para quien
 * llama estas funciones es que TODAS ahora son `async` y hay que hacerles
 * `await` -- Postgres se habla siempre de forma asíncrona (a diferencia de
 * `node:sqlite`, que era síncrono). Los nombres de columnas se mantienen en
 * camelCase exactamente como en la versión SQLite (van entre comillas
 * dobles en el SQL para que Postgres no las convierta a minúsculas), así
 * que las formas que arma cada función siguen siendo iguales.
 */

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL no está definida -- las conexiones a Postgres van a fallar. " +
      "Define DATABASE_URL con el connection string de tu base (Neon, Supabase, etc.)."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon, Supabase y la mayoría de los Postgres gratuitos en la nube piden
  // TLS. Si el connection string ya trae `sslmode=require` esto es
  // redundante pero inofensivo; si alguien corre un Postgres local sin TLS
  // (connection string sin sslmode=require), no se fuerza SSL.
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT PRIMARY KEY,
  "refugioId" TEXT,
  "createdAt" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NUEVO',
  "nombre" TEXT NOT NULL,
  "telefono" TEXT,
  "email" TEXT,
  "ciudad" TEXT,
  "tipoVivienda" TEXT,
  "viviendaEnRenta" INTEGER,
  "permiteMascotasRenta" INTEGER,
  "tieneOtrasMascotas" INTEGER,
  "otrasMascotasDetalle" TEXT,
  "experienciaPrevia" INTEGER,
  "todaLaFamiliaDeAcuerdo" INTEGER,
  "gatoDeInteresId" TEXT,
  "comentario" TEXT,
  "notas" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmContent" TEXT
);

CREATE TABLE IF NOT EXISTS "DailyReport" (
  "id" TEXT PRIMARY KEY,
  "refugioId" TEXT,
  "date" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "candidatesFormulario" INTEGER NOT NULL DEFAULT 0,
  "candidatesX" INTEGER NOT NULL DEFAULT 0,
  "candidatesReddit" INTEGER NOT NULL DEFAULT 0,
  "candidatesWeb" INTEGER NOT NULL DEFAULT 0,
  "candidatesInstagram" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT NOT NULL,
  "nextSteps" TEXT
);

CREATE TABLE IF NOT EXISTS "Strategy" (
  "id" TEXT PRIMARY KEY,
  "refugioId" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IDEA',
  "channel" TEXT,
  "result" TEXT
);

CREATE TABLE IF NOT EXISTS "Improvement" (
  "id" TEXT PRIMARY KEY,
  "refugioId" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROPUESTA',
  "impact" TEXT
);

CREATE TABLE IF NOT EXISTS "Refugio" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "usuario" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "responsableNombre" TEXT NOT NULL,
  "responsableTelefono" TEXT,
  "responsableEmail" TEXT,
  "direccion" TEXT,
  "ciudad" TEXT,
  "notas" TEXT
);

CREATE TABLE IF NOT EXISTS "Gato" (
  "id" TEXT PRIMARY KEY,
  "refugioId" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "sexo" TEXT,
  "edadAprox" TEXT,
  "descripcion" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
  "fotoUrl" TEXT
);

CREATE TABLE IF NOT EXISTS "Producto" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "precioNormalCentavos" INTEGER NOT NULL,
  "precioAdoptanteCentavos" INTEGER NOT NULL,
  "fotoUrl" TEXT,
  "stock" INTEGER,
  "activo" INTEGER NOT NULL DEFAULT 1
);

-- Columnas UTM agregadas después del primer despliegue -- "ADD COLUMN IF NOT
-- EXISTS" hace que esto sea seguro de correr también contra una base que ya
-- existía sin ellas (no solo contra una base nueva, que ya las trae en el
-- CREATE TABLE de arriba).
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmContent" TEXT;

CREATE TABLE IF NOT EXISTS "Pedido" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TEXT NOT NULL,
  "compradorNombre" TEXT NOT NULL,
  "compradorTelefono" TEXT,
  "compradorEmail" TEXT,
  "esAdoptante" INTEGER NOT NULL DEFAULT 0,
  "itemsJson" TEXT NOT NULL,
  "totalCentavos" INTEGER NOT NULL,
  "montoRefugiosCentavos" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDIENTE_PAGO',
  "notas" TEXT,
  "mpPreferenceId" TEXT,
  "mpPaymentId" TEXT
);

-- Columnas agregadas después del primer despliegue de la tienda (pago real
-- con Mercado Pago + rastreo del 10% para refugios) -- "ADD COLUMN IF NOT
-- EXISTS" para que sea seguro correr esto también contra una base que ya
-- tenía la tabla "Pedido" sin estas columnas.
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "montoRefugiosCentavos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "mpPreferenceId" TEXT;
ALTER TABLE "Pedido" ADD COLUMN IF NOT EXISTS "mpPaymentId" TEXT;

CREATE TABLE IF NOT EXISTS "Donativo" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TEXT NOT NULL,
  "concepto" TEXT NOT NULL,
  "montoCentavos" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "mpPreferenceId" TEXT,
  "mpPaymentId" TEXT
);
`;

let schemaReady: Promise<void> | null = null;

/** Se asegura de que las tablas existan antes de cualquier consulta. Se
 * ejecuta una sola vez por proceso (la promesa se cachea) -- las llamadas
 * concurrentes esperan la misma promesa en vez de disparar el CREATE TABLE
 * varias veces en paralelo. */
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA_SQL).then(() => undefined);
  }
  return schemaReady;
}

// ---------- tipos ----------

export type LeadSource =
  | "FORMULARIO_SITIO"
  | "MONITOR_X"
  | "MONITOR_REDDIT"
  | "MONITOR_BUSQUEDA_WEB"
  | "ANUNCIO_INSTAGRAM"
  | "OTRO";

export type LeadStatus =
  | "NUEVO"
  | "EN_REVISION"
  | "CONTACTADO"
  | "EN_PROCESO"
  | "ADOPCION_COMPLETADA"
  | "DESCARTADO";

export interface Lead {
  id: string;
  refugioId: string | null;
  createdAt: string;
  source: LeadSource;
  status: LeadStatus;
  nombre: string;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  tipoVivienda: string | null;
  viviendaEnRenta: boolean | null;
  permiteMascotasRenta: boolean | null;
  tieneOtrasMascotas: boolean | null;
  otrasMascotasDetalle: string | null;
  experienciaPrevia: boolean | null;
  todaLaFamiliaDeAcuerdo: boolean | null;
  gatoDeInteresId: string | null;
  comentario: string | null;
  notas: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
}

export interface DailyReport {
  id: string;
  refugioId: string | null;
  date: string;
  createdAt: string;
  candidatesFormulario: number;
  candidatesX: number;
  candidatesReddit: number;
  candidatesWeb: number;
  candidatesInstagram: number;
  summary: string;
  nextSteps: string | null;
}

export type StrategyStatus = "IDEA" | "EN_PRUEBA" | "ACTIVA" | "PAUSADA" | "DESCARTADA";

export interface Strategy {
  id: string;
  refugioId: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  status: StrategyStatus;
  channel: string | null;
  result: string | null;
}

export type ImprovementStatus = "PROPUESTA" | "EN_PROGRESO" | "IMPLEMENTADA" | "DESCARTADA";

export interface Improvement {
  id: string;
  refugioId: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  area: string;
  status: ImprovementStatus;
  impact: string | null;
}

export interface Refugio {
  id: string;
  createdAt: string;
  nombre: string;
  usuario: string;
  passwordHash: string;
  responsableNombre: string;
  responsableTelefono: string | null;
  responsableEmail: string | null;
  direccion: string | null;
  ciudad: string | null;
  notas: string | null;
}

export type GatoEstado = "DISPONIBLE" | "EN_PROCESO" | "ADOPTADO" | "NO_DISPONIBLE";

export interface Gato {
  id: string;
  refugioId: string;
  createdAt: string;
  nombre: string;
  sexo: string | null;
  edadAprox: string | null;
  descripcion: string | null;
  estado: GatoEstado;
  fotoUrl: string | null;
}

export interface Producto {
  id: string;
  createdAt: string;
  nombre: string;
  descripcion: string | null;
  precioNormalCentavos: number;
  precioAdoptanteCentavos: number;
  fotoUrl: string | null;
  stock: number | null;
  activo: boolean;
}

export interface PedidoItem {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}

export type PedidoStatus = "PENDIENTE_PAGO" | "PAGADO" | "CANCELADO";

export type DonativoStatus = "PENDIENTE" | "PAGADO" | "CANCELADO";

export interface Donativo {
  id: string;
  createdAt: string;
  concepto: string;
  montoCentavos: number;
  status: DonativoStatus;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
}

export interface Pedido {
  id: string;
  createdAt: string;
  compradorNombre: string;
  compradorTelefono: string | null;
  compradorEmail: string | null;
  esAdoptante: boolean;
  items: PedidoItem[];
  totalCentavos: number;
  /** 10% del total (PORCENTAJE_REFUGIOS), calculado al crear el pedido --
   * es un monto de referencia para que el equipo sepa cuánto transferir a
   * refugios en /reportes, NO un reparto automático de pago real (ver
   * lib/mercadopago.ts -- el comprador paga el total completo a la cuenta
   * de Mercado Pago del sitio, como con los donativos). */
  montoRefugiosCentavos: number;
  status: PedidoStatus;
  notas: string | null;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
}

// ---------- helpers ----------

function toBool(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  return Boolean(v);
}

function boolToInt(v: boolean | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return v ? 1 : 0;
}

// El spread de abajo necesita `any`: con Record<string, unknown> el objeto resultante
// ya no es asignable a Lead sin repetir cada campo a mano.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLead(row: any): Lead {
  return {
    ...row,
    viviendaEnRenta: toBool(row.viviendaEnRenta),
    permiteMascotasRenta: toBool(row.permiteMascotasRenta),
    tieneOtrasMascotas: toBool(row.tieneOtrasMascotas),
    experienciaPrevia: toBool(row.experienciaPrevia),
    todaLaFamiliaDeAcuerdo: toBool(row.todaLaFamiliaDeAcuerdo),
  };
}

// ---------- Leads ----------

export async function createLead(input: {
  source: LeadSource;
  nombre: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  tipoVivienda?: string;
  viviendaEnRenta?: boolean;
  permiteMascotasRenta?: boolean;
  tieneOtrasMascotas?: boolean;
  otrasMascotasDetalle?: string;
  experienciaPrevia?: boolean;
  todaLaFamiliaDeAcuerdo?: boolean;
  gatoDeInteresId?: string;
  comentario?: string;
  refugioId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}): Promise<Lead> {
  await ensureSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Lead" ("id", "refugioId", "createdAt", "source", "status", "nombre", "telefono", "email", "ciudad",
      "tipoVivienda", "viviendaEnRenta", "permiteMascotasRenta", "tieneOtrasMascotas",
      "otrasMascotasDetalle", "experienciaPrevia", "todaLaFamiliaDeAcuerdo", "gatoDeInteresId", "comentario",
      "utmSource", "utmMedium", "utmCampaign", "utmContent")
     VALUES ($1, $2, $3, $4, 'NUEVO', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [
      id,
      input.refugioId ?? null,
      createdAt,
      input.source,
      input.nombre,
      input.telefono ?? null,
      input.email ?? null,
      input.ciudad ?? null,
      input.tipoVivienda ?? null,
      boolToInt(input.viviendaEnRenta),
      boolToInt(input.permiteMascotasRenta),
      boolToInt(input.tieneOtrasMascotas),
      input.otrasMascotasDetalle ?? null,
      boolToInt(input.experienciaPrevia),
      boolToInt(input.todaLaFamiliaDeAcuerdo),
      input.gatoDeInteresId ?? null,
      input.comentario ?? null,
      input.utmSource ?? null,
      input.utmMedium ?? null,
      input.utmCampaign ?? null,
      input.utmContent ?? null,
    ]
  );
  return (await getLeadById(id))!;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Lead" WHERE "id" = $1`, [id]);
  return rows[0] ? rowToLead(rows[0]) : null;
}

export async function listLeads(limit = 100, refugioId?: string): Promise<Lead[]> {
  await ensureSchema();
  const { rows } = refugioId
    ? await pool.query(
        `SELECT * FROM "Lead" WHERE "refugioId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
        [refugioId, limit]
      )
    : await pool.query(`SELECT * FROM "Lead" ORDER BY "createdAt" DESC LIMIT $1`, [limit]);
  return rows.map(rowToLead);
}

export async function countLeadsSince(sinceISO: string, refugioId?: string): Promise<number> {
  await ensureSchema();
  const { rows } = refugioId
    ? await pool.query(
        `SELECT COUNT(*) as c FROM "Lead" WHERE "createdAt" >= $1 AND "refugioId" = $2`,
        [sinceISO, refugioId]
      )
    : await pool.query(`SELECT COUNT(*) as c FROM "Lead" WHERE "createdAt" >= $1`, [sinceISO]);
  return Number(rows[0].c);
}

// ---------- Reportes diarios ----------

export async function upsertDailyReport(input: {
  date: string; // YYYY-MM-DD
  candidatesFormulario?: number;
  candidatesX?: number;
  candidatesReddit?: number;
  candidatesWeb?: number;
  candidatesInstagram?: number;
  summary: string;
  nextSteps?: string;
  refugioId?: string;
}): Promise<DailyReport> {
  await ensureSchema();
  // OJO: la columna `date` no tiene un UNIQUE global -- eso significa que el
  // equipo (refugioId=null) y un refugio específico pueden cada quien tener
  // su propio reporte con la misma fecha sin pisarse; esta función busca el
  // existente por (date, refugioId) antes de decidir si actualiza o inserta.
  const existing = input.refugioId
    ? (await pool.query(`SELECT "id" FROM "DailyReport" WHERE "date" = $1 AND "refugioId" = $2`, [
        input.date,
        input.refugioId,
      ])).rows[0]
    : (await pool.query(`SELECT "id" FROM "DailyReport" WHERE "date" = $1 AND "refugioId" IS NULL`, [
        input.date,
      ])).rows[0];

  if (existing) {
    await pool.query(
      `UPDATE "DailyReport" SET "candidatesFormulario"=$1, "candidatesX"=$2, "candidatesReddit"=$3,
       "candidatesWeb"=$4, "candidatesInstagram"=$5, "summary"=$6, "nextSteps"=$7 WHERE "id"=$8`,
      [
        input.candidatesFormulario ?? 0,
        input.candidatesX ?? 0,
        input.candidatesReddit ?? 0,
        input.candidatesWeb ?? 0,
        input.candidatesInstagram ?? 0,
        input.summary,
        input.nextSteps ?? null,
        existing.id,
      ]
    );
    return (await getDailyReport(existing.id))!;
  }

  const id = randomUUID();
  await pool.query(
    `INSERT INTO "DailyReport" ("id", "refugioId", "date", "createdAt", "candidatesFormulario", "candidatesX",
      "candidatesReddit", "candidatesWeb", "candidatesInstagram", "summary", "nextSteps")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      input.refugioId ?? null,
      input.date,
      new Date().toISOString(),
      input.candidatesFormulario ?? 0,
      input.candidatesX ?? 0,
      input.candidatesReddit ?? 0,
      input.candidatesWeb ?? 0,
      input.candidatesInstagram ?? 0,
      input.summary,
      input.nextSteps ?? null,
    ]
  );
  return (await getDailyReport(id))!;
}

export async function getDailyReport(id: string): Promise<DailyReport | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "DailyReport" WHERE "id" = $1`, [id]);
  return (rows[0] as DailyReport) ?? null;
}

export async function listDailyReports(limit = 30, refugioId?: string): Promise<DailyReport[]> {
  await ensureSchema();
  if (refugioId) {
    const { rows } = await pool.query(
      `SELECT * FROM "DailyReport" WHERE "refugioId" = $1 ORDER BY "date" DESC LIMIT $2`,
      [refugioId, limit]
    );
    return rows as DailyReport[];
  }
  const { rows } = await pool.query(`SELECT * FROM "DailyReport" ORDER BY "date" DESC LIMIT $1`, [limit]);
  return rows as DailyReport[];
}

// ---------- Estrategias ----------

export async function createStrategy(input: {
  title: string;
  description: string;
  channel?: string;
  status?: StrategyStatus;
  refugioId?: string;
}): Promise<Strategy> {
  await ensureSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Strategy" ("id", "refugioId", "createdAt", "updatedAt", "title", "description", "status", "channel")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      input.refugioId ?? null,
      now,
      now,
      input.title,
      input.description,
      input.status ?? "IDEA",
      input.channel ?? null,
    ]
  );
  return (await getStrategy(id))!;
}

export async function getStrategy(id: string): Promise<Strategy | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Strategy" WHERE "id" = $1`, [id]);
  return (rows[0] as Strategy) ?? null;
}

export async function listStrategies(refugioId?: string): Promise<Strategy[]> {
  await ensureSchema();
  if (refugioId) {
    const { rows } = await pool.query(
      `SELECT * FROM "Strategy" WHERE "refugioId" = $1 ORDER BY "updatedAt" DESC`,
      [refugioId]
    );
    return rows as Strategy[];
  }
  const { rows } = await pool.query(`SELECT * FROM "Strategy" ORDER BY "updatedAt" DESC`);
  return rows as Strategy[];
}

export async function updateStrategyStatus(
  id: string,
  status: StrategyStatus,
  result?: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE "Strategy" SET "status"=$1, "result"=COALESCE($2, "result"), "updatedAt"=$3 WHERE "id"=$4`,
    [status, result ?? null, new Date().toISOString(), id]
  );
}

// ---------- Mejoras continuas ----------

export async function createImprovement(input: {
  title: string;
  description: string;
  area: string;
  status?: ImprovementStatus;
  refugioId?: string;
}): Promise<Improvement> {
  await ensureSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Improvement" ("id", "refugioId", "createdAt", "updatedAt", "title", "description", "area", "status")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, input.refugioId ?? null, now, now, input.title, input.description, input.area, input.status ?? "PROPUESTA"]
  );
  return (await getImprovement(id))!;
}

export async function getImprovement(id: string): Promise<Improvement | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Improvement" WHERE "id" = $1`, [id]);
  return (rows[0] as Improvement) ?? null;
}

export async function listImprovements(refugioId?: string): Promise<Improvement[]> {
  await ensureSchema();
  if (refugioId) {
    const { rows } = await pool.query(
      `SELECT * FROM "Improvement" WHERE "refugioId" = $1 ORDER BY "updatedAt" DESC`,
      [refugioId]
    );
    return rows as Improvement[];
  }
  const { rows } = await pool.query(`SELECT * FROM "Improvement" ORDER BY "updatedAt" DESC`);
  return rows as Improvement[];
}

export async function updateImprovementStatus(
  id: string,
  status: ImprovementStatus,
  impact?: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE "Improvement" SET "status"=$1, "impact"=COALESCE($2, "impact"), "updatedAt"=$3 WHERE "id"=$4`,
    [status, impact ?? null, new Date().toISOString(), id]
  );
}

// ---------- Refugios (multi-tenant) ----------

function rowToRefugio(row: unknown): Refugio {
  return row as Refugio;
}

export async function createRefugio(input: {
  nombre: string;
  usuario: string;
  password: string;
  responsableNombre: string;
  responsableTelefono?: string;
  responsableEmail?: string;
  direccion?: string;
  ciudad?: string;
  notas?: string;
}): Promise<Refugio> {
  await ensureSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Refugio" ("id", "createdAt", "nombre", "usuario", "passwordHash", "responsableNombre",
      "responsableTelefono", "responsableEmail", "direccion", "ciudad", "notas")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      createdAt,
      input.nombre,
      input.usuario,
      hashPassword(input.password),
      input.responsableNombre,
      input.responsableTelefono ?? null,
      input.responsableEmail ?? null,
      input.direccion ?? null,
      input.ciudad ?? null,
      input.notas ?? null,
    ]
  );
  return (await getRefugioById(id))!;
}

export async function getRefugioById(id: string): Promise<Refugio | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Refugio" WHERE "id" = $1`, [id]);
  return rows[0] ? rowToRefugio(rows[0]) : null;
}

export async function getRefugioByUsuario(usuario: string): Promise<Refugio | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Refugio" WHERE "usuario" = $1`, [usuario]);
  return rows[0] ? rowToRefugio(rows[0]) : null;
}

export async function listRefugios(): Promise<Refugio[]> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Refugio" ORDER BY "nombre" ASC`);
  return rows.map(rowToRefugio);
}

/** Verifica usuario+password de un refugio. Devuelve el Refugio si es correcto, null si no. */
export async function verifyRefugioLogin(usuario: string, password: string): Promise<Refugio | null> {
  const refugio = await getRefugioByUsuario(usuario);
  if (!refugio) return null;
  if (!verifyPasswordHash(password, refugio.passwordHash)) return null;
  return refugio;
}

// ---------- Gatos ----------

function rowToGato(row: unknown): Gato {
  return row as Gato;
}

export async function createGato(input: {
  refugioId: string;
  nombre: string;
  sexo?: string;
  edadAprox?: string;
  descripcion?: string;
  estado?: GatoEstado;
  fotoUrl?: string;
}): Promise<Gato> {
  await ensureSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Gato" ("id", "refugioId", "createdAt", "nombre", "sexo", "edadAprox", "descripcion", "estado", "fotoUrl")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.refugioId,
      createdAt,
      input.nombre,
      input.sexo ?? null,
      input.edadAprox ?? null,
      input.descripcion ?? null,
      input.estado ?? "DISPONIBLE",
      input.fotoUrl ?? null,
    ]
  );
  return (await getGatoById(id))!;
}

export async function getGatoById(id: string): Promise<Gato | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Gato" WHERE "id" = $1`, [id]);
  return rows[0] ? rowToGato(rows[0]) : null;
}

export async function listGatosByRefugio(refugioId: string): Promise<Gato[]> {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT * FROM "Gato" WHERE "refugioId" = $1 ORDER BY "createdAt" DESC`,
    [refugioId]
  );
  return rows.map(rowToGato);
}

/** Catálogo público: todos los gatos disponibles, de cualquier refugio. */
export async function listGatosDisponibles(): Promise<Gato[]> {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT * FROM "Gato" WHERE "estado" = 'DISPONIBLE' ORDER BY "createdAt" DESC`
  );
  return rows.map(rowToGato);
}

export async function updateGatoEstado(id: string, estado: GatoEstado): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE "Gato" SET "estado" = $1 WHERE "id" = $2`, [estado, id]);
}

/** Borra un gato (ej. una alta duplicada por error). No borra nada en
 * Cloudinary -- la foto asociada queda huérfana ahí, pero eso no cuesta
 * nada extra en el plan gratis y no vale la pena la complejidad de
 * limpiarla también. Quien llama (deleteGatoAction) ya verificó que el
 * gato pertenece al refugio de la sesión antes de llegar aquí. */
export async function deleteGato(id: string): Promise<void> {
  await ensureSchema();
  await pool.query(`DELETE FROM "Gato" WHERE "id" = $1`, [id]);
}

// ---------- Donativos ----------
// El monto SÍ puede venir del navegador aquí (a diferencia de Pedido, que
// siempre recalcula contra el catálogo) porque un donativo no tiene un
// "precio correcto" que verificar -- cualquier monto positivo es válido.
// iniciarDonativoAction ya valida que sea un número razonable antes de
// llegar aquí.

function rowToDonativo(row: unknown): Donativo {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    createdAt: r.createdAt as string,
    concepto: r.concepto as string,
    montoCentavos: r.montoCentavos as number,
    status: r.status as DonativoStatus,
    mpPreferenceId: (r.mpPreferenceId as string) ?? null,
    mpPaymentId: (r.mpPaymentId as string) ?? null,
  };
}

export async function createDonativo(input: {
  concepto: string;
  montoCentavos: number;
}): Promise<Donativo> {
  await ensureSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Donativo" ("id", "createdAt", "concepto", "montoCentavos", "status")
     VALUES ($1, $2, $3, $4, 'PENDIENTE')`,
    [id, createdAt, input.concepto, input.montoCentavos]
  );
  return (await getDonativoById(id))!;
}

export async function getDonativoById(id: string): Promise<Donativo | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Donativo" WHERE "id" = $1`, [id]);
  return rows[0] ? rowToDonativo(rows[0]) : null;
}

export async function listDonativos(limit = 50): Promise<Donativo[]> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Donativo" ORDER BY "createdAt" DESC LIMIT $1`, [
    limit,
  ]);
  return rows.map(rowToDonativo);
}

export async function setDonativoPreferenceId(id: string, mpPreferenceId: string): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE "Donativo" SET "mpPreferenceId" = $1 WHERE "id" = $2`, [
    mpPreferenceId,
    id,
  ]);
}

export async function updateDonativoStatus(
  id: string,
  status: DonativoStatus,
  mpPaymentId?: string
): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE "Donativo" SET "status" = $1, "mpPaymentId" = COALESCE($2, "mpPaymentId") WHERE "id" = $3`, [
    status,
    mpPaymentId ?? null,
    id,
  ]);
}

// ---------- Tienda: Productos ----------
// Los precios se guardan en CENTAVOS (enteros) a propósito -- nunca en
// pesos con decimales -- para no arrastrar errores de punto flotante con
// dinero real. lib/money.ts trae el helper para mostrarlos en pesos.

function rowToProducto(row: unknown): Producto {
  const r = row as Record<string, unknown>;
  return {
    ...(r as unknown as Producto),
    activo: Boolean(r.activo),
  };
}

export async function createProducto(input: {
  nombre: string;
  descripcion?: string;
  precioNormalCentavos: number;
  precioAdoptanteCentavos: number;
  fotoUrl?: string;
  stock?: number;
  activo?: boolean;
}): Promise<Producto> {
  await ensureSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Producto" ("id", "createdAt", "nombre", "descripcion", "precioNormalCentavos",
      "precioAdoptanteCentavos", "fotoUrl", "stock", "activo")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      createdAt,
      input.nombre,
      input.descripcion ?? null,
      input.precioNormalCentavos,
      input.precioAdoptanteCentavos,
      input.fotoUrl ?? null,
      input.stock ?? null,
      input.activo === false ? 0 : 1,
    ]
  );
  return (await getProductoById(id))!;
}

export async function getProductoById(id: string): Promise<Producto | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Producto" WHERE "id" = $1`, [id]);
  return rows[0] ? rowToProducto(rows[0]) : null;
}

/** Catálogo público: solo productos activos. */
export async function listProductosActivos(): Promise<Producto[]> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Producto" WHERE "activo" = 1 ORDER BY "createdAt" DESC`);
  return rows.map(rowToProducto);
}

/** Para el panel del equipo: todos los productos, activos o no. */
export async function listProductosTodos(): Promise<Producto[]> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Producto" ORDER BY "createdAt" DESC`);
  return rows.map(rowToProducto);
}

export async function setProductoActivo(id: string, activo: boolean): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE "Producto" SET "activo" = $1 WHERE "id" = $2`, [activo ? 1 : 0, id]);
}

// ---------- Tienda: Pedidos ----------

/** Porcentaje del total de cada pedido que se etiqueta como destinado a
 * refugios (ver comentario en el campo Pedido.montoRefugiosCentavos --
 * es un monto de referencia/contable, no un reparto automático de pago). */
export const PORCENTAJE_REFUGIOS = 0.1;

function rowToPedido(row: unknown): Pedido {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    createdAt: r.createdAt as string,
    compradorNombre: r.compradorNombre as string,
    compradorTelefono: (r.compradorTelefono as string) ?? null,
    compradorEmail: (r.compradorEmail as string) ?? null,
    esAdoptante: Boolean(r.esAdoptante),
    items: JSON.parse(r.itemsJson as string) as PedidoItem[],
    totalCentavos: r.totalCentavos as number,
    montoRefugiosCentavos: (r.montoRefugiosCentavos as number) ?? 0,
    status: r.status as PedidoStatus,
    notas: (r.notas as string) ?? null,
    mpPreferenceId: (r.mpPreferenceId as string) ?? null,
    mpPaymentId: (r.mpPaymentId as string) ?? null,
  };
}

/**
 * Crea un pedido calculando el total EN EL SERVIDOR a partir de los
 * productos reales en la base de datos -- nunca a partir de un precio que
 * mande el cliente. Así, aunque alguien manipule el formulario del
 * navegador, no puede pagar un precio distinto al que de verdad tiene el
 * producto. montoRefugiosCentavos también se calcula aquí (10% del total),
 * nunca se recibe del cliente.
 */
export async function createPedido(input: {
  compradorNombre: string;
  compradorTelefono?: string;
  compradorEmail?: string;
  esAdoptante: boolean;
  items: Array<{ productoId: string; cantidad: number }>;
  notas?: string;
}): Promise<Pedido> {
  await ensureSchema();
  const resolvedItems: PedidoItem[] = [];
  let totalCentavos = 0;
  for (const item of input.items) {
    if (item.cantidad <= 0) continue;
    const producto = await getProductoById(item.productoId);
    if (!producto || !producto.activo) continue;
    const precioUnitarioCentavos = input.esAdoptante
      ? producto.precioAdoptanteCentavos
      : producto.precioNormalCentavos;
    resolvedItems.push({
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad: item.cantidad,
      precioUnitarioCentavos,
    });
    totalCentavos += precioUnitarioCentavos * item.cantidad;
  }

  const montoRefugiosCentavos = Math.round(totalCentavos * PORCENTAJE_REFUGIOS);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO "Pedido" ("id", "createdAt", "compradorNombre", "compradorTelefono", "compradorEmail",
      "esAdoptante", "itemsJson", "totalCentavos", "montoRefugiosCentavos", "status", "notas")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDIENTE_PAGO', $10)`,
    [
      id,
      createdAt,
      input.compradorNombre,
      input.compradorTelefono ?? null,
      input.compradorEmail ?? null,
      input.esAdoptante ? 1 : 0,
      JSON.stringify(resolvedItems),
      totalCentavos,
      montoRefugiosCentavos,
      input.notas ?? null,
    ]
  );
  return (await getPedidoById(id))!;
}

export async function getPedidoById(id: string): Promise<Pedido | null> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Pedido" WHERE "id" = $1`, [id]);
  return rows[0] ? rowToPedido(rows[0]) : null;
}

export async function listPedidos(limit = 50): Promise<Pedido[]> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT * FROM "Pedido" ORDER BY "createdAt" DESC LIMIT $1`, [limit]);
  return rows.map(rowToPedido);
}

export async function setPedidoPreferenceId(id: string, mpPreferenceId: string): Promise<void> {
  await ensureSchema();
  await pool.query(`UPDATE "Pedido" SET "mpPreferenceId" = $1 WHERE "id" = $2`, [mpPreferenceId, id]);
}

export async function updatePedidoStatus(
  id: string,
  status: PedidoStatus,
  mpPaymentId?: string
): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE "Pedido" SET "status" = $1, "mpPaymentId" = COALESCE($2, "mpPaymentId") WHERE "id" = $3`,
    [status, mpPaymentId ?? null, id]
  );
}

export default pool;
