import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { unstable_cache } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { IgrejaInfo } from "./nav";

// Info da igreja para o chrome público (header/footer/visite).
// Usa ConvexHttpClient (stateless, sem cookie de auth) dentro de unstable_cache:
// a query roda no máximo 1x/15min — permite render estático/ISR e controla o
// custo de bandwidth do Convex (não consulta a cada request, ao contrário do
// `fetchQuery` de convex/nextjs, que lê o cookie e torna a rota dinâmica).
export const getIgrejaInfoPublic = unstable_cache(
  async (): Promise<IgrejaInfo> => {
    try {
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) return {};
      const client = new ConvexHttpClient(url);
      return ((await client.query(api.preferencias.queries.getIgrejaInfo)) as IgrejaInfo) ?? {};
    } catch {
      return {};
    }
  },
  ["public-igreja-info"],
  { revalidate: 900 },
);
