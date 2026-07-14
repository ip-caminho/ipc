/**
 * Calculo puro do financeiro do retiro (sem dependencia de runtime do
 * Convex — testavel direto). Todos os valores monetarios em CENTAVOS.
 *
 * Modelo de preco: o quarto e cobrado pelo VALOR CHEIO do tipo (individual,
 * duplo, triplo, quadruplo). Quem cabe nas vagas do(s) quarto(s) ja esta
 * incluso nesse valor. Participante que EXCEDE a capacidade (ex: crianca que
 * divide cama) paga apenas as REFEICOES do periodo: isento ate `idadeMeiaMin`,
 * meia entre `idadeMeiaMin` e `idadeInteiraMin`, inteira a partir dai.
 */

export type TipoQuarto = "individual" | "duplo" | "triplo" | "quadruplo";

export const CAPACIDADE_QUARTO: Record<TipoQuarto, number> = {
  individual: 1,
  duplo: 2,
  triplo: 3,
  quadruplo: 4,
};

export type QuartosContagem = Record<TipoQuarto, number>;

export const TIPOS_QUARTO: TipoQuarto[] = ["individual", "duplo", "triplo", "quadruplo"];
export const QUARTOS_ZERO: QuartosContagem = {
  individual: 0,
  duplo: 0,
  triplo: 0,
  quadruplo: 0,
};

export function mapQuartos(fn: (t: TipoQuarto) => number): QuartosContagem {
  return {
    individual: fn("individual"),
    duplo: fn("duplo"),
    triplo: fn("triplo"),
    quadruplo: fn("quadruplo"),
  };
}

/** Soma componente a componente. */
export function somaQuartos(a: QuartosContagem, b: QuartosContagem): QuartosContagem {
  return mapQuartos((t) => a[t] + b[t]);
}

/** Subtrai b de a, nunca abaixo de zero (devolucao de estoque). */
export function subQuartosClamp(a: QuartosContagem, b: QuartosContagem): QuartosContagem {
  return mapQuartos((t) => Math.max(0, a[t] - b[t]));
}

/** Total de quartos (soma dos 4 tipos). */
export function totalQuartos(q: QuartosContagem): number {
  return q.individual + q.duplo + q.triplo + q.quadruplo;
}

export type PrecosRetiro = {
  quartos: QuartosContagem; // valor cheio de cada tipo de quarto
  refeicaoInteira: number; // por refeicao (extra 11+)
  refeicaoMeia: number; // por refeicao (extra 6-10)
  numRefeicoes: number; // qtd de refeicoes do evento
  idadeMeiaMin: number; // idade em que passa a pagar meia refeicao (ex: 6)
  idadeInteiraMin: number; // idade em que passa a pagar inteira (ex: 11)
  camaExtra: number; // cobranca unica
  petPorDia: number;
  palestra: number; // por participante marcado
};

export type ParticipanteCalculo = {
  nome: string;
  dataNascimento: string; // YYYY-MM-DD
  participaPalestras: boolean;
};

export type HospedagemCalculo = {
  quartos: QuartosContagem;
  camasExtras: number;
  pets: number;
};

export type Ajuste = { tipo: "DESCONTO" | "CONTRIBUICAO_FUNDO"; valor: number };

/** Idade em anos completos na data de referencia (datas YYYY-MM-DD). */
export function idadeNaData(nascimento: string, referencia: string): number {
  const [ny, nm, nd] = nascimento.split("-").map(Number);
  const [ry, rm, rd] = referencia.split("-").map(Number);
  let idade = ry - ny;
  if (rm < nm || (rm === nm && rd < nd)) idade--;
  return idade;
}

/** Nº de diarias entre inicio e fim (ex: 01→04 = 3 diarias). Minimo 1. */
export function numDiarias(dataInicio: string, dataFim: string): number {
  const [iy, im, id] = dataInicio.split("-").map(Number);
  const [fy, fm, fd] = dataFim.split("-").map(Number);
  const dias = Math.round(
    (Date.UTC(fy, fm - 1, fd) - Date.UTC(iy, im - 1, id)) / 86_400_000,
  );
  return Math.max(1, dias);
}

export type ClasseIdade = "isento" | "meia" | "inteiro";

