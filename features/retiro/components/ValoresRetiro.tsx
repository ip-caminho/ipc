import type { RetiroPublico } from "../lib/data";
import { brl } from "../lib/format";

// Mesmo vocabulario visual do "Resumo da inscricao" (papel/navy, recibo).
const FONT_BODY = "font-[family-name:var(--font-source-sans)]";
const COR_TEXTO = "text-[#1A1A1A]";
const COR_MUTED = "text-[#595959]";

function LinhaValor({ nome, valor }: { nome: string; valor: string }) {
  return (
    <li className={`flex items-baseline gap-2 py-1 ${FONT_BODY} text-[14px]`}>
      <span className={`shrink-0 ${COR_TEXTO}`}>{nome}</span>
      <span className="mx-1 flex-1 translate-y-[-2px] border-b border-dotted border-[#C9C2B4]" aria-hidden />
      <span className={`shrink-0 tabular-nums ${COR_TEXTO}`}>{valor}</span>
    </li>
  );
}

function faixaLabel(f: { idadeMin: number; idadeMax: number }): string {
  if (f.idadeMax >= 100) return `${f.idadeMin} anos ou mais`;
  if (f.idadeMin === 0) return `Até ${f.idadeMax} anos`;
  return `${f.idadeMin} a ${f.idadeMax} anos`;
}

// Tabela de valores mostrada ANTES de preencher — quem quer entender os preços
// (por faixa de idade + adicionais) sem começar a inscrição.
export function ValoresRetiro({ precos }: { precos: RetiroPublico["precos"] }) {
  const faixas = [...precos.faixas].sort((a, b) => a.idadeMin - b.idadeMin);
  return (
    <div className="border border-[#E5E3DC] bg-[#F4F0E8] p-6 md:p-7">
      <p className={`${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.1em] ${COR_MUTED}`}>
        Valores
      </p>
      <p className={`${FONT_BODY} mt-1 text-[12px] leading-relaxed ${COR_MUTED}`}>
        Hospedagem por participante, conforme a idade na data de início.
      </p>
      <ul className="mt-4 space-y-2.5">
        {faixas.map((f, i) => (
          <LinhaValor
            key={i}
            nome={faixaLabel(f)}
            valor={f.valor === 0 ? "Isento" : brl(f.valor)}
          />
        ))}
      </ul>

      <p className={`${FONT_BODY} mt-5 text-[11px] uppercase tracking-[0.08em] ${COR_MUTED}`}>
        Adicionais
      </p>
      <ul className="mt-2 space-y-2.5">
        {precos.palestra > 0 && (
          <LinhaValor nome="Palestras (por pessoa)" valor={brl(precos.palestra)} />
        )}
        <LinhaValor nome="Cama extra (pelo período)" valor={brl(precos.camaExtra)} />
        <LinhaValor nome="Pet (por dia)" valor={brl(precos.petPorDia)} />
      </ul>

      <p className={`${FONT_BODY} mt-5 text-[12px] leading-relaxed ${COR_MUTED}`}>
        Preencha abaixo para ver o total da sua inscrição.
      </p>
    </div>
  );
}
