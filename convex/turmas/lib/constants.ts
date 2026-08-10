// Frequencia minima usada quando a turma nao tem o campo (turmas legadas, sem
// curso). Turma nova copia o valor do curso na criacao.
export const FREQUENCIA_MINIMA_PADRAO = 75;

// Anotacoes ficam no proprio documento de turmaEncontros/inscricoes, que sao
// lidos em lista (listEncontros/listInscricoes). Texto longo infla toda leitura
// da turma — dai o corte.
export const OBSERVACAO_MAX_CHARS = 500;

export function truncarObservacao(texto: string | undefined): string | undefined {
  const limpo = texto?.trim();
  if (!limpo) return undefined;
  return limpo.slice(0, OBSERVACAO_MAX_CHARS);
}
