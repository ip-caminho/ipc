/**
 * Pure RBAC helper functions extracted for testability.
 * Used by rbac.ts queries — no Convex runtime dependency.
 */

// === Permissões padrão por role ===
// Role = nível hierárquico. Permissões extras = voluntários (via membro.permissions[])

export const INITIAL_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],

  pastor: [
    // Membros e entidades
    "membros:read", "membros:create", "membros:update",
    "rol:read", "rol:update",
    "entidades:read", "entidades:create", "entidades:update",
    "diretorio:read",
    // Pastoreio completo
    "pastoreio:read", "pastoreio:create", "pastoreio:update", "pastoreio:delete",
    // Pequenos Grupos
    "pequenos_grupos:read", "pequenos_grupos:create", "pequenos_grupos:update", "pequenos_grupos:delete",
    "pequenos_grupos:organizador",
    // Pedidos de oração
    "pedidos_oracao:create", "pedidos_oracao:read",
    // Gravações
    "gravacoes:read", "gravacoes:create", "gravacoes:update", "gravacoes:process_ai",
    // Escalas
    "escalas:read", "escalas:create", "escalas:update",
    // Louvor
    "louvor:read", "louvor:create", "louvor:update",
    // Ministerios
    "ministerios:read", "ministerios:create", "ministerios:update",
    // Calendario
    "calendario:read", "calendario:create", "calendario:update",
    // Educacional
    "criancas:read", "educacional:read",
    // Biblioteca
    "biblioteca:read",
    // Salas
    "salas:read", "salas:create", "salas:update",
    // Tarefas
    "tarefas:read", "tarefas:create", "tarefas:update", "tarefas:delete",
    // Turmas
    "turmas:read", "turmas:create", "turmas:update",
    // Site Publico
    "site_publico:manage",
    // Auditoria
    "audit:read",
  ],

  presbitero: [
    // Diretório
    "diretorio:read",
    // Pastoreio (próprias visitas e anotações)
    "pastoreio:read", "pastoreio:create", "pastoreio:update",
    // Pequenos Grupos
    "pequenos_grupos:read", "pequenos_grupos:create", "pequenos_grupos:update",
    // Pedidos de oração
    "pedidos_oracao:create", "pedidos_oracao:read",
    // Visualização
    "membros:read", "membros:self_service",
    "gravacoes:read",
    "escalas:read",
    "louvor:read",
    "ministerios:read",
    "calendario:read",
    "educacional:read",
    "biblioteca:read",
    "salas:read", "salas:create",
    // Tarefas
    "tarefas:read", "tarefas:create", "tarefas:update",
    // Turmas
    "turmas:read",
  ],

  obreiro: [
    "membros:self_service", "membros:read",
    "pedidos_oracao:create", "pedidos_oracao:read",
    // Tarefas
    "tarefas:read", "tarefas:create", "tarefas:update",
  ],

  secretaria: [
    // Membros e entidades — CRUD (delete apenas admin)
    "membros:read", "membros:create", "membros:update",
    "rol:read", "rol:update",
    "entidades:read", "entidades:create", "entidades:update", "entidades:delete",
    "diretorio:read",
    // Gravações
    "gravacoes:read", "gravacoes:create", "gravacoes:update", "gravacoes:delete", "gravacoes:process_ai",
    // Escalas
    "escalas:read", "escalas:create", "escalas:update", "escalas:delete",
    // Louvor
    "louvor:read", "louvor:create", "louvor:update",
    // Ministerios
    "ministerios:read", "ministerios:create", "ministerios:update",
    // Calendario
    "calendario:read", "calendario:create", "calendario:update",
    // Educacional
    "criancas:read", "criancas:manage",
    "educacional:read", "educacional:write",
    // Salas
    "salas:read", "salas:create", "salas:update", "salas:delete",
    // Pastoreio (visualização)
    "pastoreio:read",
    // Pequenos Grupos
    "pequenos_grupos:read",
    // Pedidos de oração
    "pedidos_oracao:read",
    // Biblioteca
    "biblioteca:read", "biblioteca:create", "biblioteca:update", "biblioteca:emprestar",
    // Tarefas
    "tarefas:read", "tarefas:create", "tarefas:update", "tarefas:delete",
    // Turmas
    "turmas:read", "turmas:create", "turmas:update", "turmas:manage_inscricoes",
    // Auditoria
    "audit:read",
  ],

  membro: [
    "membros:self_service",
    "gravacoes:read",
    "pedidos_oracao:create", "pedidos_oracao:read",
  ],

  // Secretario executivo: read em tudo do membro/entidade, write apenas em
  // dados eclesiasticos. Nao cria/exclui, nao edita dados pessoais.
  secretario_executivo: [
    // Read
    "membros:read", "membros:self_service",
    "entidades:read",
    "diretorio:read",
    // Rol de membros (ver + editar)
    "rol:read", "rol:update",
    "atos_pastorais:manage",
    // Site Publico
    "site_publico:manage",
    // Auditoria
    "audit:read",
    // Operacao basica
    "pedidos_oracao:read",
  ],

  // Equipe de comunicacao / manutencao do site publico. So o necessario p/ o
  // painel /admin/site-publico: informacoes, inscricoes, curadoria de avisos
  // (site_publico:manage), agenda-eventos (calendario:*) e ler gravacoes.
  comunicacao: [
    "site_publico:manage",
    "calendario:read", "calendario:create", "calendario:update", "calendario:delete",
    "gravacoes:read",
  ],
};

