// Frequencia minima usada quando a turma nao tem o campo (turmas legadas, sem
// curso). Turma nova copia o valor do curso na criacao.
export const FREQUENCIA_MINIMA_PADRAO = 75;

// Anotacoes ficam no proprio documento de turmaEncontros/inscricoes, que sao
// lidos em lista (listEncontros/listInscricoes). Texto longo infla toda leitura
// da turma — dai o corte.
export const OBSERVACAO_MAX_CHARS = 500;

// Janela em que a chamada aparece no widget do dashboard do instrutor. Eram
// 48h; 7 dias porque o prazo curto fazia a aula sumir antes de ele preencher.
// A secretaria (turmas:manage_inscricoes) nao tem prazo: marca pela tela da
// turma, que lista todas as aulas.
export const JANELA_CHAMADA_MS = 7 * 24 * 60 * 60 * 1000;

// Segunda assinatura do certificado. Constante por enquanto: nao existe campo
// de pastor titular na config da igreja — quando existir, ler de la.
export const PASTOR_TITULAR = "Bernardo Kyu Cho";

export function truncarObservacao(texto: string | undefined): string | undefined {
  const limpo = texto?.trim();
  if (!limpo) return undefined;
  return limpo.slice(0, OBSERVACAO_MAX_CHARS);
}
