import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { unstable_cache } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { EventoPublico } from "@convex/public/agenda";
import type { IgrejaInfo } from "./nav";

function httpClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url ? new ConvexHttpClient(url) : null;
}

// Info da igreja para o chrome público (header/footer/visite).
// Usa ConvexHttpClient (stateless, sem cookie de auth) dentro de unstable_cache:
// a query roda no máximo 1x/15min — permite render estático/ISR e controla o
// custo de bandwidth do Convex (não consulta a cada request, ao contrário do
// `fetchQuery` de convex/nextjs, que lê o cookie e torna a rota dinâmica).
export const getIgrejaInfoPublic = unstable_cache(
  async (): Promise<IgrejaInfo> => {
    try {
      const client = httpClient();
      if (!client) return {};
      return ((await client.query(api.preferencias.queries.getIgrejaInfo)) as IgrejaInfo) ?? {};
    } catch {
      return {};
    }
  },
  ["public-igreja-info"],
  { revalidate: 900 },
);

// Agenda pública completa (futura). Cacheada 15 min — derivamos "próximos" via
// slice na home, evitando uma segunda query.
export const getAgendaPublic = unstable_cache(
  async (): Promise<EventoPublico[]> => {
    try {
      const client = httpClient();
      if (!client) return [];
      return (await client.query(api.public.agenda.list, {})) ?? [];
    } catch {
      return [];
    }
  },
  ["public-agenda"],
  { revalidate: 900 },
);
