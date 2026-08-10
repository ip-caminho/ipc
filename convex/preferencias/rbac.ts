import { query, mutation, type MutationCtx, type QueryCtx, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { INITIAL_ROLE_PERMISSIONS as ROLE_DEFAULTS, resolvePermissions, VOLUNTEER_PERMISSION_SETS } from "./rbacHelpers";
import { derivedEduVoluntarioPerms, mergeDerived } from "../_shared/eduVoluntarioPerms";

// ===== PERMISSION DEFINITIONS =====

export const ALL_PERMISSIONS = [
  // Membros
  "membros:read", "membros:create", "membros:update", "membros:delete", "membros:self_service",
  // Rol de Membros
  "rol:read", "rol:update",
  // Entidades
  "entidades:read", "entidades:create", "entidades:update", "entidades:delete",
  // Diretorio
  "diretorio:read",
  // Gravacoes
  "gravacoes:read", "gravacoes:create", "gravacoes:update", "gravacoes:delete", "gravacoes:process_ai", "gravacoes:share",
  // Escalas
  "escalas:read", "escalas:create", "escalas:update", "escalas:delete",
  // Ausencias
  "ausencias:read", "ausencias:manage",
  // Avisos
  "avisos:create", "avisos:manage",
  // Louvor
  "louvor:read", "louvor:create", "louvor:update", "louvor:delete", "louvor:metricas",
  // Pastoreio
  "pastoreio:read", "pastoreio:create", "pastoreio:update", "pastoreio:delete",
  // Pequenos Grupos
  "pequenos_grupos:read", "pequenos_grupos:create", "pequenos_grupos:update", "pequenos_grupos:delete",
  "pequenos_grupos:facilitador", "pequenos_grupos:organizador",
  // Pedidos de Oracao
  "pedidos_oracao:create", "pedidos_oracao:read",
  // Ministerios
  "ministerios:read", "ministerios:create", "ministerios:update", "ministerios:delete",
  // Calendario
  "calendario:read", "calendario:create", "calendario:update", "calendario:delete",
  // Educacional
  "criancas:read", "criancas:manage", "criancas:medical",
  "educacional:read", "educacional:write",
  "escala_edu:manage", "relatorio_edu:write", "relatorio_edu:delete",
  // Voluntarios Educacional
  "voluntarios_edu:read", "voluntarios_edu:manage",
  // Biblioteca
  "biblioteca:read", "biblioteca:create", "biblioteca:update", "biblioteca:delete", "biblioteca:emprestar",
  // Multimidia
  "multimidia:read", "multimidia:create", "multimidia:update",
  // Salas
  "salas:read", "salas:create", "salas:update", "salas:delete",
  // Tarefas
  "tarefas:read", "tarefas:create", "tarefas:update", "tarefas:delete",
  // Turmas
  "turmas:read", "turmas:create", "turmas:update", "turmas:delete", "turmas:manage_inscricoes",
  // Auditoria
  "audit:read",
  // Atos Pastorais
  "atos_pastorais:manage",
  // Site Publico
  "site_publico:manage",
  // Inscricoes de evento
  "inscricoes:manage",
  // Retiro
  "retiro:manage",
  // Acesso ao sistema
  "acesso:manage",
] as const;

function getPermissionLabel(perm: string): string {
  const labels: Record<string, string> = {
    "membros:read": "Ver Membros",
    "membros:create": "Criar Membros",
    "membros:update": "Editar Membros",
    "membros:delete": "Excluir Membros",
    "membros:self_service": "Self-Service (editar proprio perfil)",
    "rol:read": "Rol de Membros — Visualizar (tabela, dashboard, historico, impressao)",
    "rol:update": "Rol de Membros — Editar (dados eclesiasticos, status, cargos, familia)",
    "entidades:read": "Ver Entidades",
    "entidades:create": "Criar Entidades",
    "entidades:update": "Editar Entidades",
    "entidades:delete": "Excluir Entidades",
    "diretorio:read": "Ver Diretorio",
    "gravacoes:read": "Ver Gravacoes",
    "gravacoes:create": "Criar Gravacoes",
    "gravacoes:update": "Editar Gravacoes",
    "gravacoes:delete": "Excluir Gravacoes",
    "gravacoes:process_ai": "Processar com IA",
    "gravacoes:share": "Compartilhar Gravacao (link publico)",
    "escalas:read": "Ver Escalas",
    "escalas:create": "Criar Escalas",
    "escalas:update": "Editar Escalas",
    "escalas:delete": "Excluir Escalas",
    "ausencias:read": "Ver Ausencias da Lideranca",
    "ausencias:manage": "Registrar/Remover Ausencia (propria)",
    "avisos:create": "Lançar Avisos",
    "avisos:manage": "Gerenciar Avisos (editar/excluir)",
    "audit:read": "Ver Auditoria",
    "pastoreio:read": "Ver Pastoreio",
    "pastoreio:create": "Criar Pastoreio",
    "pastoreio:update": "Editar Pastoreio",
    "pastoreio:delete": "Excluir Pastoreio",
    "pequenos_grupos:read": "Ver Pequenos Grupos",
    "pequenos_grupos:create": "Criar Pequenos Grupos",
    "pequenos_grupos:update": "Editar Pequenos Grupos",
    "pequenos_grupos:delete": "Excluir Pequenos Grupos",
    "pedidos_oracao:create": "Criar Pedidos de Oracao",
    "pedidos_oracao:read": "Ver Pedidos de Oracao",
    "ministerios:read": "Ver Ministerios",
    "ministerios:create": "Criar Ministerios",
    "ministerios:update": "Editar Ministerios",
    "ministerios:delete": "Excluir Ministerios",
    "calendario:read": "Ver Calendario",
    "calendario:create": "Criar Eventos",
    "calendario:update": "Editar Eventos",
    "calendario:delete": "Excluir Eventos",
    "criancas:read": "Ver Criancas",
    "criancas:manage": "Gerenciar Criancas",
    "criancas:medical": "Ver Observacoes Medicas (LGPD)",
    "educacional:read": "Ver Educacional",
    "educacional:write": "Editar Educacional (descontinuado)",
    "escala_edu:manage": "Gerenciar Escala do Educacional",
    "relatorio_edu:write": "Preencher Relatorio e Presenca",
    "relatorio_edu:delete": "Excluir Relatorio",
    "voluntarios_edu:read": "Ver Voluntarios Educacional",
    "voluntarios_edu:manage": "Gerenciar Voluntarios Educacional",
    "louvor:read": "Ver Louvores",
    "louvor:create": "Criar Louvores",
    "louvor:update": "Editar Louvores",
    "louvor:delete": "Excluir Louvores",
    "louvor:metricas": "Ver Metricas do Louvor",
    "pequenos_grupos:facilitador": "Facilitador de PG (gerenciar seu grupo)",
    "pequenos_grupos:organizador": "Organizador de PGs (gerenciar todos)",
    "biblioteca:read": "Ver Biblioteca",
    "biblioteca:create": "Cadastrar Livros",
    "biblioteca:update": "Editar Biblioteca",
    "biblioteca:delete": "Excluir da Biblioteca",
    "biblioteca:emprestar": "Registrar Emprestimos",
    "multimidia:read": "Ver Multimidia",
    "multimidia:create": "Criar Conteudo Multimidia",
    "multimidia:update": "Editar Multimidia",
    "salas:read": "Ver Salas",
    "salas:create": "Reservar Salas",
    "salas:update": "Editar Reservas",
    "salas:delete": "Excluir Reservas",
    "tarefas:read": "Ver Tarefas",
    "tarefas:create": "Criar Tarefas",
    "tarefas:update": "Editar Tarefas",
    "tarefas:delete": "Excluir Tarefas",
    "turmas:read": "Ver Turmas",
    "turmas:create": "Criar Turmas",
    "turmas:update": "Editar Turmas",
    "turmas:delete": "Excluir Turmas",
    "turmas:manage_inscricoes": "Gerenciar Inscricoes",
    "acesso:manage": "Gerenciar Acesso ao Sistema",
    "inscricoes:manage": "Inscricoes de Evento",
    "retiro:manage": "Gerenciar Retiro",
  };
  return labels[perm] ?? perm;
}

function getPermissionModule(perm: string): string {
  if (perm.startsWith("membros:")) return "Membros";
  if (perm.startsWith("entidades:")) return "Entidades";
  if (perm.startsWith("diretorio:")) return "Diretorio";
  if (perm.startsWith("gravacoes:")) return "Gravacoes";
  if (perm.startsWith("escalas:")) return "Escalas";
  if (perm.startsWith("ausencias:")) return "Escalas";
  if (perm.startsWith("avisos:")) return "Avisos";
  if (perm.startsWith("audit:")) return "Auditoria";
  if (perm.startsWith("pastoreio:")) return "Pastoreio";
  if (perm.startsWith("pequenos_grupos:")) return "Pequenos Grupos";
  if (perm.startsWith("pedidos_oracao:")) return "Pedidos de Oracao";
  if (perm.startsWith("ministerios:")) return "Ministerios";
  if (perm.startsWith("calendario:")) return "Calendario";
  if (perm.startsWith("criancas:")) return "Educacional Infantil";
  if (perm.startsWith("educacional:")) return "Educacional Infantil";
  if (perm.startsWith("escala_edu:")) return "Educacional Infantil";
  if (perm.startsWith("relatorio_edu:")) return "Educacional Infantil";
  if (perm.startsWith("voluntarios_edu:")) return "Educacional Infantil";
  if (perm.startsWith("louvor:")) return "Louvor";
  if (perm.startsWith("biblioteca:")) return "Biblioteca";
  if (perm.startsWith("multimidia:")) return "Multimidia";
  if (perm.startsWith("salas:")) return "Salas";
  if (perm.startsWith("tarefas:")) return "Tarefas";
  if (perm.startsWith("turmas:")) return "Turmas";
  if (perm.startsWith("acesso:")) return "Acesso";
  if (perm.startsWith("retiro:")) return "Retiro";
  return "Geral";
}

function getPermissionDescription(perm: string): string {
  const descriptions: Record<string, string> = {
    "membros:read": "Ver lista e detalhes de membros",
    "membros:create": "Criar novos membros no sistema",
    "membros:update": "Editar dados de membros existentes",
    "membros:delete": "Excluir membros do sistema",
    "membros:self_service": "Membro pode editar seus proprios dados (telefone, email, etc)",
    "entidades:read": "Ver lista e detalhes de entidades (PF/PJ)",
    "entidades:create": "Criar novas entidades",
    "entidades:update": "Editar entidades existentes",
    "entidades:delete": "Excluir entidades",
    "diretorio:read": "Acessar o diretorio de membros da igreja",
    "gravacoes:read": "Ver gravacoes de sermoes e estudos",
    "gravacoes:create": "Cadastrar novas gravacoes",
    "gravacoes:update": "Editar gravacoes existentes",
    "gravacoes:delete": "Excluir gravacoes",
    "gravacoes:process_ai": "Processar gravacoes com inteligencia artificial (transcricao e analise)",
    "gravacoes:share": "Gerar link publico de uma gravacao para compartilhar (nenhum papel concede — so pessoas adicionadas aqui)",
    "escalas:read": "Ver escala de liturgia e cultos",
    "escalas:create": "Criar cultos e escalas de liturgia",
    "escalas:update": "Editar escalas e atribuicoes de liturgia",
    "escalas:delete": "Excluir cultos e escalas",
    "avisos:create": "Lancar avisos/comunicados exibidos no domingo",
    "avisos:manage": "Editar e excluir avisos de qualquer autor",
    "audit:read": "Ver logs de auditoria do sistema",
    "pastoreio:read": "Ver visitas pastorais e anotacoes",
    "pastoreio:create": "Registrar visitas e anotacoes pastorais",
    "pastoreio:update": "Editar visitas e anotacoes pastorais",
    "pastoreio:delete": "Excluir visitas e anotacoes pastorais",
    "pequenos_grupos:read": "Ver pequenos grupos e seus membros",
    "pequenos_grupos:create": "Criar novos pequenos grupos",
    "pequenos_grupos:update": "Editar pequenos grupos existentes",
    "pequenos_grupos:delete": "Excluir pequenos grupos",
    "pedidos_oracao:create": "Criar pedidos de oracao",
    "pedidos_oracao:read": "Ver pedidos de oracao",
    "ministerios:read": "Ver ministerios e seus membros",
    "ministerios:create": "Criar novos ministerios",
    "ministerios:update": "Editar ministerios e gerenciar membros",
    "ministerios:delete": "Excluir ministerios",
    "calendario:read": "Ver eventos do calendario",
    "calendario:create": "Criar eventos no calendario",
    "calendario:update": "Editar eventos do calendario",
    "calendario:delete": "Excluir eventos do calendario",
    "criancas:read": "Ver nome e turma das criancas",
    "criancas:manage": "Gerenciar perfis das criancas (cadastro, foto, ovelhinhas)",
    "criancas:medical": "Ver observacoes medicas das criancas (dado sensivel, LGPD)",
    "educacional:read": "Ver dashboard, agenda, escalas e relatorios do educacional",
    "educacional:write": "Descontinuado — substituido por escala_edu e relatorio_edu",
    "escala_edu:manage": "Montar, editar, gerar e excluir a escala do educacional",
    "relatorio_edu:write": "Preencher relatorios de licao e marcar presenca",
    "relatorio_edu:delete": "Excluir relatorios de licao",
    "voluntarios_edu:read": "Ver voluntarios do educacional",
    "voluntarios_edu:manage": "Gerenciar voluntarios do educacional (CAC, CBCM, papeis)",
    "louvor:read": "Ver repertorio de louvores e cifras",
    "louvor:create": "Cadastrar novas musicas no repertorio",
    "louvor:update": "Editar musicas existentes",
    "louvor:delete": "Excluir musicas do repertorio",
    "louvor:metricas": "Ver metricas de frequencia e uso de louvores",
    "pequenos_grupos:facilitador": "Gerenciar o proprio pequeno grupo (membros, encontros)",
    "pequenos_grupos:organizador": "Gerenciar todos os pequenos grupos da igreja",
    "biblioteca:read": "Ver acervo e emprestimos da biblioteca",
    "biblioteca:create": "Cadastrar livros e registrar emprestimos",
    "biblioteca:update": "Editar livros e emprestimos",
    "biblioteca:delete": "Excluir livros da biblioteca",
    "biblioteca:emprestar": "Registrar emprestimos e devolucoes de livros",
    "multimidia:read": "Ver conteudo de multimidia",
    "multimidia:create": "Criar conteudo de multimidia (slides, etc)",
    "multimidia:update": "Editar conteudo de multimidia",
    "salas:read": "Ver salas e reservas existentes",
    "salas:create": "Criar novas reservas de sala",
    "salas:update": "Editar reservas de salas",
    "salas:delete": "Cancelar/excluir reservas de salas",
    "tarefas:read": "Ver todas as tarefas do sistema",
    "tarefas:create": "Criar novas tarefas e atribuir responsaveis",
    "tarefas:update": "Editar tarefas de outros membros",
    "tarefas:delete": "Excluir tarefas do sistema",
    "turmas:read": "Ver turmas e cursos disponiveis",
    "turmas:create": "Criar novas turmas e cursos",
    "turmas:update": "Editar turmas existentes",
    "turmas:delete": "Excluir turmas",
    "turmas:manage_inscricoes": "Gerenciar inscricoes de alunos",
    "acesso:manage": "Gerenciar acesso ao sistema: links de ativacao, reset de senha, link de convidado e atividade",
    "inscricoes:manage": "Criar e editar inscricoes de evento e ver as respostas",
    "retiro:manage": "Gerenciar o retiro anual: inscricoes, quartos, pagamentos e comprovantes",
  };
  return descriptions[perm] ?? "";
}

// Visible roles in matrix (exclude admin — has wildcard *)
const VISIBLE_ROLES = ["membro", "obreiro", "secretaria", "secretario_executivo", "presbitero", "pastor"];

// ===== HELPER =====

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const callerMembro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();

  if (!callerMembro || callerMembro.role !== "admin") {
    throw new Error("Only admins can manage permissions");
  }
  return { userId, callerMembro };
}

