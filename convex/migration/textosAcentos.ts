import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migração: acentuação dos textos gravados a partir dos seeds (issue #362).
 *
 * Os seeds só inserem, então corrigir o texto no código não corrige o banco.
 * Aqui cada campo troca SÓ quando o valor gravado é exatamente o texto antigo
 * (texto editado pelo admin ou já corrigido fica como está). `slug` nunca é escrito.
 * Idempotente: a segunda execução não encontra texto antigo.
 * `multimidiaChecklist` (cópias por culto) não é lida nem escrita.
 *
 * Os textos antigos são literais (cópia do `main` antes do PR1), não importados
 * dos seeds, que já têm o texto novo.
 *
 * Padrão `dryRun = true`: sem argumento só conta. Para gravar, `{"dryRun":false}`.
 *
 * Rodar após o deploy do backend:
 *   npx convex run migration/textosAcentos:run '{"dryRun":true}'
 *   npx convex run migration/textosAcentos:run '{"dryRun":false}'
 */

// [antigo, novo]
type Par = readonly [string, string];

const FUNCOES: { slug: string; label: Par }[] = [
  { slug: "CONFISSAO", label: ["Confissao", "Confissão"] },
  { slug: "PREGACAO", label: ["Pregacao", "Pregação"] },
  { slug: "MULTIMIDIA", label: ["Multimidia", "Multimídia"] },
];

const MODULOS: { slug: string; label?: Par; descricao?: Par }[] = [
  { slug: "membros", descricao: ["Cadastro e gestao de membros", "Cadastro e gestão de membros"] },
  { slug: "diretorio", label: ["Diretorio", "Diretório"], descricao: ["Diretorio de contatos", "Diretório de contatos"] },
  { slug: "entidades", descricao: ["Gestao de entidades (PF/PJ)", "Gestão de entidades (PF/PJ)"] },
  { slug: "gravacoes", label: ["Gravacoes", "Gravações"], descricao: ["Gravacoes de sermoes e estudos", "Gravações de sermões e estudos"] },
  { slug: "pequenos-grupos", descricao: ["Gestao de pequenos grupos", "Gestão de pequenos grupos"] },
  { slug: "pedidos-oracao", label: ["Pedidos de Oracao", "Pedidos de Oração"], descricao: ["Pedidos de oracao da comunidade", "Pedidos de oração da comunidade"] },
  { slug: "ministerios", label: ["Ministerios", "Ministérios"], descricao: ["Gestao de ministerios da igreja", "Gestão de ministérios da igreja"] },
  { slug: "calendario", label: ["Calendario", "Calendário"], descricao: ["Calendario de eventos da igreja", "Calendário de eventos da igreja"] },
  { slug: "educacional", descricao: ["Gestao das turmas e criancas", "Gestão das turmas e crianças"] },
  { slug: "louvor", descricao: ["Repertorio de musicas com cifras e tons", "Repertório de músicas com cifras e tons"] },
  { slug: "tarefas", descricao: ["Gestao de tarefas e atividades", "Gestão de tarefas e atividades"] },
  { slug: "biblioteca", descricao: ["Acervo de livros e emprestimos", "Acervo de livros e empréstimos"] },
  { slug: "multimidia", label: ["Multimidia", "Multimídia"], descricao: ["Painel de multimidia para cultos", "Painel de multimídia para cultos"] },
  { slug: "avisos", descricao: ["Avisos semanais extraidos dos cultos", "Avisos semanais extraídos dos cultos"] },
];

const MINISTERIOS_NOME: Par[] = [["Multimidia", "Multimídia"]];

const MINISTERIOS_DESCRICAO: Par[] = [
  ["Ministerio de educacao para criancas", "Ministério de educação para crianças"],
  ["Ministerio de louvor e adoracao", "Ministério de louvor e adoração"],
  ["Ministerio de sonorizacao", "Ministério de sonorização"],
  ["Ministerio de recepcao e acolhimento", "Ministério de recepção e acolhimento"],
  ["Ministerio de midia e comunicacao", "Ministério de mídia e comunicação"],
];

const CHECKLIST_ITENS: Par[] = [
  ["Montar apresentacao", "Montar apresentação"],
  ["Conferir versiculo biblico", "Conferir versículo bíblico"],
  ["Conferir versao da Biblia", "Conferir versão da Bíblia"],
  ["Testar projecao", "Testar projeção"],
  ["Conferir audio/microfone", "Conferir áudio/microfone"],
];

function novoTexto(atual: string | undefined, pares: readonly Par[]): string | undefined {
  if (atual === undefined) return undefined;
  const par = pares.find(([antigo]) => antigo === atual);
  return par ? par[1] : undefined;
}

export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = true }) => {
    const stats = { dryRun, funcoes: 0, modulos: 0, ministerios: 0, checklistTemplate: 0 };

    for (const f of FUNCOES) {
      const doc = await ctx.db
        .query("funcoes")
        .withIndex("by_slug", (q) => q.eq("slug", f.slug))
        .unique();
      if (!doc) continue;
      const label = novoTexto(doc.label, [f.label]);
      if (label === undefined) continue;
      stats.funcoes++;
      if (!dryRun) await ctx.db.patch(doc._id, { label });
    }

    for (const m of MODULOS) {
      const doc = await ctx.db
        .query("modulos")
        .withIndex("by_slug", (q) => q.eq("slug", m.slug))
        .unique();
      if (!doc) continue;
      const patch: { label?: string; descricao?: string } = {};
      if (m.label) {
        const label = novoTexto(doc.label, [m.label]);
        if (label !== undefined) patch.label = label;
      }
      if (m.descricao) {
        const descricao = novoTexto(doc.descricao, [m.descricao]);
        if (descricao !== undefined) patch.descricao = descricao;
      }
      if (Object.keys(patch).length === 0) continue;
      stats.modulos++;
      if (!dryRun) await ctx.db.patch(doc._id, patch);
    }

    const ministerios = await ctx.db.query("ministerios").collect();
    for (const doc of ministerios) {
      const patch: { nome?: string; descricao?: string } = {};
      const nome = novoTexto(doc.nome, MINISTERIOS_NOME);
      if (nome !== undefined) patch.nome = nome;
      const descricao = novoTexto(doc.descricao, MINISTERIOS_DESCRICAO);
      if (descricao !== undefined) patch.descricao = descricao;
      if (Object.keys(patch).length === 0) continue;
      stats.ministerios++;
      if (!dryRun) await ctx.db.patch(doc._id, patch);
    }

    const itens = await ctx.db.query("multimidiaChecklistTemplate").collect();
    for (const doc of itens) {
      const item = novoTexto(doc.item, CHECKLIST_ITENS);
      if (item === undefined) continue;
      stats.checklistTemplate++;
      if (!dryRun) await ctx.db.patch(doc._id, { item });
    }

    return stats;
  },
});
