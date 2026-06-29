import type { MetadataRoute } from "next";
import { SITE_URL } from "@features/site-publico/lib/seo";

// Permite as rotas públicas; bloqueia a área autenticada e APIs.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/signin",
        "/ativar/",
        "/convite/",
        "/convidado/",
        "/g/",
        "/livro/",
        "/subir-audio",
        "/inscricao/",
        "/dashboard",
        "/membros",
        "/entidades",
        "/diretorio",
        "/gravacoes",
        "/multimidia",
        "/comunidade",
        "/educacional",
        "/boletim",
        "/calendario",
        "/cultos",
        "/escalas",
        "/louvor",
        "/ministerios",
        "/pastoreio",
        "/pedidos-oracao",
        "/pequenos-grupos",
        "/salas",
        "/tarefas",
        "/turmas",
        "/biblioteca",
        "/secretario-executivo",
        "/meu-perfil",
        "/bem-vindo",
        "/proximo-domingo",
        "/admin",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