// ===== QUERIES =====

export const getUserPermissionContext = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) return null;

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade || entidade.status !== "ATIVO") return null;

    // Use membro-level permissions if set, else fall back to role
    const rolePermsRecord = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("role", membro.role))
      .first();
    const basePerms = resolvePermissions(
      membro.permissions,
      rolePermsRecord?.permissions,
      membro.role
    );
    // Une capacidade derivada de ser voluntário (Prof/Aux) do educacional.
    const permissions = mergeDerived(
      basePerms,
      await derivedEduVoluntarioPerms(ctx, membro._id)
    );

    return {
      membroId: membro._id,
      userId,
      role: membro.role,
      permissions,
      name: entidade.nomeCompleto ?? entidade.nomeRazaoSocial ?? "",
      foto: entidade.foto ?? null,
      phone: entidade.whatsapp ?? null,
      entidadeId: entidade._id,
      onboardingCompleto: membro.onboardingCompleto ?? false,
    };
  },
});

export const getAllPermissionOptions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    return ALL_PERMISSIONS.map((key) => ({
      key,
      label: getPermissionLabel(key),
      module: getPermissionModule(key),
      description: getPermissionDescription(key),
    }));
  },
});

export const getAllRolesWithPermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    const results = [];
    for (const role of VISIBLE_ROLES) {
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      results.push({
        role,
        permissions: rolePerms?.permissions ?? ROLE_DEFAULTS[role] ?? [],
      });
    }
    return results;
  },
});

