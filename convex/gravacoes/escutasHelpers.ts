/**
 * Pure escutas (listening tracking) helper functions extracted for testability.
 * Used by escutas.ts mutations — no Convex runtime dependency.
 */

const COMPLETION_THRESHOLD = 90;

/**
 * Calculate listening progress percentage (0–100).
 */
export function calcProgress(currentTime: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.round((currentTime / duration) * 100));
}

/**
 * Determine if listening is considered complete (>= 90%).
 */
export function isComplete(progresso: number): boolean {
  return progresso >= COMPLETION_THRESHOLD;
}

/**
 * Merge a new heartbeat into an existing escuta record.
 * Progress and position only advance forward (never regress).
 * Once marked complete, stays complete.
 */
export function mergeHeartbeat(
  existing: {
    progresso: number;
    ultimoSegundo: number;
    completou: boolean;
  },
  newProgresso: number,
  newCurrentTime: number
): {
  progresso: number;
  ultimoSegundo: number;
  completou: boolean;
} {
  return {
    progresso: Math.max(existing.progresso, newProgresso),
    ultimoSegundo: Math.max(existing.ultimoSegundo, newCurrentTime),
    completou: existing.completou || isComplete(Math.max(existing.progresso, newProgresso)),
  };
}

/**
 * Limites do "continuar ouvindo", em porcentagem (0-100) — a mesma escala que
 * `calcProgress` grava e que o schema documenta.
 *
 * Abaixo do minimo a pessoa mal comecou (encostou no play); acima do maximo
 * praticamente terminou, e retomar nos ultimos segundos nao ajuda ninguem.
 */
export const CONTINUAR_MIN_PCT = 5;
export const CONTINUAR_MAX_PCT = 95;

/**
 * A escuta esta em andamento — comecou de verdade e ainda nao acabou.
 *
 * Cuidado com a escala: comparar contra 0.05/0.95 (fracao) descarta todos os
 * registros e faz `continuarOuvindo` varrer o historico inteiro do membro sem
 * nunca achar nada.
 */
export function emAndamento(escuta: {
  completou: boolean;
  progresso: number;
}): boolean {
  return (
    !escuta.completou &&
    escuta.progresso > CONTINUAR_MIN_PCT &&
    escuta.progresso < CONTINUAR_MAX_PCT
  );
}

/**
 * O heartbeat so precisa escrever quando algo de fato avancou. Sem isso, um
 * audio pausado (ou reouvindo trecho ja ouvido) grava a cada 15s e invalida
 * todos os indices da tabela a troco de nada.
 */
export function heartbeatMudou(
  existing: {
    progresso: number;
    ultimoSegundo: number;
    completou: boolean;
    duracaoTotal: number;
  },
  merged: { progresso: number; ultimoSegundo: number; completou: boolean },
  duracaoTotal: number
): boolean {
  return (
    merged.progresso !== existing.progresso ||
    merged.ultimoSegundo !== existing.ultimoSegundo ||
    merged.completou !== existing.completou ||
    duracaoTotal !== existing.duracaoTotal
  );
}
