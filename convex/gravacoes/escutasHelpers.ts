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