/** Classe de cobranca do participante pela idade na data de inicio. */
export function classeIdade(idade: number, precos: PrecosRetiro): ClasseIdade {
  if (idade < precos.idadeMeiaMin) return "isento";
  if (idade < precos.idadeInteiraMin) return "meia";
  return "inteiro";
}

/** Capacidade total (nº de camas) dos quartos escolhidos. */
export function capacidadeQuartos(quartos: QuartosContagem): number {
  return (
    quartos.individual * CAPACIDADE_QUARTO.individual +
    quartos.duplo * CAPACIDADE_QUARTO.duplo +
    quartos.triplo * CAPACIDADE_QUARTO.triplo +
    quartos.quadruplo * CAPACIDADE_QUARTO.quadruplo
  );
}

/** Custo cheio dos quartos escolhidos. */
export function custoQuartos(quartos: QuartosContagem, precos: PrecosRetiro): number {
  return (
    quartos.individual * precos.quartos.individual +
    quartos.duplo * precos.quartos.duplo +
    quartos.triplo * precos.quartos.triplo +
    quartos.quadruplo * precos.quartos.quadruplo
  );
}

/**
 * Arredonda p/ CIMA ate o total terminar em ,03 (o financeiro identifica a
 * inscricao pelo sufixo). Zero permanece zero. Valores em centavos.
 */
export function ajustarSufixo03(centavos: number): number {
  if (centavos <= 0) return 0;
  const resto = centavos % 100;
  const base = centavos - resto;
  return resto <= 3 ? base + 3 : base + 103;
}

export type ParticipanteDetalhe = {
  nome: string;
  idade: number;
  classe: ClasseIdade;
  emVaga: boolean; // ocupa cama do quarto (incluso no valor cheio)
  refeicoes: number; // valor das refeicoes avulsas (0 se em vaga)
};

export type CalculoInscricao = {
  total: number; // com sufixo ,03
  subtotal: number; // antes do arredondamento
  ajusteCentavos: number; // total - subtotal
  quartos: number; // custo cheio dos quartos
  capacidade: number;
  refeicoesExtras: number; // soma das refeicoes de quem excede a capacidade
  palestras: number;
  camasExtras: number;
  pets: number;
  participantes: ParticipanteDetalhe[];
};

/**
 * Total da inscricao: quartos (valor cheio) + refeicoes dos participantes que
 * excedem a capacidade + palestras + camas extras + pets × diarias, com o
 * sufixo ,03 aplicado no total.
 *
 * Alocacao de vagas: participantes de maior custo-de-refeicao (inteiros)
 * ocupam as vagas primeiro — quem sobra paga so refeicoes. Isso minimiza o
 * total, como a secretaria faria manualmente.
 */
export function calcularValorInscricao(
  participantes: ParticipanteCalculo[],
  hospedagem: HospedagemCalculo,
  precos: PrecosRetiro,
  dataInicio: string,
  dataFim: string,
): CalculoInscricao {
  const quartos = custoQuartos(hospedagem.quartos, precos);
  const capacidade = capacidadeQuartos(hospedagem.quartos);

  const refInteira = precos.refeicaoInteira * precos.numRefeicoes;
  const refMeia = precos.refeicaoMeia * precos.numRefeicoes;
  const custoRefeicao = (c: ClasseIdade) =>
    c === "inteiro" ? refInteira : c === "meia" ? refMeia : 0;

  const comClasse = participantes.map((p, i) => {
    const idade = idadeNaData(p.dataNascimento, dataInicio);
    return { i, nome: p.nome, idade, classe: classeIdade(idade, precos) };
  });

  // Ocupam vaga os de maior custo-de-refeicao (empate: ordem estavel).
  const ordem = [...comClasse].sort(
    (a, b) => custoRefeicao(b.classe) - custoRefeicao(a.classe),
  );
  const emVaga = new Set<number>();
  ordem.forEach((c, idx) => {
    if (idx < capacidade) emVaga.add(c.i);
  });

  const detalhe: ParticipanteDetalhe[] = comClasse.map((c) => {
    const naVaga = emVaga.has(c.i);
    return {
      nome: c.nome,
      idade: c.idade,
      classe: c.classe,
      emVaga: naVaga,
      refeicoes: naVaga ? 0 : custoRefeicao(c.classe),
    };
  });

  const refeicoesExtras = detalhe.reduce((s, d) => s + d.refeicoes, 0);
  const palestras =
    participantes.filter((p) => p.participaPalestras).length * precos.palestra;
  const camasExtras = hospedagem.camasExtras * precos.camaExtra;
  const pets = hospedagem.pets * precos.petPorDia * numDiarias(dataInicio, dataFim);

  const subtotal = quartos + refeicoesExtras + palestras + camasExtras + pets;
  const total = ajustarSufixo03(subtotal);
  return {
    total,
    subtotal,
    ajusteCentavos: total - subtotal,
    quartos,
    capacidade,
    refeicoesExtras,
    palestras,
    camasExtras,
    pets,
    participantes: detalhe,
  };
}

