import { mutation, query, type QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission } from "../_shared/requirePermission";
import { normalizeToE164 } from "../messaging/phoneUtils";
import type { Doc } from "../_generated/dataModel";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;
const TRINTA_MIN_MS = 30 * 60 * 1000;

/**
 * Identificador interno usado no Password provider, derivado do telefone.
 * Precisa bater com a derivacao do client (loginIdFromPhone em
 * shared/lib/acesso.ts) — ambos usam normalizeToE164.
 */
function loginIdFromPhone(phone: string): string {
  return `${normalizeToE164(phone).replace(/\D/g, "")}@membro.local`;
}

function gerarToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Telefone preferencial do membro (whatsapp, senao telefone fixo). */
function telefoneDoMembro(entidade: Doc<"entidades">): string | null {
  return entidade.whatsapp || entidade.telefone || null;
}

/**
 * Admin gera um link de acesso para um membro JA cadastrado.
 * O link leva a /ativar/<token>, onde a pessoa cria a senha.
 */
export const gerarLink = mutation({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    const { membro: caller } = await requirePermission(ctx, "membros:update");

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade) throw new Error("Entidade nao encontrada");
    if (entidade.status !== "ATIVO") {
      throw new Error("Membro nao esta ATIVO — acesso bloqueado");
    }
    if (!telefoneDoMembro(entidade)) {
      throw new Error("Membro sem telefone/WhatsApp cadastrado");
    }

    // Expira tokens PENDENTE anteriores do mesmo membro (apenas um link valido)
    const anteriores = await ctx.db
      .query("membroConvites")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    for (const c of anteriores) {
      if (c.status === "PENDENTE") {
        await ctx.db.patch(c._id, { status: "EXPIRADO" });
      }
    }

    const token = gerarToken();
    await ctx.db.insert("membroConvites", {
      token,
      status: "PENDENTE",
      criadoPor: caller._id,
      expiraEm: Date.now() + SETE_DIAS_MS,
      membroId,
      origem: "link",
    });

    return { token };
  },
});

/**
 * Login direto (primeiro acesso): a pessoa prova identidade com
 * telefone + 5 primeiros digitos do CPF. Se bater, gera um token de
 * ativacao curto e retorna — o client redireciona para /ativar/<token>.
 */
export const verificarAcessoDireto = mutation({
  args: { telefone: v.string(), cpfPrefix: v.string() },
  handler: async (ctx, { telefone, cpfPrefix }) => {
    const prefix = cpfPrefix.replace(/\D/g, "");
    if (prefix.length !== 5) {
      throw new Error("Informe os 5 primeiros digitos do CPF");
    }

    // Compara so os digitos (E164) dos dois lados: robusto a formatacao
    // (ex: "(11) 94208-8102" no cadastro vs "11942088102" digitado).
    // Casa contra whatsapp OU telefone fixo (o numero pode estar em qualquer um).
    const alvoDigits = normalizeToE164(telefone).replace(/\D/g, "");
    const soDigitos = (v?: string) => (v ? normalizeToE164(v).replace(/\D/g, "") : "");

    const entidades = await ctx.db.query("entidades").collect();
    const entidade = entidades.find(
      (e) =>
        soDigitos(e.whatsapp) === alvoDigits || soDigitos(e.telefone) === alvoDigits
    );

    // Mensagem generica para nao revelar se o telefone existe
    const erroGenerico = "Telefone ou CPF nao conferem";
    if (!entidade) throw new Error(erroGenerico);

    const cpfDigits = (entidade.cpf || "").replace(/\D/g, "");
    if (!cpfDigits || cpfDigits.slice(0, 5) !== prefix) {
      throw new Error(erroGenerico);
    }
    if (entidade.status !== "ATIVO") {
      throw new Error("Cadastro nao esta ativo. Procure a secretaria.");
    }

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
      .first();
    if (!membro) throw new Error(erroGenerico);

    if (membro.userId) {
      throw new Error("Acesso ja ativado. Entre com sua senha.");
    }

    const token = gerarToken();
    await ctx.db.insert("membroConvites", {
      token,
      status: "PENDENTE",
      expiraEm: Date.now() + TRINTA_MIN_MS,
      membroId: membro._id,
      origem: "direto",
    });

    return { token };
  },
});

/** Dados publicos para a pagina de ativacao (so o necessario). */
export const getAtivacaoByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const convite = await ctx.db
      .query("membroConvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!convite || !convite.membroId) return { status: "invalido" as const };
    if (convite.status !== "PENDENTE" || convite.expiraEm < Date.now()) {
      return { status: "expirado" as const };
    }

    const membro = await ctx.db.get(convite.membroId);
    if (!membro) return { status: "invalido" as const };
    if (membro.userId) return { status: "ja_ativado" as const };

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade) return { status: "invalido" as const };
    if (entidade.status !== "ATIVO") return { status: "invalido" as const };

    const phone = telefoneDoMembro(entidade);
    if (!phone) return { status: "invalido" as const };

    return {
      status: "valido" as const,
      nome: entidade.nomeCompleto || "",
      loginId: loginIdFromPhone(phone),
    };
  },
});

/**
 * Conclui a ativacao apos o signUp client-side: vincula o userId recem
 * criado ao membro existente e forca o wizard de confirmacao de dados.
 */
