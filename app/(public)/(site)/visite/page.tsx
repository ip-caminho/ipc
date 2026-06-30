import type { Metadata } from "next";
import Conteudo from "@/content/visite.mdx";
import { MDXLayout } from "@features/site-publico/components/MDXLayout";
import { CeiaQuote } from "@features/site-publico/components/CeiaQuote";

export const metadata: Metadata = {
  title: "Visite — IPC",
  description:
    "Como nos visitar: endereço, horário e o que esperar de um culto na Igreja Presbiteriana do Caminho.",
};

// Dados fixos e corretos da igreja. O banco (preferencias.getIgrejaInfo) ainda
// tem dados antigos de teste (endereço de Colombo/PR, horários inexistentes) —
// usamos os valores corretos direto, como o rodapé (SiteFooter). Culto único:
// domingo, 10h. Endereço idêntico ao do rodapé e do JSON-LD.
const ENDERECO = "Rua Pedra Azul, 674A — Vila Mariana, São Paulo, SP";
const ENDERECO_MAPA = "Rua Pedra Azul, 674A, Vila Mariana, São Paulo, SP";
const HORARIO = "Domingos · 10h";

export default function VisitePage() {
  return (
    <MDXLayout>
      <p className="eyebrow">Igreja Presbiteriana do Caminho · São Paulo</p>
      <h1 className="mt-3 font-[family-name:var(--font-spectral)] text-[length:clamp(1.9rem,4.5vw,2.5rem)] font-semibold leading-[1.14] tracking-[-0.015em] text-[color:var(--text-strong)]">
        Visite
      </h1>
      <p className="mt-4 max-w-[46ch] font-[family-name:var(--font-spectral)] text-[length:var(--text-lg)] italic text-[color:var(--text-muted)]">
        Estamos esperando você.
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-6 border-y border-[color:var(--border-subtle)] py-8 sm:grid-cols-2">
        <div>
          <dt className="eyebrow">Quando</dt>
          <dd className="mt-2 font-[family-name:var(--font-source-sans)] text-[length:var(--text-sm)] text-[color:var(--text-body)]">
            {HORARIO}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Onde</dt>
          <dd className="mt-2 font-[family-name:var(--font-source-sans)] text-[length:var(--text-sm)] text-[color:var(--text-body)]">
            {ENDERECO}
          </dd>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ENDERECO_MAPA)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link-quiet mt-2 inline-block"
          >
            Ver no mapa →
          </a>
        </div>
      </dl>

      <Conteudo />

      <CeiaQuote>
        Celebramos a Ceia do Senhor em comunidade. Se você está nos visitando,
        ficaremos felizes em conversar com você sobre como participar.
      </CeiaQuote>
    </MDXLayout>
  );
}
