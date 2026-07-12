/**
 * Mutations para edicao de dados eclesiasticos do membro.
 * Gated por `rol:update` (ou `membros:update` para retrocompat); leitura por `rol:read`.
 *
 * Permitido a: admin, pastor, secretaria, secretario_executivo.
 *
 * Apenas campos eclesiasticos podem ser editados — dados pessoais (nome, CPF,
 * endereco, contato) ficam de fora.
 */

import { mutation, query, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAnyPermission } from "../_shared/requirePermission";
import { espelharConjuge, vincularCriancaAoConjuge } from "./familiaHelpers";
import { createFieldAuditLogs, createActionAuditLog } from "../_shared/auditHelpers";
import { getTipoRol, type CargoEclesiastico, type StatusEntidade, type TipoRol } from "./tipoRolHelpers";
import { calcularResumoSecretario, type ResumoSecretario as ResumoSecretarioT } from "./resumoSecretarioHelpers";
import type { Doc, Id } from "../_generated/dataModel";

export type RolCategoria = "PRINCIPAL" | "SEPARADO" | "AUSENTE" | "ARQUIVO";

/** Mapeia o tipoRol derivado (IPB) para a categoria de rol exibida. */
function categoriaDoRol(
  cargo: string | undefined,
  status: string,
  override: string | undefined
): RolCategoria {
  const t: TipoRol | null = getTipoRol(
    cargo as CargoEclesiastico | undefined,
    status as StatusEntidade,
    override as TipoRol | undefined
  );
  if (t === null) return "ARQUIVO";
  if (t === "COMUNGANTE") return "PRINCIPAL";
  if (t === "NAO_COMUNGANTE") return "SEPARADO";
  return "AUSENTE";
}

const ECLESIASTICO_FIELDS = new Set([
  // Membresia
  "rol",
  "dataMembresia",
  "formaAdmissao",
  "cargoEclesiastico",
  "dataConversao",
  "dataBatismo",
  "igrejaProcedencia",
  "numeroMatricula",
  "observacoesPastorais",
  "tipoRolOverride",
  "civilmenteCapazes",
  // Demissao
  "formaDemissao",
  "dataDemissao",
  "igrejaDestino",
  "dataFalecimento",
  "cartaTransferencia",
  "motivoDemissao",
  "motivoDemissaoObs",
]);

export const updateEclesiastico = mutation({
  args: {
    membroId: v.id("membros"),
    data: v.any(),
  },
  handler: async (ctx, { membroId, data }) => {
    await requireAnyPermission(ctx, [
      "rol:update",
      "membros:update",
    ]);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const editor = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!editor) throw new Error("Editor nao encontrado");

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");

    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data ?? {})) {
      if (ECLESIASTICO_FIELDS.has(key)) {
        filtered[key] = value === "" ? undefined : value;
      }
    }

    if (Object.keys(filtered).length === 0) {
      return { changed: false };
    }

    const oldMembro = { ...membro };
    await ctx.db.patch(membroId, filtered);
    const newMembro = await ctx.db.get(membroId);
    await createFieldAuditLogs(ctx, oldMembro, newMembro, "membros", membroId);

    return { changed: true, fields: Object.keys(filtered) };
  },
});

/**
 * Marca um campo como verificado pelo livro fisico (selo da secretaria).
 * Adiciona/atualiza entry em `entidades.camposVerificados`.
 */
export const marcarCampoVerificado = mutation({
  args: {
    entidadeId: v.id("entidades"),
    campo: v.string(),
    desmarcar: v.optional(v.boolean()),
  },
  handler: async (ctx, { entidadeId, campo, desmarcar }) => {
    await requireAnyPermission(ctx, [
      "rol:update",
      "membros:update",
    ]);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const verificador = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!verificador) throw new Error("Verificador nao encontrado");

    const entidade = await ctx.db.get(entidadeId);
    if (!entidade) throw new Error("Entidade nao encontrada");

    const atuais = entidade.camposVerificados ?? [];
    const semCampo = atuais.filter((c) => c.campo !== campo);

    const novos = desmarcar
      ? semCampo
      : [
          ...semCampo,
          {
            campo,
            verificadoEm: Date.now(),
            verificadoPor: verificador._id,
          },
        ];

    // Tambem remove de dadosIncertos quando marca como verificado
    const dadosIncertos = desmarcar
      ? entidade.dadosIncertos
      : (entidade.dadosIncertos ?? []).filter((c) => c !== campo);

    await ctx.db.patch(entidadeId, {
      camposVerificados: novos.length > 0 ? novos : undefined,
      dadosIncertos:
        dadosIncertos && dadosIncertos.length > 0 ? dadosIncertos : undefined,
    });

    return { ok: true };
  },
});

