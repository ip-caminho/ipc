import { invalidateSessions, modifyAccountCredentials } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  action,
  internalMutation,
  mutation,
  type MutationCtx,
} from "../_generated/server";
import { normalizeToE164 } from "../_shared/phoneUtils";

const MAX_FALHAS = 5;
const JANELA_FALHAS_MS = 60 * 60 * 1000;
const VALIDADE_TOKEN_MS = 15 * 60 * 1000;
const SENHA_MIN = 8;
const SENHA_MAX = 128;
const LOTE_LIMPEZA = 500;

type ContaConsumida = {
  userId: Id<"users">;
  membroId: Id<"membros">;
  contaId: Id<"authAccounts">;
  loginId: string;
};

// Referencias por string: evita TS2589 (profundidade da arvore `internal`).
const refConsumirToken = makeFunctionReference<
  "mutation",
  { token: string },
  ContaConsumida | null
>("membros/recuperarSenha:consumirToken");
const refRegistrarTrocaSenha = makeFunctionReference<
  "mutation",
  Omit<ContaConsumida, "loginId">
>("membros/recuperarSenha:registrarTrocaSenha");
const refLimparExpirados = makeFunctionReference<"mutation", Record<string, never>>(
  "membros/recuperarSenha:limparExpirados"
);

const soDigitos = (valor: string) => valor.replace(/\D/g, "");
const telefoneDigitos = (valor?: string) =>
  valor ? soDigitos(normalizeToE164(valor)) : "";

function gerarToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Evita guardar o telefone em claro na tabela de tentativas. */
async function chaveDeTentativa(telefone: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(telefone)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Aceita AAAA-MM-DD (com ou sem hora) e DD/MM/AAAA, formatos existentes no cadastro. */
function normalizarData(valor?: string): string | null {
  if (!valor) return null;
  const texto = valor.trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function cpfComMascara(cpf: string): string {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** Voluntarios recebem poder via membro.permissions, mesmo com papel "membro". */
function temPoderAlemDeMembro(membro: Doc<"membros">): boolean {
  return membro.role !== "membro" || (membro.permissions?.length ?? 0) > 0;
}

async function encontrarEntidade(
  ctx: MutationCtx,
  cpf: string,
  telefone: string,
  dataNascimento: string | null
): Promise<Doc<"entidades"> | null> {
  if (cpf.length !== 11 || !telefone || !dataNascimento) return null;

  const candidatas: Doc<"entidades">[] = [];
  for (const formato of [cpf, cpfComMascara(cpf)]) {
    const encontradas = await ctx.db
      .query("entidades")
      .withIndex("by_cpf", (q) => q.eq("cpf", formato))
      .take(5);
    candidatas.push(...encontradas);
  }

  const conferem = candidatas.filter(
    (e) =>
      (telefoneDigitos(e.whatsapp) === telefone ||
        telefoneDigitos(e.telefone) === telefone) &&
      normalizarData(e.dataNascimento) === dataNascimento
  );
  return conferem.find((e) => e.status === "ATIVO") ?? conferem[0] ?? null;
}

type ResultadoSolicitacao =
  | { status: "ok"; token: string }
  | {
      status:
        | "nao_confere"
        | "bloqueado"
        | "procure_secretaria"
        | "primeiro_acesso"
        | "procure_admin";
    };

/**
 * Confere os dados do cadastro e abre um pedido de troca de senha.
 * Retorna status em vez de lancar: um throw desfaria a gravacao da falha.
 */
export const solicitarRecuperacao = mutation({
  args: {
    telefone: v.string(),
    cpf: v.string(),
    dataNascimento: v.string(),
  },
  handler: async (ctx, args): Promise<ResultadoSolicitacao> => {
    const telefone = telefoneDigitos(args.telefone);
    const cpf = soDigitos(args.cpf);
    const agora = Date.now();

    // Conta por telefone e por CPF: com uma chave so, variar o outro dado
    // renovaria as tentativas a cada chute.
    const contadores = await Promise.all(
      [`telefone:${telefone}`, `cpf:${cpf}`].map(async (origem) => {
        const chave = await chaveDeTentativa(origem);
        const tentativa = await ctx.db
          .query("recuperacaoTentativas")
          .withIndex("by_chave", (q) => q.eq("chave", chave))
          .unique();
        const janelaAberta =
          tentativa !== null && agora - tentativa.janelaInicio < JANELA_FALHAS_MS;
        return { chave, tentativa, janelaAberta };
      })
    );
    if (
      contadores.some(
        (c) => c.janelaAberta && c.tentativa !== null && c.tentativa.falhas >= MAX_FALHAS
      )
    ) {
      return { status: "bloqueado" };
    }

    const entidade = await encontrarEntidade(
      ctx,
      cpf,
      telefone,
      normalizarData(args.dataNascimento)
    );
    const membro = entidade
      ? await ctx.db
          .query("membros")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
          .first()
      : null;

    if (!entidade || !membro) {
      for (const { chave, tentativa, janelaAberta } of contadores) {
        if (!tentativa) {
          await ctx.db.insert("recuperacaoTentativas", {
            chave,
            falhas: 1,
            janelaInicio: agora,
          });
        } else if (janelaAberta) {
          await ctx.db.patch(tentativa._id, { falhas: tentativa.falhas + 1 });
        } else {
          await ctx.db.patch(tentativa._id, { falhas: 1, janelaInicio: agora });
        }
      }
      return { status: "nao_confere" };
    }

    for (const { tentativa } of contadores) {
      if (tentativa) await ctx.db.delete(tentativa._id);
    }

    if (entidade.status !== "ATIVO") return { status: "procure_secretaria" };
    if (!membro.userId) return { status: "primeiro_acesso" };
    if (temPoderAlemDeMembro(membro)) return { status: "procure_admin" };

    const anteriores = await ctx.db
      .query("recuperacoesSenha")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();
    for (const anterior of anteriores) {
      await ctx.db.delete(anterior._id);
    }

    const token = gerarToken();
    await ctx.db.insert("recuperacoesSenha", {
      token,
      membroId: membro._id,
      expiraEm: agora + VALIDADE_TOKEN_MS,
    });
    return { status: "ok", token };
  },
});

/** Invalida o pedido e devolve a conta a alterar. Uso unico. */
export const consumirToken = internalMutation({
  args: { token: v.string() },
  handler: async (
    ctx,
    { token }
  ): Promise<ContaConsumida | null> => {
    const pedido = await ctx.db
      .query("recuperacoesSenha")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!pedido || pedido.usadoEm || pedido.expiraEm < Date.now()) return null;

    await ctx.db.patch(pedido._id, { usadoEm: Date.now() });

    const membro = await ctx.db.get(pedido.membroId);
    if (!membro?.userId || temPoderAlemDeMembro(membro)) return null;
    const userId = membro.userId;

    const entidade = await ctx.db.get(membro.entidadeId);
    if (entidade?.status !== "ATIVO") return null;

    const conta = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password")
      )
      .unique();
    if (!conta) return null;

    return {
      userId,
      membroId: membro._id,
      contaId: conta._id,
      loginId: conta.providerAccountId,
    };
  },
});

/** Roda so depois que a senha mudou, para o historico refletir o que ocorreu. */
export const registrarTrocaSenha = internalMutation({
  args: {
    userId: v.id("users"),
    membroId: v.id("membros"),
    contaId: v.id("authAccounts"),
  },
  handler: async (ctx, { userId, membroId, contaId }): Promise<void> => {
    // Sem isso, quem errou a senha varias vezes seguiria bloqueado com a nova
    const limite = await ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (q) => q.eq("identifier", contaId))
      .unique();
    if (limite) await ctx.db.delete(limite._id);

    await ctx.db.insert("auditLogs", {
      action: "PASSWORD_RESET",
      referenciaTabela: "auth",
      referenciaId: userId,
      userId,
      membroId,
      createdAt: Date.now(),
    });
  },
});

