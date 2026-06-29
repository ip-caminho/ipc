import Link from "next/link";
import type { InscricaoEventoPublica } from "@convex/public/inscricoesEvento";

function formatData(ts?: number): string | null {
  if (ts == null) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Linha de meta: "Até DD/MM/AAAA · N vagas" / "Lista de espera". Campos ausentes
// são omitidos (deadline e/ou vagas podem não existir).
function meta(insc: InscricaoEventoPublica): string {
  const partes: string[] = [];
  const limite = formatData(insc.dataLimite);
  if (limite) partes.push(`Até ${limite}`);
  if (insc.vagas != null) {
    const restantes = insc.vagas - insc.vagasOcupadas;
    partes.push(restantes > 0 ? `${restantes} vagas` : "Lista de espera");
  }
  return partes.join(" · ");
}

// Card de inscrição. Card inteiro é link para /inscricoes/[slug].
// `compact` (home): sem descrição. Sem compact (hub): com descrição curta.
export function InscricaoCard({
  inscricao,
  compact = false,
}: {
  inscricao: InscricaoEventoPublica;
  compact?: boolean;
}) {
  const linha = meta(inscricao);
  return (
    <Link
      href={`/inscricoes/${inscricao.slug}`}
      className="block border border-[#E5E3DC] bg-white px-4 py-4 transition-colors hover:border-[#1A1A1A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A5F] md:px-[18px]"
    >
      <p className="font-[family-name:var(--font-spectral)] text-[15px] font-medium text-[#1A1A1A]">
        {inscricao.titulo}
      </p>
      {!compact && inscricao.descricao && (
        <p className="mt-1.5 line-clamp-2 font-[family-name:var(--font-source-sans)] text-[13px] leading-[1.5] text-[#595959]">
          {inscricao.descricao}
        </p>
      )}
      {linha && (
        <p className="mt-2 font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.04em] text-[#595959]">
          {linha}
        </p>
      )}
      {!compact && (
        <span className="mt-3 inline-block font-[family-name:var(--font-source-sans)] text-[12px] text-[#1A1A1A] underline-offset-4 group-hover:underline">
          Inscrever-se →
        </span>
      )}
    </Link>
  );
}
