import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { unstable_cache } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { LivroCatalogo } from "@convex/public/acervo";

// Roda no Convex no máximo 1x/hora, seja qual for o número de visitantes. Falha não
// entra no cache: o erro sobe, a próxima visita tenta de novo.
export const getCatalogoAcervo = unstable_cache(
  async (): Promise<LivroCatalogo[]> => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL ausente");
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    return await new ConvexHttpClient(url).query(api.public.acervo.catalogo, {});
  },
  ["public-acervo-catalogo"],
  { revalidate: 3600, tags: ["public-acervo-catalogo"] },
);
