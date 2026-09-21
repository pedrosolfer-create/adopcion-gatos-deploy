"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  upsertDailyReport,
  createGato,
  getGatoById,
  updateGatoEstado,
  deleteGato,
  verifyRefugioLogin,
  createRefugio,
  getRefugioByUsuario,
  createVacunaGato,
  deleteVacunaGato,
  type GatoEstado,
} from "@/lib/db";
import { getSession, setSession, clearSession } from "@/lib/auth";
import { subirFotosGato } from "@/lib/cloudinary";
import { isStrongPassword } from "@/lib/password";
import { PERSONALIDAD_OPCIONES, FRASE_OPCIONES } from "@/lib/gatoOpciones";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function num(fd: FormData, key: string): number {
  const v = Number(fd.get(key));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}
/** Lee un checkbox tri-estado: si el <input type="checkbox"> no se manda
 * en el FormData (checkbox sin marcar), regresa `undefined` -- distinto de
 * `false` a propósito, para poder distinguir "no se sabe" (undefined ->
 * NULL en la BD) de "se marcó explícitamente que no" -- hoy el formulario
 * de alta no ofrece esa tercera opción, pero la columna sí la soporta para
 * cuando se construya la edición de gatos ya dados de alta. */
function checkbox(fd: FormData, key: string): boolean | undefined {
  return fd.get(key) === "on" ? true : undefined;
}
/** Lee todos los valores marcados de un grupo de checkboxes con el mismo
 * `name`, filtrando contra una lista de opciones válidas -- así un POST
 * fabricado a mano no puede meter texto arbitrario en personalidadJson/
 * frasesJson. */
function checkboxGroup(fd: FormData, key: string, opciones: readonly string[]): string[] {
  return fd
    .getAll(key)
    .map((v) => String(v))
    .filter((v) => opciones.includes(v));
}

/** Devuelve el refugioId de la sesión actual, o null si no hay una sesión
 * de refugio válida. Se revisa dentro de cada acción -- no solo en la
 * página -- porque una acción de servidor se puede invocar directamente. */
async function currentRefugioId(): Promise<string | null> {
  const session = await getSession();
  return session?.role === "refugio" ? session.refugioId : null;
}

export async function refugioLoginAction(formData: FormData) {
  const usuario = str(formData, "usuario");
  const password = String(formData.get("password") ?? "");
  const refugio = await verifyRefugioLogin(usuario, password);
  if (!refugio) {
    redirect("/refugio?error=1");
  }
  await setSession({ role: "refugio", refugioId: refugio.id });
  redirect("/refugio");
}

export async function refugioLogoutAction() {
  await clearSession();
  redirect("/refugio");
}

/** Alta de un refugio nuevo, hecha por el propio refugio desde
 * /refugio/registro -- no hay todavía una pantalla para que el equipo dé
 * de alta refugios desde /reportes, así que por ahora es autoservicio: el
 * refugio elige su propio usuario/password y queda logueado de inmediato
 * al terminar, sin ningún paso de aprobación intermedio. */
export async function refugioRegisterAction(formData: FormData) {
  const nombre = str(formData, "nombre");
  const usuario = str(formData, "usuario");
  const password = String(formData.get("password") ?? "");
  const responsableNombre = str(formData, "responsableNombre");

  if (!nombre || !usuario || !password || !responsableNombre) {
    redirect("/refugio/registro?error=faltan_datos");
  }
  if (!isStrongPassword(password)) {
    redirect("/refugio/registro?error=password_debil");
  }

  const existente = await getRefugioByUsuario(usuario);
  if (existente) {
    redirect("/refugio/registro?error=usuario_tomado");
  }

  const refugio = await createRefugio({
    nombre,
    usuario,
    password,
    responsableNombre,
    responsableTelefono: str(formData, "responsableTelefono") || undefined,
    responsableEmail: str(formData, "responsableEmail") || undefined,
    direccion: str(formData, "direccion") || undefined,
    ciudad: str(formData, "ciudad") || undefined,
  });

  await setSession({ role: "refugio", refugioId: refugio.id });
  redirect("/refugio");
}

