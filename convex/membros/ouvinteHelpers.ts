/**
 * Helpers do acesso "ouvinte" — usuario externo (nao-membro) que so ouve
 * gravacoes. Centraliza a regra de exclusao do Rol e a expiracao anual.
 *
 * O ouvinte e um registro `membros` real (precisa de userId para auth), mas
 * NAO e membro da igreja. Por isso:
 *  - role = "ouvinte" (RBAC: so gravacoes:read)
 *  - entidade.vinculoIgreja = "FREQUENTADOR" (exclui de cron/campanhas)
 *  - acessoExpiraEm = virada do ano (expira; admin renova)
 *
 * Toda listagem de Rol/diretorio/selecao-de-pessoas deve filtrar com
 * `naoEhOuvinte` para nao tratar o ouvinte como membro.
 */

export const OUVINTE_ROLE = "ouvinte";

/** Vinculo de igreja do ouvinte (nao-membro). */
export const OUVINTE_VINCULO = "FREQUENTADOR" as const;

/** true se o registro NAO e um ouvinte — use como filtro de listas do Rol. */
export function naoEhOuvinte(m: { role: string }): boolean {
  return m.role !== OUVINTE_ROLE;
}

/** true se o registro e um ouvinte. */
export function ehOuvinte(m: { role: string }): boolean {
  return m.role === OUVINTE_ROLE;
}

/**
 * Timestamp de expiracao do acesso ouvinte: fim do ano corrente (31/12 23:59:59).
 * Usa UTC (Convex roda em UTC) — a defasagem de fuso para SP e irrelevante para
 * "expira na virada do ano".
 */
export function fimDoAnoMs(now: number): number {
  const ano = new Date(now).getUTCFullYear();
  return Date.UTC(ano, 11, 31, 23, 59, 59, 999);
}

/** true se o ouvinte esta com acesso vencido. */
export function ouvinteExpirado(
  membro: { role: string; acessoExpiraEm?: number },
  now: number
): boolean {
  if (membro.role !== OUVINTE_ROLE) return false;
  return membro.acessoExpiraEm !== undefined && membro.acessoExpiraEm < now;
}

/** Janela de aviso de expiracao: alerta o admin N dias antes do vencimento. */
export const OUVINTE_AVISO_MS = 15 * 24 * 60 * 60 * 1000;

/** true se o acesso ainda nao venceu mas expira dentro da janela de aviso. */
export function ouvinteExpiraEmBreve(
  membro: { role: string; acessoExpiraEm?: number },
  now: number
): boolean {
  if (membro.role !== OUVINTE_ROLE || membro.acessoExpiraEm === undefined) return false;
  return membro.acessoExpiraEm >= now && membro.acessoExpiraEm - now <= OUVINTE_AVISO_MS;
}