/**
 * Retorna familia (conjuge + filhos) de um membro arbitrario.
 * Usado por secretario_executivo e secretaria para consulta.
 */
export const getFamily = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requireAnyPermission(ctx, ["membros:read", "diretorio:read", "rol:read"]);

    const membro = await ctx.db.get(membroId);
    if (!membro) return null;

    let conjuge: {
      entidadeId: string;
      nomeCompleto: string;
      foto?: string;
    } | null = null;
    if (membro.conjugeId) {
      const conjugeEnt = await ctx.db.get(membro.conjugeId);
      if (conjugeEnt) {
        conjuge = {
          entidadeId: conjugeEnt._id,
          nomeCompleto: conjugeEnt.nomeCompleto ?? "",
          foto: conjugeEnt.foto,
        };
      }
    }

    const links = await ctx.db
      .query("responsaveis")
      .withIndex("by_responsavel", (q) =>
        q.eq("responsavelEntidadeId", membro.entidadeId)
      )
      .collect();

    const filhos = (
      await Promise.all(
        links.map(async (r) => {
          const filho = await ctx.db.get(r.criancaEntidadeId);
          if (!filho) return null;
          return {
            entidadeId: filho._id,
            nomeCompleto: filho.nomeCompleto ?? "",
            foto: filho.foto,
            dataNascimento: filho.dataNascimento,
          };
        })
      )
    ).filter(Boolean) as Array<{
      entidadeId: string;
      nomeCompleto: string;
      foto?: string;
      dataNascimento?: string;
    }>;

    return { conjuge, filhos };
  },
});

type LinhaSecretario = {
  _id: string; // membroId (membro) ou entidadeId (dependente)
  ehMembro: boolean;
  entidadeId: string;
  entidade: { nomeCompleto?: string; whatsapp?: string; status?: string; foto?: string };
  cargoEclesiastico?: string;
  rol?: string;
  tipoRolOverride?: string;
  numeroMatricula?: string;
  dataConversao?: string;
  dataBatismo?: string;
  dataMembresia?: string;
  civilmenteCapazes?: boolean;
  rolCategoria: RolCategoria | null; // null = dependente (fora do rol)
  pendencia: boolean; // dados eclesiasticos faltando (cadastro incompleto)
  mandatoVencido: boolean; // tem mandato ATIVO com mandatoFim no passado
  mandatoVencendo: boolean; // mandato ATIVO vencendo nos proximos 90 dias
  sexo?: string;
  dataNascimento?: string;
  familiaHeadId: string;
  familiaHeadNome: string;
  familiaOrder: number; // 0 chefe (homem adulto), 1 conjuge, 2 filho
};

export type { ResumoSecretario } from "./resumoSecretarioHelpers";

/** Calcula se um membro tem pendencia de cadastro eclesiastico. */
function temPendencia(
  m: Doc<"membros"> | undefined,
  rolCat: RolCategoria | null
): boolean {
  if (!m || (rolCat !== "PRINCIPAL" && rolCat !== "SEPARADO")) return false;
  if (!m.cargoEclesiastico) return true;
  if (!m.numeroMatricula) return true;
  if (rolCat === "PRINCIPAL" && !m.dataMembresia) return true;
  if (rolCat === "SEPARADO" && !m.dataBatismo) return true;
  return false;
}

/**
 * Monta as linhas (membros + dependentes) com metadados de familia, rol e
 * pendencia, sobre toda a base. Reusado pela lista e pelo resumo.
 */