export const concluirAtivacao = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Nao autenticado");

    const convite = await ctx.db
      .query("membroConvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!convite || !convite.membroId) throw new Error("Token invalido");
    if (convite.status !== "PENDENTE" || convite.expiraEm < Date.now()) {
      throw new Error("Token expirado");
    }

    const membro = await ctx.db.get(convite.membroId);
    if (!membro) throw new Error("Membro nao encontrado");

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade || entidade.status !== "ATIVO") {
      throw new Error("Cadastro nao esta ativo");
    }

    // userId ja vinculado a outro membro?
    const jaVinculado = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (jaVinculado && jaVinculado._id !== membro._id) {
      throw new Error("Usuario ja vinculado a outro membro");
    }
    if (membro.userId && membro.userId !== userId) {
      throw new Error("Membro ja vinculado a outro usuario");
    }

    await ctx.db.patch(membro._id, {
      userId,
      onboardingCompleto: false, // forca confirmacao de dados em /bem-vindo
    });
    await ctx.db.patch(convite._id, {
      status: "ACEITO",
      dadosPreenchidos: { membroId: membro._id, origem: convite.origem },
    });

    return { ok: true, membroId: membro._id };
  },
});

/** Status de acesso de um membro, para o painel admin. */
export const getStatusAcesso = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requirePermission(ctx, "membros:read");

    const membro = await ctx.db.get(membroId);
    if (!membro) return null;
    const entidade = await ctx.db.get(membro.entidadeId);

    const convites = await ctx.db
      .query("membroConvites")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const pendente = convites.find(
      (c) => c.status === "PENDENTE" && c.expiraEm >= Date.now()
    );

    return {
      ativado: !!membro.userId,
      onboardingCompleto: membro.onboardingCompleto ?? false,
      temLinkPendente: !!pendente,
      whatsapp: entidade?.whatsapp || entidade?.telefone || null,
      nome: entidade?.nomeCompleto || "",
    };
  },
});

/** Ultimo login (LOGIN no auditLogs) de um membro, via indice by_membro. */
async function ultimoLogin(
  ctx: QueryCtx,
  membroId: Doc<"membros">["_id"]
): Promise<{ em: number; metodo: string | null } | null> {
  const logs = await ctx.db
    .query("auditLogs")
    .withIndex("by_membro", (q) => q.eq("membroId", membroId))
    .order("desc")
    .take(50);
  const login = logs.find((l) => l.action === "LOGIN");
  if (!login) return null;
  return { em: login.createdAt, metodo: (login.to as string) ?? null };
}

type AcessoRow = {
  membroId: Doc<"membros">["_id"];
  nome: string;
  whatsapp: string | null;
  ativado: boolean;
  onboardingCompleto: boolean;
  temLinkPendente: boolean;
  metodoAtivacao: "link" | "direto" | null;
  ultimoAcessoEm: number | null;
};

type AcessosOverview = {
  rows: AcessoRow[];
  resumo: {
    total: number;
    ativados: number;
    pendentes: number;
    semAcesso: number;
    adesao: number;
  };
};

/**
 * Visao geral de acesso dos membros ATIVOS, para o painel admin:
 * status, metodo de ativacao, ultimo acesso + contagens-resumo.
 */
export const getAcessosOverview = query({
  args: {},
  handler: async (ctx): Promise<AcessosOverview> => {
    await requirePermission(ctx, "membros:read");

    const membros = await ctx.db.query("membros").collect();
    const rows: AcessoRow[] = [];

    for (const membro of membros) {
      const entidade = await ctx.db.get(membro.entidadeId);
      if (!entidade || entidade.status !== "ATIVO") continue;

      const convites = await ctx.db
        .query("membroConvites")
        .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
        .collect();
      const pendente = convites.find(
        (c) => c.status === "PENDENTE" && c.expiraEm >= Date.now()
      );
      const aceito = convites.find((c) => c.status === "ACEITO");
      const login = await ultimoLogin(ctx, membro._id);

      rows.push({
        membroId: membro._id,
        nome: entidade.nomeCompleto || "",
        whatsapp: entidade.whatsapp || entidade.telefone || null,
        ativado: !!membro.userId,
        onboardingCompleto: membro.onboardingCompleto ?? false,
        temLinkPendente: !!pendente,
        metodoAtivacao: aceito?.origem ?? null,
        ultimoAcessoEm: login?.em ?? null,
      });
    }

    rows.sort((a, b) => a.nome.localeCompare(b.nome));

    const total = rows.length;
    const ativados = rows.filter((r) => r.ativado).length;
    const pendentes = rows.filter((r) => !r.ativado && r.temLinkPendente).length;
    const semAcesso = rows.filter((r) => !r.ativado && !r.temLinkPendente).length;

    return {
      rows,
      resumo: {
        total,
        ativados,
        pendentes,
        semAcesso,
        adesao: total > 0 ? Math.round((ativados / total) * 100) : 0,
      },
    };
  },
});

// Acoes relevantes para o historico de atividade (evita ruido interno)
const ACOES_HISTORICO = ["LOGIN", "CREATE", "FIELD_CHANGE", "DELETE"];

type AtividadeItem = {
  id: Doc<"auditLogs">["_id"];
  action: string;
  tabela: string;
  field: string | null;
  valor: string | null;
  em: number;
};

/** Historico de atividade de um membro (logins + acoes principais). */
export const getAtividadeMembro = query({
  args: { membroId: v.id("membros"), limit: v.optional(v.number()) },
  handler: async (ctx, { membroId, limit }): Promise<AtividadeItem[]> => {
    await requirePermission(ctx, "membros:read");

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .order("desc")
      .take(Math.min(limit ?? 30, 100));

    return logs
      .filter((l) => ACOES_HISTORICO.includes(l.action))
      .map((l) => ({
        id: l._id,
        action: l.action,
        tabela: l.referenciaTabela,
        field: l.field ?? null,
        valor: l.action === "LOGIN" ? ((l.to as string) ?? null) : null,
        em: l.createdAt,
      }));
  },
});
