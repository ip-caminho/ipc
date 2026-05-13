import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Marca PARADEIRO_IGNORADO automaticamente para membros sem confirmacao > 12 meses
// Const IPB Art. 23.
crons.daily(
  "paradeiro ignorado",
  { hourUTC: 6, minuteUTC: 0 }, // 03:00 BRT
  internal.cron.paradeiroIgnorado.run
);

export default crons;