export const getAllMembrosWithPermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    const membros = await ctx.db.query("membros").collect();
    const results = [];
    for (const m of membros) {
      if (m.role === "admin") continue; // admin has wildcard, skip
      const entidade = await ctx.db.get(m.entidadeId);
      if (!entidade) continue;

      // Effective permissions: membro-level if set, else role-level
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", m.role))
        .first();
      const permissions = resolvePermissions(m.permissions, rolePerms?.permissions, m.role);

      results.push({
        _id: m._id,
        name: entidade.nomeCompleto ?? "",
        role: m.role,
        status: entidade.status,
        permissions,
        hasCustomPermissions: !!(m.permissions && m.permissions.length > 0),
      });
    }
    return results;
  },
});

export const listRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    const roles = await ctx.db.query("rolePermissions").collect();
    return roles.map((r) => ({
      _id: r._id,
      role: r.role,
      permissions: r.permissions,
      updatedAt: r.updatedAt,
    }));
  },
});

// ===== MUTATIONS =====

// INTERNAL: seed — rodar via `npx convex run`, nunca do cliente.
export const seedRolePermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const [role, permissions] of Object.entries(ROLE_DEFAULTS) as [string, string[]][]) {
      const existing = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      if (!existing) {
        await ctx.db.insert("rolePermissions", {
          role,
          permissions,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const updateRolePermissions = mutation({
  args: {
    role: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { role, permissions }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("role", role))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { permissions, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("rolePermissions", { role, permissions, updatedAt: Date.now() });
    }
  },
});

export const setMembroPermission = mutation({
  args: {
    membroId: v.id("membros"),
    permission: v.string(),
    hasPermission: v.boolean(),
  },
  handler: async (ctx, { membroId, permission, hasPermission }) => {
    await requireAdmin(ctx);

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    if (membro.role === "admin") throw new Error("Nao e possivel editar permissoes de admin");

    // Get current effective permissions
    let currentPerms: string[];
    if (membro.permissions && membro.permissions.length > 0) {
      currentPerms = [...membro.permissions];
    } else {
      // Start from role defaults
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", membro.role))
        .first();
      currentPerms = [...(rolePerms?.permissions ?? ROLE_DEFAULTS[membro.role] ?? [])];
    }

    if (hasPermission && !currentPerms.includes(permission)) {
      currentPerms.push(permission);
    } else if (!hasPermission) {
      currentPerms = currentPerms.filter((p) => p !== permission);
    }

    await ctx.db.patch(membroId, { permissions: currentPerms });
  },
});

/**
 * Sincronizar rolePermissions com o código.
 * Usar quando mudar INITIAL_ROLE_PERMISSIONS no rbacHelpers.ts.
 * npx convex run preferencias/rbac:syncRolePermissionsFromCode
 */
export const syncRolePermissionsFromCode = internalMutation({
  args: {},
  handler: async (ctx) => {
    const roles = Object.keys(ROLE_DEFAULTS) as string[];
    let updated = 0;

    for (const role of roles) {
      const existing = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          permissions: ROLE_DEFAULTS[role],
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("rolePermissions", {
          role,
          permissions: ROLE_DEFAULTS[role],
          updatedAt: Date.now(),
        });
      }
      updated++;
    }

    return { updated };
  },
});

/**
 * Concede calendario:read aos papeis base (membro, obreiro, secretario_executivo)
 * para o calendario ficar visivel a todos. Direcionada e idempotente: adiciona
 * SO essa permissao, preservando o resto (nao reseta os papeis como o sync faz).
 * Rodar em prod apos deploy:
 * npx convex run preferencias/rbac:addCalendarioReadToBaseRoles
 */
export const addCalendarioReadToBaseRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const roles = ["membro", "obreiro", "secretario_executivo"];
    const updated: string[] = [];
    for (const role of roles) {
      const row = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      // Sem row: resolvePermissions cai no INITIAL do codigo (que ja tem
      // calendario:read), entao nao precisa criar.
      if (!row) continue;
      if (!row.permissions.includes("calendario:read")) {
        await ctx.db.patch(row._id, {
          permissions: [...row.permissions, "calendario:read"],
          updatedAt: Date.now(),
        });
        updated.push(role);
      }
    }
    return { updated };
  },
});

