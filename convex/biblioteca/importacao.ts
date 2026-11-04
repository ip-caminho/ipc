import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { createActionAuditLog } from "../_shared/auditHelpers";
import { generateObjectKey, putObject } from "../files/helpers";

// Importacao do acervo que vivia no Notion. Rodar via CLI em lotes pequenos
// (scripts/importar-acervo-notion.mjs) — os nomes de pessoas vem nos args,
// nunca no repo. Idempotente pelo codigo do exemplar (indice by_codigo):
// rodar de novo pula o que ja entrou, sem reenviar capa ao B2.

// Mesmo prazo padrao da UI (features/biblioteca/lib/constants.ts).
const PERIODO_PADRAO_DIAS = 14;

const exemplarImport = v.object({
  codigo: v.string(), // BIB-NNNN
  numeroNotion: v.optional(v.number()),
  dataAquisicao: v.string(), // YYYY-MM-DD
  proprietarioNome: v.optional(v.string()), // ausente = acervo da igreja
  emPosse: v.optional(v.object({ nome: v.string(), dataEmprestimo: v.string() })),
});

const livroImport = v.object({
  titulo: v.string(),
  autores: v.array(v.string()),
  editora: v.optional(v.string()),
  isbn: v.optional(v.string()),
  ano: v.optional(v.number()),
  descricao: v.optional(v.string()),
  paginas: v.optional(v.number()),
  idioma: v.optional(v.string()),
  categorias: v.array(v.string()),
  capaUrlOrigem: v.optional(v.string()), // baixada e reenviada ao B2
  exemplares: v.array(exemplarImport),
});

/** Sem acento, minusculo, so letras/digitos — para comparar nomes. */
function tokens(nome: string): string[] {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export const codigosExistentes = internalQuery({
  args: { codigos: v.array(v.string()) },
  handler: async (ctx, { codigos }) => {
    const existentes: string[] = [];
    for (const codigo of codigos) {
      const ex = await ctx.db
        .query("exemplares")
        .withIndex("by_codigo", (q) => q.eq("codigo", codigo))
        .first();
      if (ex) existentes.push(codigo);
    }
    return existentes;
  },
});

type Resolucao =
  | { status: "OK"; membroId: Id<"membros">; nomeCompleto: string }
  | { status: "NAO_ENCONTRADO" }
  | { status: "AMBIGUO"; candidatos: string[] };

/**
 * Nome livre do Notion -> membro. So aceita quando exatamente um membro tem
 * todas as palavras do nome (ex: "Andre Choi" casa "André Kim Choi"), ou
 * quando um dos candidatos tem exatamente esse nome. Na
 * duvida nao vincula: o nome fica como texto e o relatorio aponta.
 */
export const resolverMembros = internalQuery({
  args: { nomes: v.array(v.string()) },
  handler: async (ctx, { nomes }) => {
    const out: Record<string, Resolucao> = {};
    for (const nome of nomes) {
      const alvo = tokens(nome);
      const achados = await ctx.db
        .query("entidades")
        .withSearchIndex("search_entidades", (q) => q.search("nomeCompleto", nome))
        .take(20);
      const candidatos: { membroId: Id<"membros">; nomeCompleto: string }[] = [];
      for (const ent of achados) {
        const nomeEnt = ent.nomeCompleto ?? "";
        const t = new Set(tokens(nomeEnt));
        if (!alvo.every((p) => t.has(p))) continue;
        const membro = await ctx.db
          .query("membros")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", ent._id))
          .first();
        if (membro) candidatos.push({ membroId: membro._id, nomeCompleto: nomeEnt });
      }
      // Varios candidatos: vale o unico cujo nome e exatamente o procurado.
      const exatos = candidatos.filter((c) => tokens(c.nomeCompleto).join(" ") === alvo.join(" "));
      const unico = candidatos.length === 1 ? candidatos[0] : exatos.length === 1 ? exatos[0] : undefined;
      out[nome] =
        unico
          ? { status: "OK", ...unico }
          : candidatos.length === 0
            ? { status: "NAO_ENCONTRADO" }
            : { status: "AMBIGUO", candidatos: candidatos.map((c) => c.nomeCompleto) };
    }
    return out;
  },
});

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split("T")[0];
}

