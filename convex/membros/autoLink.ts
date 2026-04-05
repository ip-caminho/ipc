import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { normalizeToE164 } from "../messaging/phoneUtils";

/**
 * Auto-vincular usuário logado ao membro existente pelo telefone.
 * Chamado quando o usuário está autenticado mas não tem membro vinculado.
 *
 * Fluxo:
 * 1. Pegar userId do auth
 * 2. Buscar telefone na tabela authAccounts (providerAccountId do provider whatsapp-otp)
 * 3. Normalizar telefone
 * 4. Buscar entidade por whatsapp
 * 5. Buscar membro por entidadeId
 * 6. Vincular userId ao membro
 */
export const autoLinkByPhone = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { linked: false, reason: "not_authenticated" };

    // Já tem membro vinculado?
    const existing = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existing) return { linked: false, reason: "already_linked" };

    // Buscar telefone do auth (tabela authAccounts)
    const accounts = await ctx.db.query("authAccounts").collect();
    const account = accounts.find(
      (a) => a.userId === userId && a.provider === "whatsapp-otp"
    );

    if (!account || !account.providerAccountId) {
      return { linked: false, reason: "no_phone_in_auth" };
    }

    const phone = account.providerAccountId;
    // Normalizar para comparação
    const normalized = normalizeToE164(phone);
    // Formatos possíveis no campo whatsapp: "11942088102", "+5511942088102", "5511942088102"
    const variants = [
      normalized,                              // +5511942088102
      normalized.replace(/^\+55/, ""),         // 11942088102
      normalized.replace(/^\+/, ""),           // 5511942088102
    ];

    // Buscar entidade por whatsapp
    const entidades = await ctx.db.query("entidades").collect();
    const entidade = entidades.find(
      (e) => e.whatsapp && variants.includes(e.whatsapp)
    );

    if (!entidade) {
      return { linked: false, reason: "no_matching_entity" };
    }

    // Buscar membro por entidadeId
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
      .first();

    if (!membro) {
      return { linked: false, reason: "no_member_for_entity" };
    }

    // Já tem outro userId vinculado?
    if (membro.userId && membro.userId !== userId) {
      return { linked: false, reason: "member_linked_to_other_user" };
    }

    // Vincular
    await ctx.db.patch(membro._id, { userId });
    console.log(`[AutoLink] Vinculado userId=${userId} ao membro=${membro._id} (phone=${phone})`);

    return { linked: true, membroId: membro._id, entidadeId: entidade._id };
  },
});