// === Permissões extras para voluntários ===
// Adicionadas ao membro.permissions[] pelo admin

export const VOLUNTEER_PERMISSION_SETS: Record<string, { label: string; permissions: string[] }> = {
  voluntario_louvor: {
    label: "Voluntario Louvor",
    permissions: [
      "louvor:create", "louvor:update", "louvor:metricas",
      "escalas:update", // editar setlist
    ],
  },
  voluntario_educacional: {
    label: "Voluntario Educacional",
    permissions: [
      "criancas:read",
      "educacional:read", "educacional:write",
    ],
  },
  voluntario_multimidia: {
    label: "Voluntario Multimidia",
    permissions: [
      "gravacoes:create", "gravacoes:update", "gravacoes:process_ai",
      "multimidia:read", "multimidia:create", "multimidia:update",
    ],
  },
  voluntario_biblioteca: {
    label: "Voluntario Biblioteca",
    permissions: [
      "biblioteca:read", "biblioteca:create", "biblioteca:update", "biblioteca:emprestar",
    ],
  },
  lider_biblioteca: {
    label: "Lider Biblioteca",
    permissions: [
      "biblioteca:read", "biblioteca:create", "biblioteca:update", "biblioteca:delete", "biblioteca:emprestar",
    ],
  },
  facilitador_pg: {
    label: "Facilitador PG",
    permissions: [
      "pequenos_grupos:read", "pequenos_grupos:update",
      "pequenos_grupos:facilitador",
    ],
  },
  organizador_pg: {
    label: "Organizador PG",
    permissions: [
      "pequenos_grupos:read", "pequenos_grupos:create", "pequenos_grupos:update", "pequenos_grupos:delete",
      "pequenos_grupos:organizador",
    ],
  },
};

/**
 * Resolve effective permissions for a member.
 * Priority: membro-level overrides > role-level from DB > initial defaults.
 */
export function resolvePermissions(
  membroPermissions: string[] | undefined,
  rolePermissionsFromDb: string[] | undefined,
  role: string
): string[] {
  if (membroPermissions && membroPermissions.length > 0) {
    return membroPermissions;
  }
  return rolePermissionsFromDb ?? INITIAL_ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a permission set grants a specific permission.
 * Supports:
 *  - Wildcard "*" (admin has all)
 *  - Module wildcard "louvor:*" matches "louvor:read", "louvor:create", etc.
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;

  // Wildcard: "louvor:*" matches "louvor:read"
  for (const perm of permissions) {
    if (perm.endsWith(":*") && permission.startsWith(perm.slice(0, -1))) {
      return true;
    }
  }
  return false;
}

/**
 * Toggle a permission in a list.
 * Returns a new array — does not mutate.
 */
export function togglePermission(
  currentPerms: string[],
  permission: string,
  grant: boolean
): string[] {
  if (grant) {
    return currentPerms.includes(permission)
      ? [...currentPerms]
      : [...currentPerms, permission];
  }
  return currentPerms.filter((p) => p !== permission);
}