async function montarLinhasSecretario(ctx: QueryCtx): Promise<LinhaSecretario[]> {
  // So membros e vinculos de dependencia sao lidos por completo (tabelas
  // pequenas). As entidades sao buscadas POR ID — apenas as referenciadas
  // (membros + criancas dependentes), nunca a tabela `entidades` inteira, que
  // guarda toda a populacao (visitantes, contatos, fornecedores, PJ...) e e a
  // origem da lentidao. Cada get roda em paralelo, entao a latencia se mantem.
  const [membros, responsaveis] = await Promise.all([
    ctx.db.query("membros").collect(),
    ctx.db.query("responsaveis").collect(),
  ]);

  const membroEntIds = new Set<string>(membros.map((m) => m.entidadeId as string));
  const criancaIds = new Set<string>();
  for (const r of responsaveis) {
    // So dependentes de responsavel que e membro entram na tabela.
    if (membroEntIds.has(r.responsavelEntidadeId as string)) {
      criancaIds.add(r.criancaEntidadeId as string);
    }
  }
  const idsNecessarios = [...new Set<string>([...membroEntIds, ...criancaIds])];
  const entsCarregadas = await Promise.all(
    idsNecessarios.map((id) => ctx.db.get(id as Id<"entidades">)),
  );
  const todasEnts = new Map<string, Doc<"entidades">>();
  for (const e of entsCarregadas) {
    if (e) todasEnts.set(e._id, e);
  }

  const membroPorEnt = new Map<string, Doc<"membros">>();
  const entPorId = new Map<string, Doc<"entidades">>();
  for (const m of membros) {
    const e = todasEnts.get(m.entidadeId);
    if (!e) continue;
    membroPorEnt.set(e._id, m);
    entPorId.set(e._id, e);
  }

  const filhosDe = new Map<string, string[]>();
  const paisDe = new Map<string, string[]>();
  for (const r of responsaveis) {
    const crianca = r.criancaEntidadeId as string;
    const resp = r.responsavelEntidadeId as string;
    if (!membroPorEnt.has(resp)) continue;
    if (!entPorId.has(crianca)) {
      const ce = todasEnts.get(crianca);
      if (!ce) continue;
      entPorId.set(crianca, ce);
    }
    (filhosDe.get(resp) ?? filhosDe.set(resp, []).get(resp)!).push(crianca);
    (paisDe.get(crianca) ?? paisDe.set(crianca, []).get(crianca)!).push(resp);
  }

  function chefeDoCasal(entId: string): string {
    const m = membroPorEnt.get(entId);
    const conjId = m?.conjugeId as string | undefined;
    if (!conjId || !membroPorEnt.has(conjId)) return entId;
    if (entPorId.get(entId)?.sexo === "M") return entId;
    if (entPorId.get(conjId)?.sexo === "M") return conjId;
    return entId < conjId ? entId : conjId;
  }

  function metaFamilia(entId: string): { headId: string; order: number } {
    const m = membroPorEnt.get(entId);
    const conjId = m?.conjugeId as string | undefined;
    const temConjuge = !!conjId && membroPorEnt.has(conjId);
    const temFilhos = (filhosDe.get(entId)?.length ?? 0) > 0;
    const pais = paisDe.get(entId) ?? [];
    const dependente = pais.length > 0 && !temConjuge && !temFilhos;
    if (dependente) return { headId: chefeDoCasal(pais[0]), order: 2 };
    if (temConjuge) {
      const headId = chefeDoCasal(entId);
      return { headId, order: headId === entId ? 0 : 1 };
    }
    return { headId: entId, order: 0 };
  }

  // Mandatos: ATIVO com data fim no passado = vencido; nos proximos 90 dias = vencendo.
  const hoje = new Date(Date.now()).toISOString().slice(0, 10);
  const limite90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  // Maioridade civil (18 anos): nascido em/antes desta data => civilmente capaz.
  const [hy, hmes, hd] = hoje.split("-");
  const limiteMaioridade = `${Number(hy) - 18}-${hmes}-${hd}`;
  const mandatoVencidoPorMembro = new Set<string>();
  const mandatoVencendoPorMembro = new Set<string>();
  const mandatosAtivos = await ctx.db
    .query("cargosEclesiasticosHistorico")
    .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
    .collect();
  for (const md of mandatosAtivos) {
    if (!md.mandatoFim) continue;
    if (md.mandatoFim < hoje) mandatoVencidoPorMembro.add(md.membroId as string);
    else if (md.mandatoFim <= limite90) mandatoVencendoPorMembro.add(md.membroId as string);
  }

  const linhas: LinhaSecretario[] = [];
  for (const [entId, e] of entPorId) {
    const m = membroPorEnt.get(entId);
    const { headId, order } = metaFamilia(entId);
    const rolCategoria = m
      ? categoriaDoRol(m.cargoEclesiastico, e.status, m.tipoRolOverride)
      : null;
    linhas.push({
      _id: m ? m._id : entId,
      ehMembro: !!m,
      entidadeId: entId,
      entidade: { nomeCompleto: e.nomeCompleto, whatsapp: e.whatsapp, status: e.status, foto: e.foto },
      cargoEclesiastico: m?.cargoEclesiastico,
      rol: m?.rol,
      tipoRolOverride: m?.tipoRolOverride,
      numeroMatricula: m?.numeroMatricula,
      dataConversao: m?.dataConversao,
      dataBatismo: m?.dataBatismo,
      dataMembresia: m?.dataMembresia,
      // Derivado da idade (>= 18 anos = maioridade civil)
      civilmenteCapazes: !!m && !!e.dataNascimento && e.dataNascimento <= limiteMaioridade,
      rolCategoria,
      pendencia: temPendencia(m, rolCategoria),
      mandatoVencido: m ? mandatoVencidoPorMembro.has(m._id) : false,
      mandatoVencendo: m ? mandatoVencendoPorMembro.has(m._id) : false,
      sexo: e.sexo,
      dataNascimento: e.dataNascimento,
      familiaHeadId: headId,
      familiaHeadNome: entPorId.get(headId)?.nomeCompleto ?? "",
      familiaOrder: order,
    });
  }
  return linhas;
}