/**
 * Habilita o obreiro a lancar avisos e desacopla avisos de escalas.
 * Concede avisos:create ao obreiro; avisos:create + avisos:manage a pastor e
 * secretaria (que criavam/editavam avisos via escalas:* antes do desacoplamento,
 * e perderiam o acesso quando as mutations passassem a exigir avisos:*).
 * Direcionada e idempotente: adiciona SO essas permissoes, preservando o resto.
 * Rodar em prod apos deploy:
 * npx convex run preferencias/rbac:addAvisosPermissions --prod
 */
export const addAvisosPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const grants: Record<string, string[]> = {
      obreiro: ["avisos:create"],
      pastor: ["avisos:create", "avisos:manage"],
      secretaria: ["avisos:create", "avisos:manage"],
    };
    const updated: string[] = [];
    for (const [role, perms] of Object.entries(grants)) {
      const row = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      // Sem row: resolvePermissions cai no INITIAL do codigo (ja atualizado),
      // entao nao precisa criar.
      if (!row) continue;
      const missing = perms.filter((p) => !row.permissions.includes(p));
      if (missing.length > 0) {
        await ctx.db.patch(row._id, {
          permissions: [...row.permissions, ...missing],
          updatedAt: Date.now(),
        });
        updated.push(role);
      }
    }
    return { updated };
  },
});

