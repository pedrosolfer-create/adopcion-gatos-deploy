import { redirect } from "next/navigation";

/**
 * /tienda ya no es una página propia -- vive ahora como sección de la
 * landing fusionada (app/page.tsx, id="tienda"). Se deja como redirección
 * para no romper links existentes, igual que /adopta.
 */
export default async function TiendaRedirect({
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
  redirect(`/${query ? `?${query}` : ""}#tienda`);
}
