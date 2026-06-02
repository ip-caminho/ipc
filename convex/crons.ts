import { cronJobs, makeFunctionReference } from "convex/server";

const crons = cronJobs();

// Referencia por string: evita TS2589 (profundidade da arvore `internal`).
const refParadeiroIgnorado = makeFunctionReference<"mutation", Record<string, never>>(
  "cron/paradeiroIgnorado:run"
);

// Marca PARADEIRO_IGNORADO automaticamente para membros sem confirmacao > 12 meses
// Const IPB Art. 23.
crons.daily(
  "paradeiro ignorado",
  { hourUTC: 6, minuteUTC: 0 }, // 03:00 BRT
  refParadeiroIgnorado
);

export default crons;
