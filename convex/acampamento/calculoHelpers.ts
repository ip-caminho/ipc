/**
 * Calculo puro do financeiro do acampamento (sem dependencia de runtime do
 * Convex — testavel direto). Todos os valores monetarios em CENTAVOS.
 */

export type PrecosAcampamento = {
  faixas: { idadeMin: number; idadeMax: number; valor: number }[];
  camaExtra: number; // por periodo
  petPorDia: number;
  palestra: number; // por participante marcado
};

export type ParticipanteCalculo = {
  nome: string;
  dataNascimento: string; // YYYY-MM-DD
  participaPalestras: boolean;
};

export type HospedagemCalculo = {
  quartosDuplos: number;
  quartosTriplos: number;
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

/**
 * Valor de hospedagem do participante pela faixa etaria na data de inicio.
 * Idade fora de todas as faixas cai na faixa de maior idadeMax (inteiro) —
 * nunca deixa participante sem preco.
 */
export function valorParticipante(
  precos: PrecosAcampamento,
  dataNascimento: string,
  dataInicio: string,
): number {
  const idade = idadeNaData(dataNascimento, dataInicio);
  const faixa = precos.faixas.find((f) => idade >= f.idadeMin && idade <= f.idadeMax);
  if (faixa) return faixa.valor;
  const maisAlta = [...precos.faixas].sort((a, b) => b.idadeMax - a.idadeMax)[0];
  return maisAlta?.valor ?? 0;
}

export type CalculoInscricao = {
  total: number;
  hospedagemPorParticipante: { nome: string; idade: number; valor: number }[];
  palestras: number;
  camasExtras: number;
  pets: number;
};

/** Total da inscricao: faixas + palestras + camas extras + pets × diarias. */
export function calcularValorInscricao(
  participantes: ParticipanteCalculo[],
  hospedagem: HospedagemCalculo,
  precos: PrecosAcampamento,
  dataInicio: string,
  dataFim: string,
): CalculoInscricao {
  const hospedagemPorParticipante = participantes.map((p) => ({
    nome: p.nome,
    idade: idadeNaData(p.dataNascimento, dataInicio),
    valor: valorParticipante(precos, p.dataNascimento, dataInicio),
  }));
  const palestras =
    participantes.filter((p) => p.participaPalestras).length * precos.palestra;
  const camasExtras = hospedagem.camasExtras * precos.camaExtra;
  const pets = hospedagem.pets * precos.petPorDia * numDiarias(dataInicio, dataFim);
  const total =
    hospedagemPorParticipante.reduce((s, p) => s + p.valor, 0) +
    palestras +
    camasExtras +
    pets;
  return { total, hospedagemPorParticipante, palestras, camasExtras, pets };
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
 * aportes avulsos (doc do acampamento). Derivavel no CLIENTE — evita uma
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
