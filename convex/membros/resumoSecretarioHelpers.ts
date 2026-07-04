/**
 * Calculo puro do resumo do Rol de Membros (sem dependencia de runtime do
 * Convex) — usado pela query getResumoSecretario e importado direto pelo
 * cliente, que deriva o resumo das linhas ja assinadas em vez de manter uma
 * segunda assinatura reativa recomputando a mesma base.
 */

export type ResumoSecretario = {
  comungantes: number;
  naoComungantes: number;
  ausentes: number;
  arquivo: number;
  totalRol: number;
  familias: number;
  dependentes: number;
  pendencias: number;
  civilmenteCapazes: number;
  pastores: number;
  presbiteros: number;
  diaconos: number;
  mandatosVencidos: number;
  mandatosVencendo: number;
};

type LinhaResumo = {
  ehMembro: boolean;
  pendencia: boolean;
  mandatoVencido: boolean;
  mandatoVencendo: boolean;
  cargoEclesiastico?: string;
  rolCategoria: "PRINCIPAL" | "SEPARADO" | "AUSENTE" | "ARQUIVO" | null;
  civilmenteCapazes?: boolean;
  familiaHeadId: string;
};

export function calcularResumoSecretario(linhas: LinhaResumo[]): ResumoSecretario {
  const familias = new Set<string>();
  let comungantes = 0, naoComungantes = 0, ausentes = 0, arquivo = 0;
  let dependentes = 0, pendencias = 0, civilmenteCapazes = 0;
  let pastores = 0, presbiteros = 0, diaconos = 0;
  let mandatosVencidos = 0, mandatosVencendo = 0;
  for (const l of linhas) {
    familias.add(l.familiaHeadId);
    if (!l.ehMembro) { dependentes++; continue; }
    if (l.pendencia) pendencias++;
    if (l.mandatoVencido) mandatosVencidos++;
    if (l.mandatoVencendo) mandatosVencendo++;
    if (l.cargoEclesiastico === "PASTOR") pastores++;
    else if (l.cargoEclesiastico === "PRESBITERO") presbiteros++;
    else if (l.cargoEclesiastico === "DIACONO") diaconos++;
    switch (l.rolCategoria) {
      case "PRINCIPAL":
        comungantes++;
        if (l.civilmenteCapazes) civilmenteCapazes++;
        break;
      case "SEPARADO": naoComungantes++; break;
      case "AUSENTE": ausentes++; break;
      case "ARQUIVO": arquivo++; break;
    }
  }
  return {
    comungantes,
    naoComungantes,
    ausentes,
    arquivo,
    totalRol: comungantes + naoComungantes,
    familias: familias.size,
    dependentes,
    pendencias,
    civilmenteCapazes,
    pastores,
    presbiteros,
    diaconos,
    mandatosVencidos,
    mandatosVencendo,
  };
}