/**
 * Lista para a tabela do secretario executivo: membros + dados eclesiasticos
 * + filhos DEPENDENTES (nao-membros, ex: crianca nao batizada) + metadados de
 * familia para agrupamento.
 *
 * Familia: homem adulto (chefe) -> conjuge -> filhos (mais velho primeiro).
 */
export const listParaSecretario = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }): Promise<LinhaSecretario[]> => {
    await requireAnyPermission(ctx, ["rol:read"]);

    let linhas = await montarLinhasSecretario(ctx);
    if (search) {
      const t = search.toLowerCase();
      linhas = linhas.filter(
        (l) =>
          (l.entidade.nomeCompleto ?? "").toLowerCase().includes(t) ||
          (l.entidade.whatsapp ?? "").includes(t)
      );
    }
    linhas.sort((a, b) =>
      (a.entidade.nomeCompleto ?? "").localeCompare(b.entidade.nomeCompleto ?? "")
    );
    return linhas;
  },
});

/**
 * Contagens para o dashboard do secretario (sobre toda a base, sem busca).
 * A pagina do Rol nao assina mais esta query — deriva o resumo no cliente via
 * calcularResumoSecretario sobre as linhas de listParaSecretario. Mantida
 * para compatibilidade (clientes antigos) e testes.
 */
export const getResumoSecretario = query({
  args: {},
  handler: async (ctx): Promise<ResumoSecretarioT> => {
    await requireAnyPermission(ctx, ["rol:read"]);
    return calcularResumoSecretario(await montarLinhasSecretario(ctx));
  },
});

const FIELD_LABELS: Record<string, string> = {
  cargoEclesiastico: "Cargo eclesiastico",
  rol: "Rol",
  tipoRolOverride: "Tipo de rol",
  numeroMatricula: "Matricula",
  dataConversao: "Data de conversao",
  dataBatismo: "Data de batismo",
  dataMembresia: "Membresia",
  formaAdmissao: "Forma de admissao",
  igrejaProcedencia: "Igreja de procedencia",
  observacoesPastorais: "Observacoes pastorais",
  formaDemissao: "Forma de demissao",
  dataDemissao: "Data de demissao",
  igrejaDestino: "Igreja destino",
  dataFalecimento: "Data de falecimento",
  cartaTransferencia: "Carta de transferencia",
  motivoDemissao: "Motivo da exclusao",
  motivoDemissaoObs: "Observacao do motivo",
};