/**
 * Concede as permissoes de voluntarios do educacional (Fase 2). Roles que ja
 * gerenciam o educacional (secretaria) ganham read+manage; quem so le (pastor,
 * presbitero) ganha read. Tambem atualiza snapshots individuais: membro com
 * educacional:write no snapshot ganha read+manage; com educacional:read, read.
 * Direcionada e idempotente. Rodar em prod apos deploy:
 * npx convex run preferencias/rbac:addVoluntariosEduPermissions --prod
 */
export const addVoluntariosEduPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const grants: Record<string, string[]> = {
      secretaria: ["voluntarios_edu:read", "voluntarios_edu:manage"],
      pastor: ["voluntarios_edu:read"],
      presbitero: ["voluntarios_edu:read"],
    };
    const rolesUpdated: string[] = [];
    for (const [role, perms] of Object.entries(grants)) {
      const row = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      // Sem row: resolvePermissions cai no INITIAL do codigo (ja atualizado).
      if (!row) continue;
      const missing = perms.filter((p) => !row.permissions.includes(p));
      if (missing.length > 0) {
        await ctx.db.patch(row._id, {
          permissions: [...row.permissions, ...missing],
          updatedAt: Date.now(),
        });
        rolesUpdated.push(role);
      }
    }

    // Snapshots individuais (membro.permissions[] tem prioridade sobre o role).
    const membros = await ctx.db.query("membros").collect();
    let snapshotsUpdated = 0;
    for (const m of membros) {
      if (!m.permissions || m.permissions.length === 0) continue;
      const add: string[] = [];
      if (m.permissions.includes("educacional:write")) {
        add.push("voluntarios_edu:read", "voluntarios_edu:manage");
      } else if (m.permissions.includes("educacional:read")) {
        add.push("voluntarios_edu:read");
      }
      const missing = add.filter((p) => !m.permissions!.includes(p));
      if (missing.length > 0) {
        await ctx.db.patch(m._id, { permissions: [...m.permissions, ...missing] });
        snapshotsUpdated++;
      }
    }

    return { rolesUpdated, snapshotsUpdated };
  },
});