export async function addGatoAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const nombre = str(formData, "nombre");
  if (!nombre) return;

  // Hasta 3 fotos -- todas opcionales, un <input type="file"> vacío llega
  // como un File de tamaño 0, no como null (subirFotosGato ya filtra eso).
  let fotoUrl: string | undefined;
  let fotoUrl2: string | undefined;
  let fotoUrl3: string | undefined;
  try {
    [fotoUrl, fotoUrl2, fotoUrl3] = await subirFotosGato([
      formData.get("foto") as File | null,
      formData.get("foto2") as File | null,
      formData.get("foto3") as File | null,
    ]);
  } catch (err) {
    console.error("SUBIR_FOTO_GATO_FAILED", err);
    redirect("/refugio?gatoError=foto");
  }

  const edadMesesRaw = str(formData, "edadMeses");

  await createGato({
    refugioId,
    nombre,
    sexo: str(formData, "sexo") || undefined,
    edadAprox: str(formData, "edadAprox") || undefined,
    descripcion: str(formData, "descripcion") || undefined,
    estado: (str(formData, "estado") as GatoEstado) || "DISPONIBLE",
    fotoUrl,
    fotoUrl2,
    fotoUrl3,
    edadMeses: edadMesesRaw ? num(formData, "edadMeses") : undefined,
    fechaNacimiento: str(formData, "fechaNacimiento") || undefined,
    raza: str(formData, "raza") || undefined,
    esterilizado: checkbox(formData, "esterilizado"),
    desparasitado: checkbox(formData, "desparasitado"),
    vacunado: checkbox(formData, "vacunado"),
    sanoListo: checkbox(formData, "sanoListo"),
    personalidad: checkboxGroup(formData, "personalidad", PERSONALIDAD_OPCIONES),
    frases: checkboxGroup(formData, "frases", FRASE_OPCIONES),
  });

  revalidatePath("/refugio");
}

/** Registra una vacuna aplicada a un gato -- valida que el gato sea del
 * refugio de la sesión antes de guardar, mismo chequeo que el resto de las
 * acciones de este archivo. */
export async function addVacunaAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const gatoId = str(formData, "gatoId");
  const tipoVacunaSel = str(formData, "tipoVacuna");
  // "OTRA" es la opción del <select> para cuando ninguna vacuna común
  // aplica -- en ese caso el texto real viene del input libre de al lado.
  const tipoVacuna = tipoVacunaSel === "OTRA" ? str(formData, "tipoVacunaOtra") || "Otra" : tipoVacunaSel;
  const fechaAplicacion = str(formData, "fechaAplicacion");
  if (!gatoId || !tipoVacuna || !fechaAplicacion) return;

  const gato = await getGatoById(gatoId);
  if (!gato || gato.refugioId !== refugioId) return;

  await createVacunaGato({
    gatoId,
    tipoVacuna,
    fechaAplicacion,
    fechaRevacunacion: str(formData, "fechaRevacunacion") || undefined,
    notas: str(formData, "notas") || undefined,
  });

  revalidatePath("/refugio");
}

export async function deleteVacunaAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const vacunaId = str(formData, "vacunaId");
  const gatoId = str(formData, "gatoId");
  if (!vacunaId || !gatoId) return;

  // No hay una consulta directa "vacuna -> refugio dueño" en lib/db.ts sin
  // pasar por el gato -- se valida así en vez de agregar un JOIN nuevo
  // solo para este chequeo de permisos.
  const gato = await getGatoById(gatoId);
  if (!gato || gato.refugioId !== refugioId) return;

  await deleteVacunaGato(vacunaId);
  revalidatePath("/refugio");
}

/** Cambia el estado de un gato (ej. marcarlo como adoptado) desde el
 * panel del refugio. Antes de tocar nada verifica que el gato sea del
 * refugio de la sesión actual -- sin este chequeo, un refugio podría
 * mandar el id de un gato ajeno y cambiar su estado (el formulario no
 * expone otros ids en su HTML, pero una acción de servidor se puede
 * invocar directamente con cualquier id). */
export async function updateGatoEstadoAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const gatoId = str(formData, "gatoId");
  const estado = str(formData, "estado") as GatoEstado;
  if (!gatoId || !estado) return;

  const gato = await getGatoById(gatoId);
  if (!gato || gato.refugioId !== refugioId) return;

  await updateGatoEstado(gatoId, estado);
  revalidatePath("/refugio");
}

/** Borra un gato del panel del refugio -- pensado para altas hechas por
 * error o duplicadas (ej. si el formulario se mandó más de una vez).
 * Mismo chequeo de dueño que updateGatoEstadoAction: sin esto, un
 * refugio podría mandar el id de un gato ajeno y borrarlo. */
export async function deleteGatoAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const gatoId = str(formData, "gatoId");
  if (!gatoId) return;

  const gato = await getGatoById(gatoId);
  if (!gato || gato.refugioId !== refugioId) return;

  await deleteGato(gatoId);
  revalidatePath("/refugio");
}

export async function addRefugioReportAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const date = str(formData, "date");
  const summary = str(formData, "summary");
  if (!date || !summary) return;

  await upsertDailyReport({
    date,
    refugioId,
    candidatesFormulario: num(formData, "candidatesFormulario"),
    summary,
    nextSteps: str(formData, "nextSteps") || undefined,
  });

  revalidatePath("/refugio");
}