/** Valor final devido = tabela − descontos concedidos. Nunca negativo. */
export function valorFinal(valorTabela: number, ajustes: Ajuste[]): number {
  const descontos = ajustes
    .filter((a) => a.tipo === "DESCONTO")
    .reduce((s, a) => s + a.valor, 0);
  return Math.max(0, valorTabela - descontos);
}

export function totalRecebido(recebimentos: { valor: number }[]): number {
  return recebimentos.reduce((s, r) => s + r.valor, 0);
}

/** Saldo devedor (>0 = falta receber; <0 = sobra a destinar/devolver). */
export function saldoInscricao(
  valorTabela: number,
  ajustes: Ajuste[],
  recebimentos: { valor: number }[],
): number {
  return valorFinal(valorTabela, ajustes) - totalRecebido(recebimentos);
}

/**
 * Fundo solidario do evento:
 * Σ aportes avulsos + Σ contribuicoes (sobras destinadas) − Σ descontos concedidos.
 */
export function saldoFundo(
  aportesFundo: { valor: number }[],
  ajustesDeTodasInscricoes: Ajuste[],
): number {
  const aportes = aportesFundo.reduce((s, a) => s + a.valor, 0);
  const contribuicoes = ajustesDeTodasInscricoes
    .filter((a) => a.tipo === "CONTRIBUICAO_FUNDO")
    .reduce((s, a) => s + a.valor, 0);
  const descontos = ajustesDeTodasInscricoes
    .filter((a) => a.tipo === "DESCONTO")
    .reduce((s, a) => s + a.valor, 0);
  return aportes + contribuicoes - descontos;
}

type LinhaConsolidado = {
  status: "ATIVA" | "LISTA_ESPERA" | "CANCELADA";
  valorTabela: number;
  valorFinal: number;
  recebido: number;
  saldo: number;
  contribuicoesFundo: number;
};

export type ConsolidadoEvento = {
  totalTabela: number;
  totalDescontos: number;
  totalFinal: number;
  totalRecebido: number;
  aReceber: number;
  fundo: number;
};

/**
 * Consolidado financeiro do evento a partir das linhas de listarInscricoes +
 * aportes avulsos (doc do retiro). Derivavel no CLIENTE — evita uma
 * segunda assinatura reativa relendo a mesma base (padrao do Rol de Membros).
 */
export function consolidadoEvento(
  linhas: LinhaConsolidado[],
  aportesFundo: { valor: number }[],
): ConsolidadoEvento {
  const consideradas = linhas.filter((l) => l.status !== "CANCELADA");
  let totalTabela = 0,
    totalFinal = 0,
    totalRecebido = 0,
    aReceber = 0,
    contribuicoes = 0;
  for (const l of consideradas) {
    totalTabela += l.valorTabela;
    totalFinal += l.valorFinal;
    totalRecebido += l.recebido;
    aReceber += Math.max(0, l.saldo);
    contribuicoes += l.contribuicoesFundo;
  }
  const totalDescontos = totalTabela - totalFinal;
  const aportes = aportesFundo.reduce((s, a) => s + a.valor, 0);
  return {
    totalTabela,
    totalDescontos,
    totalFinal,
    totalRecebido,
    aReceber,
    fundo: aportes + contribuicoes - totalDescontos,
  };
}
