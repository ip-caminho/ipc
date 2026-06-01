import { mutation, query } from "../_generated/server";
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

    const normalized = normalizeToE164(telefone);
    const variants = [
      normalized,
      normalized.replace(/^\+55/, ""),
      normalized.replace(/^\+/, ""),
    ];

    const entidades = await ctx.db.query("entidades").collect();
    const entidade = entidades.find(
      (e) => e.whatsapp && variants.includes(e.whatsapp)
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
