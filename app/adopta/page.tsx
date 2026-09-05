import { redirect } from "next/navigation";

/**
 * /adopta ya no es una página propia -- la sección de adopción vive ahora
 * en la landing fusionada (app/page.tsx, id="adopta"). Esta ruta se deja
 * viva SOLO como redirección, para que un link o anuncio que ya apunte
 * aquí (por ejemplo con ?src=instagram) siga funcionando sin que haya que
 * ir a cambiarlo -- los parámetros de la URL se conservan al redirigir.
 */
export default async function AdoptaRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v);
  }
  const query = qs.toString();
  redirect(`/${query ? `?${query}` : ""}#adopta`);
}
