import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migração: acentuação dos textos gravados a partir dos seeds (issue #362).
 *
 * Os seeds só inserem, então corrigir o texto no código não corrige o banco.
 * Aqui cada campo troca SÓ quando o valor gravado é exatamente o texto antigo
 * (texto editado pelo admin ou já corrigido fica como está). `slug` nunca é escrito.
 * Idempotente: a segunda execução não encontra texto antigo.
 * Também cobre o curso "Curso de Novos Membros", a turma "Novos Membros 2/2026" e os
 * títulos de seus encontros (copiados do plano do curso).
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

const CURSO_NOME = "Curso de Novos Membros";
const TURMA_NOME = "Novos Membros 2/2026";

const NM_DESCRICAO: Par = [
  "O curso tem como proposito apresentar os fundamentos biblicos que sustentam " +
    "nossa identidade como igreja presbiteriana, segundo os principios da Escritura " +
    "Sagrada. Ao longo dos encontros, estudaremos a Epistola de Paulo aos Efesios e o " +
    "livro Recriados Pela Graca, do pastor Bernardo Cho, buscando compreender como o " +
    "poder da ressurreicao de Cristo molda a vida, a comunhao e o testemunho da Igreja.",
  "O curso tem como propósito apresentar os fundamentos bíblicos que sustentam " +
    "nossa identidade como igreja presbiteriana, segundo os princípios da Escritura " +
    "Sagrada. Ao longo dos encontros, estudaremos a Epístola de Paulo aos Efésios e o " +
    "livro Recriados Pela Graça, do pastor Bernardo Cho, buscando compreender como o " +
    "poder da ressurreição de Cristo molda a vida, a comunhão e o testemunho da Igreja.",
];

const NM_EMENTA: Par = [
  "Material: Biblia Sagrada e Recriados Pela Graca (Bernardo Cho). Leitura previa do " +
    "capitulo correspondente a cada encontro. Limite de 3 faltas para conclusao. Apos o " +
    "curso: entrevista com os presbiteros e apresentacao dos novos membros com batismo.",
  "Material: Bíblia Sagrada e Recriados Pela Graça (Bernardo Cho). Leitura prévia do " +
    "capítulo correspondente a cada encontro. Limite de 3 faltas para conclusão. Após o " +
    "curso: entrevista com os presbíteros e apresentação dos novos membros com batismo.",
];

const NM_TITULOS: Par[] = [
  ["Introducao: Paulo e a Igreja de Efeso", "Introdução: Paulo e a Igreja de Éfeso"],
  ["Poemas a partir de ruinas · Um povo de shalom", "Poemas a partir de ruínas · Um povo de shalom"],
  [
    "O misterio pelo qual vale a pena sofrer · Cheios da plenitude de Deus",
    "O mistério pelo qual vale a pena sofrer · Cheios da plenitude de Deus",
  ],
  [
    "Separacao das obras das trevas · Unidade no casamento",
    "Separação das obras das trevas · Unidade no casamento",
  ],
];

const NM_TURMA_DESCRICAO: Par = [
  "Seja bem-vindo(a)! Este questionario tem o proposito de conhecer melhor os " +
    "participantes interessados no Estudo para Candidatos a Novos Membros, um curso " +
    "voltado para aqueles que desejam integrar oficialmente a Igreja Presbiteriana do " +
    "Caminho. Ao enviar este formulario, voce demonstra interesse em participar e esta " +
    "ciente dos compromissos envolvidos, incluindo o limite de 3 faltas e a entrevista " +
    "final com os presbiteros.",
  "Seja bem-vindo(a)! Este questionário tem o propósito de conhecer melhor os " +
    "participantes interessados no Estudo para Candidatos a Novos Membros, um curso " +
    "voltado para aqueles que desejam integrar oficialmente a Igreja Presbiteriana do " +
    "Caminho. Ao enviar este formulário, você demonstra interesse em participar e está " +
    "ciente dos compromissos envolvidos, incluindo o limite de 3 faltas e a entrevista " +
    "final com os presbíteros.",
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
    const stats = { dryRun, funcoes: 0, modulos: 0, ministerios: 0, checklistTemplate: 0, cursos: 0, turmas: 0, turmaEncontros: 0 };

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

    // Curso e turma de Novos Membros: localizados por índice (by_status / by_curso)
    let curso = null;
    for (const status of ["ATIVO", "INATIVO"] as const) {
      const lote = await ctx.db
        .query("cursos")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(100);
      curso = lote.find((c) => c.nome === CURSO_NOME) ?? null;
      if (curso) break;
    }
    if (curso) {
      const patch: {
        descricao?: string;
        ementa?: string;
        planoAulas?: { titulo: string; detalhe?: string }[];
      } = {};
      const descricao = novoTexto(curso.descricao, [NM_DESCRICAO]);
      if (descricao !== undefined) patch.descricao = descricao;
      const ementa = novoTexto(curso.ementa, [NM_EMENTA]);
      if (ementa !== undefined) patch.ementa = ementa;
      if (curso.planoAulas) {
        let mudou = false;
        const plano = curso.planoAulas.map((a) => {
          const titulo = novoTexto(a.titulo, NM_TITULOS);
          if (titulo === undefined) return a;
          mudou = true;
          return { ...a, titulo };
        });
        if (mudou) patch.planoAulas = plano;
      }
      if (Object.keys(patch).length > 0) {
        stats.cursos++;
        if (!dryRun) await ctx.db.patch(curso._id, patch);
      }

      const turmas = await ctx.db
        .query("turmas")
        .withIndex("by_curso", (q) => q.eq("cursoId", curso._id))
        .take(100);
      const turma = turmas.find((t) => t.nome === TURMA_NOME);
      if (turma) {
        const descricaoTurma = novoTexto(turma.descricao, [NM_TURMA_DESCRICAO]);
        if (descricaoTurma !== undefined) {
          stats.turmas++;
          if (!dryRun) await ctx.db.patch(turma._id, { descricao: descricaoTurma });
        }
        const encontros = await ctx.db
          .query("turmaEncontros")
          .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
          .take(200);
        for (const e of encontros) {
          const titulo = novoTexto(e.titulo, NM_TITULOS);
          if (titulo === undefined) continue;
          stats.turmaEncontros++;
          if (!dryRun) await ctx.db.patch(e._id, { titulo });
        }
      }
    }

    return stats;
  },
});
