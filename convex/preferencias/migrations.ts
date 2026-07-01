import { internalMutation } from "../_generated/server";

const OLD_PERMISSION = "membros:update_eclesiastico";
const NEW_PERMISSIONS = ["rol:read", "rol:update"];

/**
 * Migra a permissao legada `membros:update_eclesiastico` para as granulares
 * `rol:read` + `rol:update`, em rolePermissions (papeis editados no banco) e
 * em membros.permissions (overrides individuais).
 *
 * Idempotente: rodadas subsequentes nao encontram a permissao antiga.
 * Rodar: npx convex run preferencias/migrations:migrateRolPermissions
 * (em dev e em prod, junto do deploy desta feature)
 */
export const migrateRolPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const swap = (permissions: string[]): string[] =>
      Array.from(
        new Set([
          ...permissions.filter((p) => p !== OLD_PERMISSION),
          ...NEW_PERMISSIONS,
        ]),
      );

    let rolesAtualizados = 0;
    const roles = await ctx.db.query("rolePermissions").collect();
    for (const r of roles) {
      if (r.permissions.includes(OLD_PERMISSION)) {
        await ctx.db.patch(r._id, { permissions: swap(r.permissions) });
        rolesAtualizados++;
      }
    }

    let membrosAtualizados = 0;
    const membros = await ctx.db.query("membros").collect();
    for (const m of membros) {
      if (m.permissions?.includes(OLD_PERMISSION)) {
        await ctx.db.patch(m._id, { permissions: swap(m.permissions) });
        membrosAtualizados++;
      }
    }

    return { rolesAtualizados, membrosAtualizados };
  },
});

/**
 * Corrige os dados de igreja que vieram do seed de exemplo (seedIgrejaInfo, uma
 * "Igreja Presbiteriana de Colombo" ficticia). Os valores corretos sao os mesmos
 * usados no rodape (SiteFooter) e no JSON-LD do site publico.
 *
 * Rodar uma vez em prod:
 *   npx convex run preferencias/migrations:corrigirIgrejaInfo --prod
 *
 * Campos sem valor confiavel (whatsapp, telefone, googleMapsEmbed, educacional)
 * NAO sao tocados — preencher pela tela de Preferencias do chrMS.
 */
export const corrigirIgrejaInfo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const correto: Record<string, unknown> = {
      "igreja.nome": "Igreja Presbiteriana do Caminho",
      "igreja.descricao":
        "Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo. Presbiteriana, em São Paulo.",
      "igreja.endereco": "Rua Pedra Azul, 674A — Vila Mariana, São Paulo, SP",
      "igreja.horarios": [
        { dia: "Domingo", horario: "10h", tipo: "Culto Dominical" },
      ],
      "igreja.email": "ipdocaminho@gmail.com",
      "igreja.banco": "Santander (033)",
      "igreja.agencia": "0108",
      "igreja.conta": "13007643-7",
      "igreja.pix": "48.792.102/0001-13",
    };

    const atualizados: string[] = [];
    for (const [chave, valor] of Object.entries(correto)) {
      const existing = await ctx.db
        .query("preferencias")
        .withIndex("by_chave", (q) => q.eq("chave", chave))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { valor, atualizadoEm: Date.now() });
      } else {
        await ctx.db.insert("preferencias", { chave, valor, atualizadoEm: Date.now() });
      }
      atualizados.push(chave);
    }
    return { atualizados };
  },
});

/**
 * Limpa os contatos fake herdados do seed de Colombo (telefone/whatsapp).
 * Setados como "" ate termos os numeros reais da igreja. Nao aparecem no site
 * hoje; ficam visiveis no editor de Informacoes (/admin/site-publico/informacoes).
 * Rodar: npx convex run preferencias/migrations:limparContatosFakeIgreja --prod
 */
export const limparContatosFakeIgreja = internalMutation({
  args: {},
  handler: async (ctx) => {
    const limpos: string[] = [];
    for (const chave of ["igreja.telefone", "igreja.whatsapp"]) {
      const existing = await ctx.db
        .query("preferencias")
        .withIndex("by_chave", (q) => q.eq("chave", chave))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { valor: "", atualizadoEm: Date.now() });
        limpos.push(chave);
      }
    }
    return { limpos };
  },
});
