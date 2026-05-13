/**
 * Helpers de campanha sem dependencia do runtime Convex (pura logica).
 * Os calculos de jitter, anti-spam e elegibilidade vivem aqui para
 * facilitar testes unitarios.
 */

/**
 * Janela anti-spam: maximo de envios por membro nos ultimos N dias.
 */
export const ANTISPAM_MAX_ENVIOS = 3;
export const ANTISPAM_JANELA_DIAS = 30;

/**
 * Intervalo de jitter entre envios (ms). Conservador para reduzir
 * risco de ban pelo WuzAPI/WhatsApp.
 */
export const JITTER_MIN_MS = 30_000;
export const JITTER_MAX_MS = 90_000;

/**
 * Calcula um delay aleatorio entre JITTER_MIN_MS e JITTER_MAX_MS.
 * Exportada para permitir mock em testes.
 */
export function calcularJitter(random: () => number = Math.random): number {
  return Math.floor(
    JITTER_MIN_MS + random() * (JITTER_MAX_MS - JITTER_MIN_MS)
  );
}

/**
 * Verifica se o membro excedeu o limite anti-spam dado um array
 * de timestamps de envios. Retorna `true` se PODE receber, `false`
 * se excedeu.
 */
export function podeReceberCampanha(
  enviadosEm: Array<number>,
  agora: number = Date.now()
): boolean {
  const janelaMs = ANTISPAM_JANELA_DIAS * 24 * 60 * 60 * 1000;
  const recentes = enviadosEm.filter((ts) => agora - ts < janelaMs);
  return recentes.length < ANTISPAM_MAX_ENVIOS;
}

/**
 * Substitui variaveis no template. Suporta {nome}, {apelido}, {url}.
 * Sem fallback magico - variavel ausente vira string vazia.
 */
export function renderizarTemplate(
  template: string,
  vars: Record<string, string | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}