/** Rotina diaria: a rota e publica, entao as tabelas nao podem crescer sem limite. */
export const limparExpirados = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const agora = Date.now();
    const tentativas = await ctx.db
      .query("recuperacaoTentativas")
      .withIndex("by_janela", (q) => q.lt("janelaInicio", agora - JANELA_FALHAS_MS))
      .take(LOTE_LIMPEZA);
    const pedidos = await ctx.db
      .query("recuperacoesSenha")
      .withIndex("by_expira", (q) => q.lt("expiraEm", agora))
      .take(LOTE_LIMPEZA);

    for (const registro of [...tentativas, ...pedidos]) {
      await ctx.db.delete(registro._id);
    }

    if (tentativas.length === LOTE_LIMPEZA || pedidos.length === LOTE_LIMPEZA) {
      await ctx.scheduler.runAfter(0, refLimparExpirados, {});
    }
  },
});

type ResultadoRedefinicao =
  | { status: "ok"; loginId: string }
  | { status: "senha_invalida" | "expirado" };

export const redefinirSenha = action({
  args: { token: v.string(), novaSenha: v.string() },
  handler: async (
    ctx,
    { token, novaSenha }
  ): Promise<ResultadoRedefinicao> => {
    // Antes de consumir o token, para a pessoa poder corrigir a senha
    if (novaSenha.length < SENHA_MIN || novaSenha.length > SENHA_MAX) {
      return { status: "senha_invalida" };
    }

    const conta = await ctx.runMutation(refConsumirToken, { token });
    if (!conta) return { status: "expirado" };

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: conta.loginId, secret: novaSenha },
    });
    await ctx.runMutation(refRegistrarTrocaSenha, {
      userId: conta.userId,
      membroId: conta.membroId,
      contaId: conta.contaId,
    });
    await invalidateSessions(ctx, { userId: conta.userId });

    return { status: "ok", loginId: conta.loginId };
  },
});
