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

// Rótulo de seção. Usa <div> (não <p>) de propósito: a regra global
// `.site-v2 p { margin: 0 0 1em }` venceria as classes Tailwind e zeraria o
// margin-top, colando o título no conteúdo acima. Espaço grande em cima
// (separa da seção anterior) e pequeno embaixo (agrupa com o próprio conteúdo).
function RotuloSecao({ children, primeiro }: { children: React.ReactNode; primeiro?: boolean }) {
  return (
    <div
      className={`${primeiro ? "" : "mt-8"} mb-2.5 ${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.1em] ${COR_MUTED}`}
    >
      {children}
    </div>
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
      <RotuloSecao primeiro>Valores por quarto</RotuloSecao>
      <p className={`${FONT_BODY} text-[12px] leading-relaxed ${COR_MUTED}`}>
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

      <RotuloSecao>Crianças</RotuloSecao>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        {topicosIdade.map((topico) => (
          <li key={topico} className={`${FONT_BODY} text-[13px] leading-relaxed ${COR_MUTED}`}>
            {topico}
          </li>
        ))}
      </ul>
      {precos.palestra > 0 && (
        <>
          <RotuloSecao>Adicionais (cobrado na inscrição)</RotuloSecao>
          <ul className="mt-2 space-y-2.5">
            <LinhaValor nome="Palestras (por pessoa)" valor={brl(precos.palestra)} />
          </ul>
        </>
      )}

      <RotuloSecao>Pago direto ao hotel</RotuloSecao>
      <ul className="mt-2 space-y-2.5">
        <LinhaValor nome="Cama extra (cobrança única)" valor={brl(precos.camaExtra)} />
        <LinhaValor nome="Pet (por dia)" valor={brl(precos.petPorDia)} />
      </ul>
      <p className={`${FONT_BODY} mt-3 text-[12px] leading-relaxed ${COR_MUTED}`}>
        {temMeia ? `A meia alimentação (${valorMeia}), a cama extra e o pet` : "A cama extra e o pet"}{" "}
        são pagos diretamente ao hotel no checkout, junto com bebidas e demais consumos. Não
        entram no total da inscrição.
      </p>

      <p className={`${FONT_BODY} mt-5 text-[12px] leading-relaxed ${COR_MUTED}`}>
        Preencha abaixo para ver o total da sua inscrição.
      </p>
    </div>
  );
}
