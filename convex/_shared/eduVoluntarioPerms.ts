// Permissões derivadas de ser voluntário do educacional (Prof/Aux).
//
// Voluntário cadastrado em `eduVoluntarios` com papelEdu PROFESSOR ou AUXILIAR
// herda a capacidade de usar o módulo e preencher relatório/presença — sem o
// admin conceder manualmente. É computado no momento de resolver permissões
// (união aditiva), NUNCA gravado em membro.permissions[] — assim adicionar/
// remover o voluntário reflete na hora, sem drift nem revogação frágil.

// Conjunto Professor herdado.
export const EDU_VOLUNTARIO_DERIVED = [
  "criancas:read",
  "educacional:read",
  "relatorio_edu:write",
] as const;

// Papéis de voluntário que herdam. APOIO fica só no cadastro.
const PAPEIS_QUE_HERDAM = new Set(["PROFESSOR", "AUXILIAR"]);

/** Permissões derivadas para um papel de voluntário (puro, testável). */
export function derivedPermsForPapel(papelEdu?: string | null): string[] {
  if (papelEdu && PAPEIS_QUE_HERDAM.has(papelEdu)) {
    return [...EDU_VOLUNTARIO_DERIVED];
  }
  return [];
}

/** Une base + derivadas sem duplicar. Base com "*" (admin) fica intacta. */
export function mergeDerived(base: string[], derived: string[]): string[] {
  if (base.includes("*")) return base;
  if (derived.length === 0) return base;
  const set = new Set(base);
  for (const p of derived) set.add(p);
  return [...set];
}

/**
 * Lê eduVoluntarios do membro e retorna as permissões derivadas.
 * Uma leitura indexada (by_membro). Retorna [] se não é voluntário Prof/Aux.
 */
export async function derivedEduVoluntarioPerms(
  ctx: any,
  membroId: any
): Promise<string[]> {
  const vol = await ctx.db
    .query("eduVoluntarios")
    .withIndex("by_membro", (q: any) => q.eq("membroId", membroId))
    .first();
  return derivedPermsForPapel(vol?.papelEdu);
}
