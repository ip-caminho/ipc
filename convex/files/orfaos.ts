import { internal } from "../_generated/api";

// Evita que arquivo vire orfao no B2 quando a referencia sai do banco.
//
// O gatilho certo NAO e a UI: remover a foto num formulario que o usuario nao
// salva nao pode apagar nada. O gatilho e a REFERENCIA sumir do documento —
// por troca, limpeza do campo ou exclusao do doc inteiro.
//
// O delete vai por `scheduler.runAfter`, que o Convex so executa se a
// transacao commitar. Isso da a ordem segura de graca: primeiro o banco deixa
// de apontar para o arquivo, depois o arquivo some. Na ordem inversa, uma
// falha no meio deixaria registro apontando para arquivo inexistente.

/** Campos de URL de arquivo por tabela. Campo novo? Registrar aqui. */
const CAMPOS_ARQUIVO: Record<string, string[]> = {
  entidades: ["foto"],
  membros: ["cartaTransferencia"],
  eduVoluntarios: ["certificadoCacUrl"],
  gravacoes: ["audioUrl"],
  livros: ["capaUrl"],
  multimidiaArquivos: ["url"],
};

/**
 * Tabelas cujo arquivo vive dentro de arrays. `recebimentos` e
 * `comprovantesPendentes` guardam um comprovante por item.
 */
const ARRAYS_COM_ARQUIVO: Record<string, { array: string; campo: string }[]> = {
  inscricoesRetiro: [
    { array: "recebimentos", campo: "comprovanteUrl" },
    { array: "comprovantesPendentes", campo: "comprovanteUrl" },
  ],
  inscricoesAcampamento: [
    { array: "recebimentos", campo: "comprovanteUrl" },
    { array: "comprovantesPendentes", campo: "comprovanteUrl" },
  ],
};

type Doc = Record<string, unknown> | null | undefined;

/** Todas as URLs de arquivo que um documento referencia. */
export function urlsDoDocumento(tabela: string, doc: Doc): string[] {
  if (!doc) return [];
  const urls: string[] = [];

  for (const campo of CAMPOS_ARQUIVO[tabela] ?? []) {
    const v = doc[campo];
    if (typeof v === "string" && v) urls.push(v);
  }

  for (const { array, campo } of ARRAYS_COM_ARQUIVO[tabela] ?? []) {
    const itens = doc[array];
    if (!Array.isArray(itens)) continue;
    for (const item of itens) {
      const v = (item as Record<string, unknown>)?.[campo];
      if (typeof v === "string" && v) urls.push(v);
    }
  }

  return urls;
}

/**
 * Agenda o delete dos arquivos que o documento referenciava e nao referencia
 * mais. Passar `depois = null` no caso de exclusao do documento.
 *
 * Chamar DEPOIS do patch/delete, com o doc lido ANTES — o mesmo par que o
 * `createFieldAuditLogs` ja usa.
 */
export async function apagarArquivosSumidos(
  ctx: { scheduler: { runAfter: (ms: number, fn: any, args: any) => Promise<unknown> } },
  tabela: string,
  antes: Doc,
  depois: Doc,
): Promise<number> {
  const tinha = urlsDoDocumento(tabela, antes);
  if (tinha.length === 0) return 0;

  const continua = new Set(urlsDoDocumento(tabela, depois));
  let agendados = 0;

  for (const url of tinha) {
    if (continua.has(url)) continue;
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await ctx.scheduler.runAfter(0, internal.files.upload.deleteFile, { url });
    agendados++;
  }

  return agendados;
}
