import type { MetadataRoute } from "next";
import { SITE_URL } from "@features/site-publico/lib/seo";
import { getInscricoesAtivas } from "@features/site-publico/lib/data";

// Rotas públicas estáticas + slugs de inscrições ativas (dinâmicos).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas = [
    "",
    "/quem-somos",
    "/trajetoria",
    "/agenda",
    "/visite",
    "/inscricoes",
    "/privacidade",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  let inscricoes: MetadataRoute.Sitemap = [];
  try {
    const ativas = await getInscricoesAtivas();
    inscricoes = ativas.map((i) => ({
      url: `${SITE_URL}/inscricoes/${i.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    inscricoes = [];
  }

  return [...estaticas, ...inscricoes];
}