/**
 * Migra as permissoes grossas do educacional para as granulares por persona.
 * Roles/snapshots com educacional:write ganham escala_edu:manage +
 * relatorio_edu:write + relatorio_edu:delete; com criancas:manage ganham
 * criancas:medical. educacional:write e mantido (deprecado, inofensivo).
 * Idempotente. Rodar em prod apos deploy:
 * npx convex run preferencias/rbac:addEducacionalGranularPermissions --prod
 */
export const addEducacionalGranularPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Deriva as permissoes granulares a partir das grossas presentes.
    const derivar = (perms: string[]): string[] => {
      const add: string[] = [];
      if (perms.includes("educacional:write")) {
        add.push(
          "escala_edu:manage",
          "relatorio_edu:write",
          "relatorio_edu:delete"
        );
      }
      if (perms.includes("criancas:manage")) {
        add.push("criancas:medical");
      }
      return add.filter((p) => !perms.includes(p));
    };

    // Snapshots de roles.
    const rolesUpdated: string[] = [];
    const roleRows = await ctx.db.query("rolePermissions").collect();
    for (const row of roleRows) {
      const missing = derivar(row.permissions);
      if (missing.length > 0) {
        await ctx.db.patch(row._id, {
          permissions: [...row.permissions, ...missing],
          updatedAt: Date.now(),
        });
        rolesUpdated.push(row.role);
      }
    }

    // Snapshots individuais (membro.permissions[] tem prioridade sobre o role).
    const membros = await ctx.db.query("membros").collect();
    let snapshotsUpdated = 0;
    for (const m of membros) {
      if (!m.permissions || m.permissions.length === 0) continue;
      const missing = derivar(m.permissions);
      if (missing.length > 0) {
        await ctx.db.patch(m._id, {
          permissions: [...m.permissions, ...missing],
        });
        snapshotsUpdated++;
      }
    }

    return { rolesUpdated, snapshotsUpdated };
  },
});