export const importarLote = internalMutation({
  args: {
    livros: v.array(
      v.object({
        titulo: v.string(),
        autores: v.array(v.string()),
        editora: v.optional(v.string()),
        isbn: v.optional(v.string()),
        ano: v.optional(v.number()),
        descricao: v.optional(v.string()),
        paginas: v.optional(v.number()),
        idioma: v.optional(v.string()),
        categorias: v.array(v.string()),
        capaUrl: v.optional(v.string()),
        exemplares: v.array(
          v.object({
            codigo: v.string(),
            numeroNotion: v.optional(v.number()),
            dataAquisicao: v.string(),
            proprietarioNome: v.optional(v.string()),
            proprietarioMembroId: v.optional(v.id("membros")),
            emprestimo: v.optional(
              v.object({ membroId: v.id("membros"), dataEmprestimo: v.string() })
            ),
            observacoes: v.optional(v.string()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, { livros }) => {
    let livrosCriados = 0;
    let exemplaresCriados = 0;
    let emprestimosCriados = 0;
    const pulados: string[] = [];

    for (const l of livros) {
      // Reconfere aqui (a action consultou antes, mas pode ter havido corrida).
      let livroId: Id<"livros"> | undefined;
      const novos: typeof l.exemplares = [];
      for (const ex of l.exemplares) {
        const existente = await ctx.db
          .query("exemplares")
          .withIndex("by_codigo", (q) => q.eq("codigo", ex.codigo))
          .first();
        if (existente) {
          pulados.push(ex.codigo);
          livroId ??= existente.livroId;
        } else {
          novos.push(ex);
        }
      }
      if (novos.length === 0) continue;

      if (!livroId) {
        livroId = await ctx.db.insert("livros", {
          titulo: l.titulo.trim(),
          autores: l.autores,
          editora: l.editora,
          isbn: l.isbn,
          ano: l.ano,
          categorias: l.categorias,
          idioma: l.idioma ?? "Portugues",
          capaUrl: l.capaUrl,
          descricao: l.descricao,
          paginas: l.paginas,
          criadoEm: Date.now(),
        });
        await createActionAuditLog(ctx, "IMPORT", "livros", livroId as string);
        livrosCriados++;
      }

      for (const ex of novos) {
        const exemplarId = await ctx.db.insert("exemplares", {
          livroId,
          codigo: ex.codigo,
          condicao: "BOM",
          status: ex.emprestimo ? "EMPRESTADO" : "DISPONIVEL",
          dataAquisicao: ex.dataAquisicao,
          proprietarioNome: ex.proprietarioNome,
          proprietarioMembroId: ex.proprietarioMembroId,
          observacoes: ex.observacoes,
        });
        exemplaresCriados++;
        const origem = ex.numeroNotion !== undefined ? ` (nº ${ex.numeroNotion} no Notion)` : "";
        await ctx.db.insert("livroEventos", {
          exemplarId,
          livroId,
          tipo: "CADASTRO",
          data: ex.dataAquisicao,
          descricao: `Exemplar ${ex.codigo} importado do Notion${origem}`,
        });

        if (ex.emprestimo) {
          const emprestimoId = await ctx.db.insert("emprestimos", {
            exemplarId,
            livroId,
            membroId: ex.emprestimo.membroId,
            dataEmprestimo: ex.emprestimo.dataEmprestimo,
            dataPrevistaDevolucao: somarDias(ex.emprestimo.dataEmprestimo, PERIODO_PADRAO_DIAS),
            status: "ATIVO",
            observacoes: "Importado do Notion",
          });
          await ctx.db.insert("livroEventos", {
            exemplarId,
            livroId,
            tipo: "EMPRESTIMO",
            data: ex.emprestimo.dataEmprestimo,
            descricao: "Emprestado (importado do Notion)",
            membroId: ex.emprestimo.membroId,
          });
          await createActionAuditLog(ctx, "IMPORT", "emprestimos", emprestimoId as string);
          emprestimosCriados++;
        }
      }
    }

    return { livrosCriados, exemplaresCriados, emprestimosCriados, pulados };
  },
});

type ResultadoLote = {
  livrosCriados: number;
  exemplaresCriados: number;
  emprestimosCriados: number;
  pulados: string[];
};

type ResumoImportacao = {
  livrosNoLote: number;
  livrosAImportar: number;
  codigosJaExistentes: string[];
  membros: Record<string, Resolucao>;
};

type ResultadoImportacao =
  | ({ dryRun: true } & ResumoImportacao)
  | ({ dryRun: false; errosCapa: string[] } & ResumoImportacao & ResultadoLote);

const MAX_CAPA_BYTES = 5 * 1024 * 1024;

async function subirCapa(url: string, codigo: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`tipo ${contentType}`);
  const body = new Uint8Array(await res.arrayBuffer());
  if (body.byteLength > MAX_CAPA_BYTES) throw new Error("capa > 5MB");
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return await putObject(generateObjectKey("biblioteca-capas", codigo, ext), body, contentType);
}

/**
 * Ponto de entrada do CLI. `dryRun` so consulta: diz o que entraria, quais
 * codigos ja existem e como cada nome do Notion casou com os membros.
 */
export const importarAcervo = internalAction({
  args: { livros: v.array(livroImport), dryRun: v.boolean() },
  // Tipos explicitos: a action chama funcoes do proprio modulo via `internal`,
  // e sem anotacao o TS entra em ciclo e degrada todo o `api` para any.
  handler: async (ctx, { livros, dryRun }): Promise<ResultadoImportacao> => {
    const codigos = livros.flatMap((l) => l.exemplares.map((e) => e.codigo));
    const listaExistentes: string[] = await ctx.runQuery(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      internal.biblioteca.importacao.codigosExistentes,
      { codigos }
    );
    const existentes = new Set(listaExistentes);
    const nomes = [
      ...new Set(
        livros.flatMap((l) =>
          l.exemplares.flatMap((e) => [e.proprietarioNome, e.emPosse?.nome])
        ).filter((n): n is string => !!n)
      ),
    ];
    const membros: Record<string, Resolucao> = await ctx.runQuery(
      internal.biblioteca.importacao.resolverMembros,
      { nomes }
    );

    const pendentes = livros.filter((l) => l.exemplares.some((e) => !existentes.has(e.codigo)));
    const resumo: ResumoImportacao = {
      livrosNoLote: livros.length,
      livrosAImportar: pendentes.length,
      codigosJaExistentes: [...existentes],
      membros,
    };
    if (dryRun) return { dryRun: true, ...resumo };

    const errosCapa: string[] = [];
    const preparados = [];
    for (const l of pendentes) {
      const { capaUrlOrigem, exemplares, ...dados } = l;
      let capaUrl: string | undefined;
      if (capaUrlOrigem) {
        try {
          capaUrl = await subirCapa(capaUrlOrigem, exemplares[0].codigo);
        } catch (e) {
          errosCapa.push(`${exemplares[0].codigo}: ${(e as Error).message}`);
        }
      }
      preparados.push({
        ...dados,
        capaUrl,
        exemplares: exemplares.map((e) => {
          const dono = e.proprietarioNome ? membros[e.proprietarioNome] : undefined;
          const posse = e.emPosse ? membros[e.emPosse.nome] : undefined;
          return {
            codigo: e.codigo,
            numeroNotion: e.numeroNotion,
            dataAquisicao: e.dataAquisicao,
            proprietarioNome: e.proprietarioNome,
            proprietarioMembroId: dono?.status === "OK" ? dono.membroId : undefined,
            emprestimo:
              e.emPosse && posse?.status === "OK"
                ? { membroId: posse.membroId, dataEmprestimo: e.emPosse.dataEmprestimo }
                : undefined,
            // Em posse de alguem que nao virou membro: nao da para criar o
            // emprestimo (membroId obrigatorio), entao fica registrado aqui.
            observacoes:
              e.emPosse && posse?.status !== "OK"
                ? `Notion: em posse de ${e.emPosse.nome} desde ${e.emPosse.dataEmprestimo} (membro nao encontrado)`
                : undefined,
          };
        }),
      });
    }

    const resultado: ResultadoLote = await ctx.runMutation(internal.biblioteca.importacao.importarLote, {
      livros: preparados,
    });
    return { dryRun: false, ...resumo, ...resultado, errosCapa };
  },
});
