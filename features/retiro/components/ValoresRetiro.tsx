import type { RetiroPublico } from "../lib/data";
import { brl } from "../lib/format";
import { CAPACIDADE_QUARTO } from "@convex/retiro/calculoHelpers";

// Mesmo vocabulario visual do "Resumo da inscricao" (papel/navy, recibo).
const FONT_BODY = "font-[family-name:var(--font-source-sans)]";
const COR_TEXTO = "text-[#1A1A1A]";
const COR_MUTED = "text-[#595959]";

function LinhaValor({ nome, detalhe, valor }: { nome: string; detalhe?: string; valor: string }) {
  return (
    <li className={`flex items-baseline gap-2 py-1 ${FONT_BODY} text-[14px]`}>
      <span className={`shrink-0 ${COR_TEXTO}`}>
        {nome}
        {detalhe && <span className={`ml-1.5 text-[12px] ${COR_MUTED}`}>{detalhe}</span>}
      </span>
      <span className="mx-1 flex-1 translate-y-[-2px] border-b border-dotted border-[#C9C2B4]" aria-hidden />
      <span className={`shrink-0 tabular-nums ${COR_TEXTO}`}>{valor}</span>
    </li>
  );
}

// Tabela de valores mostrada ANTES de preencher — quem quer entender os preços
// (por tipo de quarto + refeições dos extras + adicionais) sem começar a
// inscrição.
const LABEL: Record<keyof typeof CAPACIDADE_QUARTO, string> = {
  individual: "Individual",
  duplo: "Duplo",
  triplo: "Triplo",
  quadruplo: "Quádruplo",
};

export function ValoresRetiro({ precos }: { precos: RetiroPublico["precos"] }) {
  const quartos = (["individual", "duplo", "triplo", "quadruplo"] as const)
    .map((tipo) => ({ tipo, label: LABEL[tipo], valor: precos.quartos[tipo] }))
    .filter((q) => q.valor > 0);

  // Faixas de idade em tópicos — derivadas das configs de preço para não
  // desalinhar do cálculo. Robusto a configs degeneradas (meiaMin=0,
  // meiaMin==inteiraMin) para não exibir "Até -1 anos" ou faixa invertida.
  const valorMeia = brl(precos.refeicaoMeia * precos.numRefeicoes);
  const temMeia = precos.idadeInteiraMin > precos.idadeMeiaMin;
  const topicosIdade: string[] = [];
  if (precos.idadeMeiaMin > 0) {
    const ate = precos.idadeMeiaMin - 1;
    topicosIdade.push(
      `Crianças até ${ate} ${ate === 1 ? "ano" : "anos"} estão isentas do valor da refeição.`,
    );
  }
  if (temMeia) {
    const de = precos.idadeMeiaMin;
    const ateMeia = precos.idadeInteiraMin - 1;
    topicosIdade.push(
      de === ateMeia
        ? `Crianças com ${de} anos pagam apenas 50% da alimentação (${valorMeia}).`
        : `Crianças de ${de} a ${ateMeia} anos pagam apenas 50% da alimentação (${valorMeia}).`,
    );
  }

  return (
    <div className="border border-[#E5E3DC] bg-[#F4F0E8] p-6 md:p-7">
      <p className={`${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.1em] ${COR_MUTED}`}>
        Valores por quarto
      </p>
      <p className={`${FONT_BODY} mt-1 text-[12px] leading-relaxed ${COR_MUTED}`}>
        Pacote completo, valor por quarto (por pessoa entre parênteses).
      </p>
      <ul className="mt-4 space-y-2.5">
        {quartos.map((q) => {
          const porPessoa = CAPACIDADE_QUARTO[q.tipo];
          return (
            <LinhaValor
              key={q.tipo}
              nome={q.label}
              detalhe={porPessoa > 1 ? `${brl(Math.round(q.valor / porPessoa))} por pessoa` : undefined}
              valor={brl(q.valor)}
            />
          );
        })}
      </ul>

      <p className={`${FONT_BODY} mt-7 text-[11px] uppercase tracking-[0.08em] ${COR_MUTED}`}>
        Crianças
      </p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        {topicosIdade.map((topico) => (
          <li key={topico} className={`${FONT_BODY} text-[13px] leading-relaxed ${COR_MUTED}`}>
            {topico}
          </li>
        ))}
      </ul>
      {temMeia && (
        <p className={`${FONT_BODY} mt-2 text-[12px] leading-relaxed ${COR_MUTED}`}>
          O valor de {valorMeia} é pago diretamente ao hotel no momento do checkout, junto com
          outros extras (bebidas, taxa de cama extra, taxa de pet e demais consumos).
        </p>
      )}

      <p className={`${FONT_BODY} mt-7 text-[11px] uppercase tracking-[0.08em] ${COR_MUTED}`}>
        Adicionais
      </p>
      <ul className="mt-2 space-y-2.5">
        {precos.palestra > 0 && (
          <LinhaValor nome="Palestras (por pessoa)" valor={brl(precos.palestra)} />
        )}
        <LinhaValor nome="Cama extra (cobrança única)" valor={brl(precos.camaExtra)} />
        <LinhaValor nome="Pet (por dia)" valor={brl(precos.petPorDia)} />
      </ul>

      <p className={`${FONT_BODY} mt-5 text-[12px] leading-relaxed ${COR_MUTED}`}>
        Preencha abaixo para ver o total da sua inscrição.
      </p>
    </div>
  );
}
