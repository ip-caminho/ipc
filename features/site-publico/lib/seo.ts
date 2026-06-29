// Dados canônicos para SEO/metadata do site público. Valores reais já exibidos
// na landing de produção (não inventados).

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://ipc-pi-ten.vercel.app";

export const IGREJA_SEO = {
  nome: "Igreja Presbiteriana do Caminho",
  descricao:
    "Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo. Presbiteriana, em São Paulo.",
  email: "ipdocaminho@gmail.com",
  endereco: {
    rua: "Rua Pedra Azul, 674A",
    bairro: "Vila Mariana",
    cidade: "São Paulo",
    uf: "SP",
    pais: "BR",
  },
  instagram: "https://instagram.com/ip.docaminho",
  facebook: "https://facebook.com/ip.docaminho",
} as const;

// Structured data schema.org/Church para a área pública.
export function churchJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    name: IGREJA_SEO.nome,
    description: IGREJA_SEO.descricao,
    url: SITE_URL,
    email: IGREJA_SEO.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: IGREJA_SEO.endereco.rua,
      addressLocality: IGREJA_SEO.endereco.cidade,
      addressRegion: IGREJA_SEO.endereco.uf,
      addressCountry: IGREJA_SEO.endereco.pais,
    },
    sameAs: [IGREJA_SEO.instagram, IGREJA_SEO.facebook],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "10:00",
      },
    ],
  };
}
