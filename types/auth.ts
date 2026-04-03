export type Role = "admin" | "secretaria" | "membro" | "lider" | "diacono" | "presbitero" | "tesoureiro" | "pastor";

export type Permission =
  | "membros:read" | "membros:create" | "membros:update" | "membros:delete" | "membros:self_service"
  | "entidades:read" | "entidades:create" | "entidades:update" | "entidades:delete"
  | "diretorio:read"
  | "grupos:read" | "grupos:create" | "grupos:update" | "grupos:delete"
  | "escalas:read" | "escalas:create" | "escalas:update" | "escalas:delete"
  | "atividades:read" | "atividades:create" | "atividades:update" | "atividades:delete"
  | "gravacoes:read" | "gravacoes:create" | "gravacoes:update" | "gravacoes:delete" | "gravacoes:process_ai"
  | "oracoes:read" | "oracoes:create" | "oracoes:update" | "oracoes:delete"
  | "publicacoes:read" | "publicacoes:create" | "publicacoes:update" | "publicacoes:delete"
  | "musicas:read" | "musicas:create" | "musicas:update" | "musicas:delete"
  | "louvor:read" | "louvor:create" | "louvor:update" | "louvor:delete"
  | "pastoreio:read" | "pastoreio:create" | "pastoreio:update" | "pastoreio:delete"
  | "pequenos_grupos:read" | "pequenos_grupos:create" | "pequenos_grupos:update" | "pequenos_grupos:delete"
  | "pedidos_oracao:create" | "pedidos_oracao:read"
  | "ministerios:read" | "ministerios:create" | "ministerios:update" | "ministerios:delete"
  | "calendario:read" | "calendario:create" | "calendario:update" | "calendario:delete"
  | "criancas:read" | "criancas:manage"
  | "educacional:read" | "educacional:write"
  | "financeiro:read" | "financeiro:create" | "financeiro:update" | "financeiro:delete"
  | "documentos:read" | "documentos:create" | "documentos:update" | "documentos:delete"
  | "admin:read" | "admin:create" | "admin:update" | "admin:delete"
  | "aprovacoes:read" | "aprovacoes:create" | "aprovacoes:update"
  | "salas:read" | "salas:create" | "salas:update" | "salas:delete"
  | "audit:read"
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
}