type HistoricoItem = {
  id: string;
  field: string;
  label: string;
  de: string | null;
  para: string | null;
  em: number;
  autor: string | null;
};

/**
 * Historico de alteracoes eclesiasticas de um membro (FIELD_CHANGE no
 * auditLog), para revisao e reversao de ajustes acidentais.
 */
export const getHistorico = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }): Promise<HistoricoItem[]> => {
    await requireAnyPermission(ctx, ["rol:read"]);

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_referencia", (q) =>
        q.eq("referenciaTabela", "membros").eq("referenciaId", membroId)
      )
      .order("desc")
      .take(200);

    const eclesi = logs.filter(
      (l) => l.action === "FIELD_CHANGE" && l.field && ECLESIASTICO_FIELDS.has(l.field)
    );

    const out: HistoricoItem[] = [];
    const nomeCache = new Map<string, string | null>();
    for (const l of eclesi) {
      let autor: string | null = null;
      if (l.membroId) {
        const key = l.membroId as string;
        if (nomeCache.has(key)) {
          autor = nomeCache.get(key) ?? null;
        } else {
          const a = await ctx.db.get(l.membroId);
          const e = a ? await ctx.db.get(a.entidadeId) : null;
          autor = e?.nomeCompleto ?? null;
          nomeCache.set(key, autor);
        }
      }
      const de = l.from === undefined || l.from === null ? null : String(l.from);
      const para = l.to === undefined || l.to === null ? null : String(l.to);
      out.push({
        id: l._id,
        field: l.field as string,
        label: FIELD_LABELS[l.field as string] ?? (l.field as string),
        de,
        para,
        em: l.createdAt,
        autor,
      });
    }
    return out;
  },
});

/**
 * Promove um dependente (entidade sem membro) a membro, criando o registro
 * de `membros` e atualizando o vinculo da entidade. Habilita a edicao dos
 * campos eclesiasticos dele na tabela.
 */
export const tornarMembro = mutation({
  args: { entidadeId: v.id("entidades") },
  handler: async (ctx, { entidadeId }) => {
    await requireAnyPermission(ctx, [
      "rol:update",
      "membros:update",
    ]);

    const entidade = await ctx.db.get(entidadeId);
    if (!entidade) throw new Error("Entidade nao encontrada");

    const existente = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
      .first();
    if (existente) return { membroId: existente._id, jaEra: true };

    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: "membro",
      cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
    });

    // Se alguem ja apontava esta pessoa como conjuge (vinculo criado quando
    // ela ainda nao era membro), espelha agora.
    const apontante = (await ctx.db.query("membros").collect()).find(
      (m) => m.conjugeId === entidadeId,
    );
    if (apontante) {
      await ctx.db.patch(membroId, { conjugeId: apontante.entidadeId });
    }

    // Promocao a membro: `papeis` nao marca pessoa (so PJ), entao basta setar
    // `vinculoIgreja`. Ser membro vem da linha em `membros`.
    await ctx.db.patch(entidadeId, { vinculoIgreja: "MEMBRO" });

    await createActionAuditLog(ctx, "CREATE", "membros", membroId);

    return { membroId, jaEra: false };
  },
});

/**
 * Atualiza o status da entidade (ATIVO/INATIVO/TRANSFERIDO/DESLIGADO/FALECIDO).
 * Afeta a categoria de rol derivada (ATIVO -> Principal/Separado; demais ->
 * Arquivo/Ausente) e o bloqueio de login. Audita a mudanca.
 */
export const updateStatus = mutation({
  args: {
    entidadeId: v.id("entidades"),
    status: v.union(
      v.literal("ATIVO"),
      v.literal("INATIVO"),
      v.literal("TRANSFERIDO"),
      v.literal("DESLIGADO"),
      v.literal("FALECIDO")
    ),
  },
  handler: async (ctx, { entidadeId, status }) => {
    await requireAnyPermission(ctx, [
      "rol:update",
      "membros:update",
    ]);
    const entidade = await ctx.db.get(entidadeId);
    if (!entidade) throw new Error("Entidade nao encontrada");
    if (entidade.status === status) return { changed: false };

    const old = { ...entidade };
    await ctx.db.patch(entidadeId, { status });
    const novo = await ctx.db.get(entidadeId);
    await createFieldAuditLogs(ctx, old, novo, "entidades", entidadeId);
    return { changed: true };
  },
});