/**
 * Concede acesso:manage a pastor e secretaria (papeis que gerenciavam acesso ao
 * sistema via a antiga aba Acesso de /membros, agora em /admin/acesso).
 * Direcionada e idempotente: adiciona SO essa permissao, preservando o resto.
 * Rodar em prod apos deploy:
 * npx convex run preferencias/rbac:addAcessoManageToRoles --prod
 */
export const addAcessoManageToRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const roles = ["pastor", "secretaria"];
    const updated: string[] = [];
    for (const role of roles) {
      const row = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      // Sem row: resolvePermissions cai no INITIAL do codigo (ja atualizado).
      if (!row) continue;
      if (!row.permissions.includes("acesso:manage")) {
        await ctx.db.patch(row._id, {
          permissions: [...row.permissions, "acesso:manage"],
          updatedAt: Date.now(),
        });
        updated.push(role);
      }
    }
    return { updated };
  },
});

/**
 * Complemento da addAcessoManageToRoles para membros com snapshot
 * personalizado (membro.permissions[]): quem tinha membros:update no
 * snapshot gerenciava acesso antes do desacoplamento e deve ganhar
 * acesso:manage. Idempotente; one-off (collect aceitavel).
 * npx convex run preferencias/rbac:addAcessoManageToSnapshots --prod
 */
export const addAcessoManageToSnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const membros = await ctx.db.query("membros").collect();
    let updated = 0;
    for (const m of membros) {
      if (!m.permissions || m.permissions.length === 0) continue;
      if (m.permissions.includes("acesso:manage")) continue;
      if (!m.permissions.includes("membros:update")) continue;
      await ctx.db.patch(m._id, {
        permissions: [...m.permissions, "acesso:manage"],
      });
      updated++;
    }
    return { updated };
  },
});

/**
 * Concede inscricoes:manage aos papeis que gerenciam inscricoes (pastor,
 * secretaria, secretario_executivo) e preserva o acesso de quem tinha
 * site_publico:manage no snapshot individual. Direcionada e idempotente.
 * Rodar em prod apos deploy:
 * npx convex run preferencias/rbac:grantInscricoesManage --prod
 */
export const grantInscricoesManage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const roles = ["pastor", "secretaria", "secretario_executivo"];
    const rolesUpdated: string[] = [];
    for (const role of roles) {
      const row = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      // Sem row: resolvePermissions cai no INITIAL do codigo (ja atualizado).
      if (!row) continue;
      if (row.permissions.includes("inscricoes:manage")) continue;
      await ctx.db.patch(row._id, {
        permissions: [...row.permissions, "inscricoes:manage"],
        updatedAt: Date.now(),
      });
      rolesUpdated.push(role);
    }
    // Preserva grants individuais: quem tinha site_publico:manage no snapshot
    // ganha inscricoes:manage (senao perderia acesso apos o re-gate).
    const membros = await ctx.db.query("membros").collect();
    let membrosUpdated = 0;
    for (const m of membros) {
      if (!m.permissions || m.permissions.length === 0) continue;
      if (m.permissions.includes("inscricoes:manage")) continue;
      if (!m.permissions.includes("site_publico:manage")) continue;
      await ctx.db.patch(m._id, {
        permissions: [...m.permissions, "inscricoes:manage"],
      });
      membrosUpdated++;
    }
    return { rolesUpdated, membrosUpdated };
  },
});

