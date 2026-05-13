/**
 * Helper derivado para tipoRol IPB (Constituicao Art. 12 e 23).
 *
 * Em vez de persistir tipoRol como campo, derivamos de cargoEclesiastico
 * e do status da entidade. Evita divergencia entre dois campos correlatos
 * espalhados por 11+ arquivos do projeto.
 *
 * Categorias:
 * - COMUNGANTE: maiores que fizeram profissao de fe (inclui oficiais)
 * - NAO_COMUNGANTE: batizados na infancia, ainda sem profissao de fe
 * - PARADEIRO_IGNORADO: ativos sem contato a mais de 1 ano (Art. 23 IPB)
 *
 * Regras:
 * - Apenas membros com `entidades.status = ATIVO` aparecem em rol oficial.
 * - PARADEIRO_IGNORADO so e retornado quando `entidade.status === "INATIVO"`
 *   por enquanto. Quando houver telemetria de ultimo contato, a logica
 *   pode considerar essa fonte. (Atualizar este helper quando isso existir.)
 */

export type TipoRol = "COMUNGANTE" | "NAO_COMUNGANTE" | "PARADEIRO_IGNORADO";

export type CargoEclesiastico =
  | "MEMBRO_COMUNGANTE"
  | "MEMBRO_NAO_COMUNGANTE"
  | "DIACONO"
  | "PRESBITERO"
  | "PASTOR";

export type StatusEntidade =
  | "ATIVO"
  | "INATIVO"
  | "TRANSFERIDO"
  | "FALECIDO"
  | "DESLIGADO";

/**
 * Deriva o tipo de rol IPB a partir de cargoEclesiastico + status da entidade.
 * Retorna null para membros que nao estao em rol oficial (TRANSFERIDO/FALECIDO/DESLIGADO).
 *
 * Se `tipoRolOverride` estiver preenchido (geralmente pelo cron de paradeiro
 * ignorado ou por intervencao manual do admin), ele tem prioridade sobre
 * a derivacao automatica.
 */
export function getTipoRol(
  cargoEclesiastico: CargoEclesiastico | undefined,
  statusEntidade: StatusEntidade,
  tipoRolOverride?: TipoRol
): TipoRol | null {
  if (
    statusEntidade === "TRANSFERIDO" ||
    statusEntidade === "FALECIDO" ||
    statusEntidade === "DESLIGADO"
  ) {
    return null;
  }

  if (tipoRolOverride) {
    return tipoRolOverride;
  }

  if (statusEntidade === "INATIVO") {
    return "PARADEIRO_IGNORADO";
  }

  if (cargoEclesiastico === "MEMBRO_NAO_COMUNGANTE") {
    return "NAO_COMUNGANTE";
  }

  return "COMUNGANTE";
}