// ============ VINCULOS DE FAMILIA (admin / secretario) ============

const PERM_FAMILIA = ["rol:update", "membros:update"];

// Deriva o tipo de responsavel (PAI/MAE/RESPONSAVEL) pelo sexo da entidade.
function tipoResponsavelPorSexo(
  sexo: "M" | "F" | undefined,
): "PAI" | "MAE" | "RESPONSAVEL" {
  return sexo === "M" ? "PAI" : sexo === "F" ? "MAE" : "RESPONSAVEL";
}

// buscarEntidadesFamilia foi movida para convex/membros/familia.ts (modulo
// pequeno) — o useQuery sobre este modulo grande estoura o limite de tipos (TS2589).

export const vincularConjugeAdmin = mutation({
  args: { membroId: v.id("membros"), conjugeEntidadeId: v.id("entidades") },
  handler: async (ctx, { membroId, conjugeEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    if (membro.entidadeId === conjugeEntidadeId) {
      throw new Error("Nao e possivel vincular a propria pessoa");
    }
    const conjuge = await ctx.db.get(conjugeEntidadeId);
    if (!conjuge) throw new Error("Conjuge nao encontrado");
    if (conjuge.tipoEntidade !== "PF") {
      throw new Error("So e possivel vincular pessoas fisicas");
    }

    // O alvo ja esta casado? (membro dele com conjugeId, ou alguem apontando
    // para ele via by_conjuge). Sem isso, espelharConjuge pula o espelho e cria
    // um vinculo assimetrico (A->B, B->C).
    const conjugeMembro = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", conjugeEntidadeId))
      .first();
    if (conjugeMembro?.conjugeId && conjugeMembro.conjugeId !== membro.entidadeId) {
      throw new Error("Essa pessoa ja tem conjuge vinculado");
    }
    const apontam = await ctx.db
      .query("membros")
      .withIndex("by_conjuge", (q) => q.eq("conjugeId", conjugeEntidadeId))
      .collect();
    if (apontam.some((m) => m.entidadeId !== membro.entidadeId)) {
      throw new Error("Essa pessoa ja tem conjuge vinculado");
    }

    await ctx.db.patch(membroId, { conjugeId: conjugeEntidadeId });
    await espelharConjuge(ctx, membro.entidadeId, conjugeEntidadeId);
    await createActionAuditLog(ctx, "VINCULO_CONJUGE", "membros", membroId);
    return { ok: true };
  },
});

export const desvincularConjugeAdmin = mutation({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    await ctx.db.patch(membroId, { conjugeId: undefined });
    // Limpa TODOS os ponteiros reversos para esta entidade (nao so o conjuge
    // atual): senao redeFamiliar ainda mostra o casamento pelo lado reverso.
    const apontam = await ctx.db
      .query("membros")
      .withIndex("by_conjuge", (q) => q.eq("conjugeId", membro.entidadeId))
      .collect();
    for (const outro of apontam) {
      await ctx.db.patch(outro._id, { conjugeId: undefined });
    }
    await createActionAuditLog(ctx, "DESVINCULO_CONJUGE", "membros", membroId);
    return { ok: true };
  },
});

