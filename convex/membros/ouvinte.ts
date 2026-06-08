/**
 * Acesso "ouvinte": cria/gerencia usuarios externos (nao-membros) que so
 * ouvem as gravacoes. Ver ouvinteHelpers.ts para a regra de exclusao do Rol.
 *
 * Fluxo: admin cria ouvinte (nome + whatsapp) -> gera link de acesso
 * (membros/acesso.gerarLink) -> pessoa cria senha em /ativar/<token>.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog } from "../_shared/auditHelpers";
import {
  OUVINTE_ROLE,
  OUVINTE_VINCULO,
  ehOuvinte,
  fimDoAnoMs,
  ouvinteExpirado,
  ouvinteExpiraEmBreve,
} from "./ouvinteHelpers";

/** Cria um ouvinte (entidade nao-membro + membro role ouvinte) atomicamente. */
export const criarOuvinte = mutation({
  args: {
    nome: v.string(),
    whatsapp: v.string(),
  },
  handler: async (ctx, { nome, whatsapp }) => {
    await requirePermission(ctx, "membros:create");

    const nomeLimpo = nome.trim();
    if (!nomeLimpo) throw new Error("Informe o nome");
    if (!whatsapp.trim()) throw new Error("Informe o WhatsApp (necessario para o acesso)");

    // Entidade nao-membro: nao entra no Rol (vinculo FREQUENTADOR)
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["VISITANTE"],
      status: "ATIVO",
      nomeCompleto: nomeLimpo,
      whatsapp: whatsapp.trim(),
      vinculoIgreja: OUVINTE_VINCULO,
    });

    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: OUVINTE_ROLE,
      acessoExpiraEm: fimDoAnoMs(Date.now()),
    });

    await createActionAuditLog(ctx, "CREATE", "membros", membroId);
    return { membroId, entidadeId };
  },
});

/** Renova o acesso do ouvinte ate o fim do ano corrente. */
export const renovarAcesso = mutation({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requirePermission(ctx, "membros:update");

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Ouvinte nao encontrado");
    if (!ehOuvinte(membro)) throw new Error("Registro nao e um ouvinte");

    await ctx.db.patch(membroId, { acessoExpiraEm: fimDoAnoMs(Date.now()) });
    return { ok: true };
  },
});

type OuvinteRow = {
  membroId: string;
  nome: string;
  whatsapp: string | null;
  ativado: boolean;
  acessoExpiraEm: number | null;
  expirado: boolean;
  expiraEmBreve: boolean;
  temLinkPendente: boolean;
};

/** Lista os ouvintes para o painel admin. */
export const listar = query({
  args: {},
  handler: async (ctx): Promise<OuvinteRow[]> => {
    await requirePermission(ctx, "membros:read");

    const membros = (await ctx.db.query("membros").collect()).filter(ehOuvinte);
    const now = Date.now();
    const rows: OuvinteRow[] = [];

    for (const membro of membros) {
      const entidade = await ctx.db.get(membro.entidadeId);
      if (!entidade) continue;

      const convites = await ctx.db
        .query("membroConvites")
        .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
        .collect();
      const pendente = convites.find(
        (c) => c.status === "PENDENTE" && c.expiraEm >= now
      );

      rows.push({
        membroId: membro._id,
        nome: entidade.nomeCompleto || "",
        whatsapp: entidade.whatsapp || entidade.telefone || null,
        ativado: !!membro.userId,
        acessoExpiraEm: membro.acessoExpiraEm ?? null,
        expirado: ouvinteExpirado(membro, now),
        expiraEmBreve: ouvinteExpiraEmBreve(membro, now),
        temLinkPendente: !!pendente,
      });
    }

    rows.sort((a, b) => a.nome.localeCompare(b.nome));
    return rows;
  },
});
