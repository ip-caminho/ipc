import { internalMutation } from "./_generated/server";
import { apagarArquivosSumidos } from "./files/orfaos";

// Migracao unica acampamento* -> retiro* — JA CONCLUIDA e desativada. O modelo
// de precos do retiro mudou (precos por tipo de quarto + refeicoes), tornando o
// shape antigo de `acampamentos` incompativel com `retiros`. Mantida so como
// referencia historica; `limpar` (abaixo) segue valido p/ remover o legado.
export const migrar = internalMutation({
  args: {},
  handler: async () => {
    throw new Error(
      "Migração acampamento* -> retiro* já concluída e desativada (modelo de preços mudou).",
    );
  },
});

// Reset dos dados do retiro (retiros + inscricoes + quartos). Usar para re-seed
// em dev e, principalmente, para limpar o evento de TESTE antes do deploy que
// mudou o shape de precos/hospedagem: o schema novo e INCOMPATIVEL com docs
// antigos (precosSnapshot.faixas, hospedagem.quartosDuplos), entao a validacao
// de schema do `convex deploy` rejeita enquanto existirem esses docs. Rode isto
// (ou apague os docs pela aba Data) no deployment ANTES de subir o schema novo.
export const resetRetiros = internalMutation({
  args: {},
  handler: async (ctx) => {
    let n = 0;
    for (const t of ["quartosRetiro", "inscricoesRetiro", "retiros"] as const) {
      for (const d of await ctx.db.query(t).collect()) {
        await ctx.db.delete(d._id);
        // Comprovante de pagamento e dado pessoal: apagar a inscricao sem
        // levar o arquivo junto deixaria PII orfa no bucket fechado.
        await apagarArquivosSumidos(ctx, t, d, null);
        n++;
      }
    }
    return { apagados: n };
  },
});

// Limpeza final (Fase 3): apaga os dados das tabelas antigas para o deploy que
// remove essas tabelas do schema nao falhar. So rodar apos migrar + cutover.
export const limpar = internalMutation({
  args: {},
  handler: async (ctx) => {
    let n = 0;
    for (const t of ["quartosAcampamento", "inscricoesAcampamento", "acampamentos"] as const) {
      for (const d of await ctx.db.query(t).collect()) {
        await ctx.db.delete(d._id);
        // Comprovante de pagamento e dado pessoal: apagar a inscricao sem
        // levar o arquivo junto deixaria PII orfa no bucket fechado.
        await apagarArquivosSumidos(ctx, t, d, null);
        n++;
      }
    }
    return { apagados: n };
  },
});