export const adicionarFilhoAdmin = mutation({
  args: {
    responsavelMembroId: v.id("membros"),
    nomeCompleto: v.string(),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
    // Batismo infantil (em qualquer igreja crista) -> membro nao-comungante
    // (IPB Const.: nao-comungantes sao batizados na infancia sem profissao de fe)
    batismoInfantil: v.optional(v.boolean()),
    dataBatismo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const responsavel = await ctx.db.get(args.responsavelMembroId);
    if (!responsavel) throw new Error("Responsavel nao encontrado");
    const respEntidade = await ctx.db.get(responsavel.entidadeId);
    if (!respEntidade) throw new Error("Entidade do responsavel nao encontrada");

    const filhoEntidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: [],
      status: "ATIVO",
      nomeCompleto: args.nomeCompleto,
      dataNascimento: args.dataNascimento,
      sexo: args.sexo,
      vinculoIgreja: args.batismoInfantil ? "MEMBRO" : "NAO_MEMBRO",
      perfilAtualizadoEm: Date.now(),
    });

    if (args.batismoInfantil) {
      await ctx.db.insert("membros", {
        entidadeId: filhoEntidadeId,
        role: "membro",
        cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
        dataBatismo: args.dataBatismo || undefined,
      });
    }

    await ctx.db.insert("responsaveis", {
      criancaEntidadeId: filhoEntidadeId,
      responsavelEntidadeId: responsavel.entidadeId,
      tipo: tipoResponsavelPorSexo(respEntidade.sexo),
      principal: true,
      criadoEm: Date.now(),
    });
    // Filho pertence ao casal: vincula tambem ao conjuge, se houver
    await vincularCriancaAoConjuge(ctx, responsavel.entidadeId, filhoEntidadeId);
    await createActionAuditLog(ctx, "VINCULO_PAI_FILHO", "responsaveis", filhoEntidadeId);
    return { filhoEntidadeId };
  },
});

