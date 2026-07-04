import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { unstable_cache } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type AcampamentoPublico = NonNullable<
  FunctionReturnType<typeof api.public.acampamento.getBySlug>
>;

function httpClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url ? new ConvexHttpClient(url) : null;
}

// Disponibilidade de quartos muda — cache curto (mesmo padrão das inscrições).
export const getAcampamentoBySlug = unstable_cache(
  async (slug: string): Promise<AcampamentoPublico | null> => {
    try {
      const client = httpClient();
      if (!client) return null;
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      return (await client.query(api.public.acampamento.getBySlug, { slug })) ?? null;
    } catch {
      return null;
    }
  },
  ["public-acampamento-by-slug"],
  { revalidate: 60 },
);
