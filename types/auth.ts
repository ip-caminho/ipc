export type Role =
  | "admin"
  | "pastor"
  | "presbitero"
  | "obreiro"
  | "secretaria"
  | "secretario_executivo"
  | "membro"
  // Acesso externo: nao-membro, so ouve gravacoes. Nao entra no Rol.
  | "ouvinte";

export type Permission =
  // Membros
  | "membros:read" | "membros:create" | "membros:update" | "membros:delete" | "membros:self_service"
  // Rol de Membros (pagina do secretario executivo)
  | "rol:read" | "rol:update"
  // Entidades
  | "entidades:read" | "entidades:create" | "entidades:update" | "entidades:delete"
  // Diretorio
  | "diretorio:read"
  // Gravacoes
  | "gravacoes:read" | "gravacoes:create" | "gravacoes:update" | "gravacoes:delete" | "gravacoes:process_ai"
  // Escalas
  | "escalas:read" | "escalas:create" | "escalas:update" | "escalas:delete"
  // Louvor
  | "louvor:read" | "louvor:create" | "louvor:update" | "louvor:delete" | "louvor:metricas"
  // Pastoreio
  | "pastoreio:read" | "pastoreio:create" | "pastoreio:update" | "pastoreio:delete"
  // Pequenos Grupos
  | "pequenos_grupos:read" | "pequenos_grupos:create" | "pequenos_grupos:update" | "pequenos_grupos:delete"
  | "pequenos_grupos:facilitador" | "pequenos_grupos:organizador"
  // Pedidos de Oracao
  | "pedidos_oracao:create" | "pedidos_oracao:read"
  // Ministerios
  | "ministerios:read" | "ministerios:create" | "ministerios:update" | "ministerios:delete"
  // Calendario
  | "calendario:read" | "calendario:create" | "calendario:update" | "calendario:delete"
  // Educacional
  | "criancas:read" | "criancas:manage"
  | "educacional:read" | "educacional:write"
  // Biblioteca
  | "biblioteca:read" | "biblioteca:create" | "biblioteca:update" | "biblioteca:delete" | "biblioteca:emprestar"
  // Multimidia
  | "multimidia:read" | "multimidia:create" | "multimidia:update"
  // Salas
  | "salas:read" | "salas:create" | "salas:update" | "salas:delete"
  // Tarefas
  | "tarefas:read" | "tarefas:create" | "tarefas:update" | "tarefas:delete"
  // Turmas
  | "turmas:read" | "turmas:create" | "turmas:update" | "turmas:delete" | "turmas:manage_inscricoes"
  // Auditoria
  | "audit:read"
  // Campanhas
  | "campanhas:manage"
  // Atos Pastorais
  | "atos_pastorais:manage"
  // Wildcards
  | "*";

export interface AuthContext {
  isLoading: boolean;
  isAuthenticated: boolean;
  membroId: string | null;
  userId: string | null;
  role: Role | null;
  name: string | null;
  foto: string | null;
  phone: string | null;
  isAdmin: boolean;
  can: (permission: Permission) => boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  // Simulacao de role (admin only)
  isImpersonating: boolean;
  impersonate: (role: Role) => void;
  stopImpersonating: () => void;
}