/**
 * Concede retiro:manage a quem hoje gerencia o retiro via inscricoes:manage.
 * O retiro passou a ter chave propria (antes dividia inscricoes:manage com as
 * inscricoes genericas de evento), entao sem isso a secretaria perde a tela no
 * deploy. Direcionada e idempotente.
 * Rodar em prod apos deploy:
 * npx convex run preferencias/rbac:grantRetiroManage --prod
 */
export const grantRetiroManage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const roles = ["pastor", "secretaria", "secretario_executivo"];
    const rolesUpdated: string[] = [];
    for (const role of roles) {
      const row = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", role))
        .first();
      // Sem row: resolvePermissions cai no INITIAL do codigo (ja atualizado).
      if (!row) continue;
      if (row.permissions.includes("retiro:manage")) continue;
      await ctx.db.patch(row._id, {
        permissions: [...row.permissions, "retiro:manage"],
        updatedAt: Date.now(),
      });
      rolesUpdated.push(role);
    }
    // Preserva grants individuais: quem tinha inscricoes:manage no snapshot
    // ganha retiro:manage (senao perderia o retiro apos o re-gate).
    const membros = await ctx.db.query("membros").collect();
    let membrosUpdated = 0;
    for (const m of membros) {
      if (!m.permissions || m.permissions.length === 0) continue;
      if (m.permissions.includes("retiro:manage")) continue;
      if (!m.permissions.includes("inscricoes:manage")) continue;
      await ctx.db.patch(m._id, {
        permissions: [...m.permissions, "retiro:manage"],
      });
      membrosUpdated++;
    }
    return { rolesUpdated, membrosUpdated };
  },
});

/** Query para listar conjuntos de permissões de voluntários */
export const getVolunteerPermissionSets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const callerMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!callerMembro || callerMembro.role !== "admin") return [];

    return Object.entries(VOLUNTEER_PERMISSION_SETS).map(([key, value]) => ({
      key,
      label: value.label,
      permissions: value.permissions,
    }));
  },
});

/** Aplicar um conjunto de permissões de voluntário a um membro */
export const applyVolunteerSet = mutation({
  args: {
    membroId: v.id("membros"),
    setKey: v.string(),
    apply: v.boolean(),
  },
  handler: async (ctx, { membroId, setKey, apply }) => {
    await requireAdmin(ctx);

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    if (membro.role === "admin") throw new Error("Admin ja tem todas as permissoes");

    const volSet = VOLUNTEER_PERMISSION_SETS[setKey];
    if (!volSet) throw new Error("Conjunto de permissoes invalido");

    // Pegar permissões atuais (ou do role)
    let currentPerms: string[];
    if (membro.permissions && membro.permissions.length > 0) {
      currentPerms = [...membro.permissions];
    } else {
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", membro.role))
        .first();
      currentPerms = [...(rolePerms?.permissions ?? ROLE_DEFAULTS[membro.role] ?? [])];
    }

    if (apply) {
      // Adicionar permissões do set que não existem
      for (const perm of volSet.permissions) {
        if (!currentPerms.includes(perm)) {
          currentPerms.push(perm);
        }
      }
    } else {
      // Remover permissões do set (exceto as que são do role padrão)
      const roleDefaults = ROLE_DEFAULTS[membro.role] ?? [];
      for (const perm of volSet.permissions) {
        if (!roleDefaults.includes(perm)) {
          currentPerms = currentPerms.filter((p) => p !== perm);
        }
      }
    }

    await ctx.db.patch(membroId, { permissions: currentPerms });
  },
});

/** Trocar o role de um membro */
export const updateMembroRole = mutation({
  args: {
    membroId: v.id("membros"),
    role: v.string(),
  },
  handler: async (ctx, { membroId, role }) => {
    await requireAdmin(ctx);

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    if (membro.role === "admin" && role !== "admin") {
      throw new Error("Nao e possivel rebaixar admin por aqui");
    }

    // Ao trocar role, limpar permissões customizadas (volta pro padrão do novo role)
    await ctx.db.patch(membroId, { role, permissions: [] });
  },
});

export const syncMembroWithRole = mutation({
  args: {
    membroId: v.id("membros"),
  },
  handler: async (ctx, { membroId }) => {
    await requireAdmin(ctx);

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");

    // Clear custom permissions — will fall back to role defaults
    await ctx.db.patch(membroId, { permissions: [] });
  },
});