export const vincularFilhoExistenteAdmin = mutation({
  args: { responsavelMembroId: v.id("membros"), filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { responsavelMembroId, filhoEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const responsavel = await ctx.db.get(responsavelMembroId);
    if (!responsavel) throw new Error("Responsavel nao encontrado");
    if (filhoEntidadeId === responsavel.entidadeId) {
      throw new Error("Nao e possivel vincular como proprio filho");
    }
    const filhoEnt = await ctx.db.get(filhoEntidadeId);
    if (!filhoEnt) throw new Error("Pessoa nao encontrada");
    if (filhoEnt.tipoEntidade !== "PF") {
      throw new Error("So e possivel vincular pessoas fisicas");
    }
    const existente = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    if (existente.some((r) => r.responsavelEntidadeId === responsavel.entidadeId)) {
      return { ok: true, jaVinculado: true };
    }
    const respEntidade = await ctx.db.get(responsavel.entidadeId);
    await ctx.db.insert("responsaveis", {
      criancaEntidadeId: filhoEntidadeId,
      responsavelEntidadeId: responsavel.entidadeId,
      tipo: tipoResponsavelPorSexo(respEntidade?.sexo),
      principal: false,
      criadoEm: Date.now(),
    });
    // Filho pertence ao casal: vincula tambem ao conjuge, se houver
    await vincularCriancaAoConjuge(ctx, responsavel.entidadeId, filhoEntidadeId);
    await createActionAuditLog(ctx, "VINCULO_PAI_FILHO", "responsaveis", filhoEntidadeId);
    return { ok: true };
  },
});

export const removerFilhoAdmin = mutation({
  args: { responsavelMembroId: v.id("membros"), filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { responsavelMembroId, filhoEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const responsavel = await ctx.db.get(responsavelMembroId);
    if (!responsavel) throw new Error("Responsavel nao encontrado");
    const links = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    for (const link of links) {
      if (link.responsavelEntidadeId === responsavel.entidadeId) {
        await ctx.db.delete(link._id);
      }
    }
    await createActionAuditLog(ctx, "DESVINCULO_PAI_FILHO", "responsaveis", filhoEntidadeId);
    return { ok: true };
  },
});

// Vincula um parente EXISTENTE ao foco. Unificada (pai/mae + irmao) para nao
// inflar o `api` (cada funcao publica pesa no limite de tipos do TS — TS2589).
// - "pai": outraEntidadeId vira pai/mae do foco (rejeita ciclo).
// - "irmao": copia os pais PAI/MAE do foco para outraEntidadeId (compartilham
//   os mesmos pais — nao ha vinculo de irmao no modelo).
export const vincularParenteAdmin = mutation({
  args: {
    parentesco: v.union(v.literal("pai"), v.literal("irmao")),
    focoEntidadeId: v.id("entidades"),
    outraEntidadeId: v.id("entidades"),
  },
  handler: async (ctx, { parentesco, focoEntidadeId, outraEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    if (focoEntidadeId === outraEntidadeId) {
      throw new Error("Nao e possivel vincular a propria pessoa");
    }
    const [foco, outra] = await Promise.all([
      ctx.db.get(focoEntidadeId),
      ctx.db.get(outraEntidadeId),
    ]);
    if (!foco) throw new Error("Pessoa nao encontrada");
    if (!outra) throw new Error("Pessoa nao encontrada");
    if (foco.tipoEntidade !== "PF" || outra.tipoEntidade !== "PF") {
      throw new Error("So e possivel vincular pessoas fisicas");
    }

    if (parentesco === "pai") {
      // outra = pai/mae do foco. Ciclo: o pai nao pode ser descendente do foco.
      const visitados = new Set<string>([focoEntidadeId]);
      let fronteira: string[] = [focoEntidadeId];
      for (let nivel = 0; nivel < 20 && fronteira.length > 0; nivel++) {
        const proximos: string[] = [];
        for (const ent of fronteira) {
          const filhosDele = await ctx.db
            .query("responsaveis")
            .withIndex("by_responsavel", (q) => q.eq("responsavelEntidadeId", ent as Id<"entidades">))
            .collect();
          for (const r of filhosDele) {
            const c = r.criancaEntidadeId as string;
            if (c === outraEntidadeId) {
              throw new Error("Vinculo invalido: geraria um ciclo na arvore");
            }
            if (!visitados.has(c)) {
              visitados.add(c);
              proximos.push(c);
            }
          }
        }
        fronteira = proximos;
      }

      const existentes = await ctx.db
        .query("responsaveis")
        .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", focoEntidadeId))
        .collect();
      if (existentes.some((r) => r.responsavelEntidadeId === outraEntidadeId)) {
        return { ok: true, jaVinculado: true };
      }
      await ctx.db.insert("responsaveis", {
        criancaEntidadeId: focoEntidadeId,
        responsavelEntidadeId: outraEntidadeId,
        tipo: tipoResponsavelPorSexo(outra.sexo),
        principal: false,
        criadoEm: Date.now(),
      });
      await createActionAuditLog(ctx, "VINCULO_PAI_FILHO", "responsaveis", focoEntidadeId);
      return { ok: true };
    }

    // parentesco === "irmao": copia os pais PAI/MAE do foco para a outra pessoa.
    const paisRef = (
      await ctx.db
        .query("responsaveis")
        .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", focoEntidadeId))
        .collect()
    ).filter((r) => r.tipo === "PAI" || r.tipo === "MAE");
    if (paisRef.length === 0) {
      throw new Error("Cadastre o pai/mae desta pessoa antes de vincular um irmao");
    }
    const idsPaisRef = new Set(paisRef.map((r) => r.responsavelEntidadeId as string));

    // Meio-irmao silencioso: se a outra pessoa ja tem pais PROPRIOS fora do
    // conjunto, bloquear (evita virar filho de 3-4 responsaveis sem querer).
    const paisOutra = (
      await ctx.db
        .query("responsaveis")
        .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", outraEntidadeId))
        .collect()
    ).filter((r) => r.tipo === "PAI" || r.tipo === "MAE");
    if (paisOutra.some((r) => !idsPaisRef.has(r.responsavelEntidadeId as string))) {
      throw new Error("Essa pessoa ja tem outro pai/mae cadastrado");
    }

    let inseridos = 0;
    for (const ref of paisRef) {
      // Rele a cada iteracao para nao duplicar.
      const atuais = await ctx.db
        .query("responsaveis")
        .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", outraEntidadeId))
        .collect();
      if (atuais.some((r) => r.responsavelEntidadeId === ref.responsavelEntidadeId)) {
        continue;
      }
      const pai = await ctx.db.get(ref.responsavelEntidadeId);
      await ctx.db.insert("responsaveis", {
        criancaEntidadeId: outraEntidadeId,
        responsavelEntidadeId: ref.responsavelEntidadeId,
        tipo: tipoResponsavelPorSexo(pai?.sexo),
        principal: false,
        criadoEm: Date.now(),
      });
      inseridos++;
    }
    await createActionAuditLog(ctx, "VINCULO_IRMAO", "responsaveis", outraEntidadeId);
    return { ok: true, inseridos };
  },
});

