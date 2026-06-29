import type { Metadata } from "next";
import Conteudo from "@/content/visite.mdx";
import { MDXLayout } from "@features/site-publico/components/MDXLayout";
import { CeiaQuote } from "@features/site-publico/components/CeiaQuote";
import { getIgrejaInfoPublic } from "@features/site-publico/lib/data";

export const metadata: Metadata = {
  title: "Visite — IPC",
  description:
    "Como nos visitar: endereço, horários e o que esperar de um culto na Igreja Presbiteriana do Caminho.",
};

// Dados da igreja mudam raramente
export const revalidate = 900;

export default async function VisitePage() {
  const igreja = await getIgrejaInfoPublic();
  const horarios = igreja.horarios ?? [];

  return (
    <MDXLayout>
      <p className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
        Igreja Presbiteriana do Caminho · São Paulo
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-spectral)] text-[34px] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] md:text-[40px]">
        Visite
      </h1>
      <p className="mt-4 max-w-[480px] font-[family-name:var(--font-spectral)] text-[16px] italic text-[#595959]">
        Estamos esperando você.
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-6 border-y border-[#E5E3DC] py-8 sm:grid-cols-2">
        <div>
          <dt className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
            Quando
          </dt>
          <dd className="mt-2 font-[family-name:var(--font-source-sans)] text-[15px] text-[#1A1A1A]">
            {horarios.length > 0 ? (
              <ul className="space-y-1">
                {horarios.map((h, i) => (
                  <li key={i}>
                    {h.dia} · {h.horario}
                    {h.tipo ? ` — ${h.tipo}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              "Domingos, 10h"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
            Onde
          </dt>
          <dd className="mt-2 font-[family-name:var(--font-source-sans)] text-[15px] text-[#1A1A1A]">
            {igreja.endereco ?? "[PREENCHER endereço]"}
          </dd>
          {igreja.endereco && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(igreja.endereco)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-[family-name:var(--font-source-sans)] text-[13px] text-[#1E3A5F] underline-offset-2 hover:underline"
            >
              Ver no mapa →
            </a>
          )}
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
