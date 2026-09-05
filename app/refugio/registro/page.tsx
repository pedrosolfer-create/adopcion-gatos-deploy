import { RegistroForm } from "@/components/RegistroForm";
import { refugioRegisterAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Alta de refugios nuevos, por ahora autoservicio (sin aprobación del
 * equipo): cualquiera con el link puede crear su propio acceso de
 * refugio. Enlazado desde el login de /refugio ("¿Aún no estás
 * registrado?"). Cuando exista una pantalla en /reportes para que el
 * equipo dé de alta refugios (roadmap pendiente), esta puede quedarse
 * como la vía de autoservicio o cerrarse, según se decida entonces.
 */
export default async function RefugioRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <RegistroForm action={refugioRegisterAction} error={error} />;
}
