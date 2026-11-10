export const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "TRANSFERIDO", label: "Transferido" },
  { value: "FALECIDO", label: "Falecido" },
  { value: "DESLIGADO", label: "Desligado" },
] as const;

export const CARGO_ECLESIASTICO_OPTIONS = [
  { value: "MEMBRO_COMUNGANTE", label: "Membro Comungante" },
  { value: "MEMBRO_NAO_COMUNGANTE", label: "Membro Não Comungante" },
  { value: "DIACONO", label: "Diácono" },
  { value: "PRESBITERO", label: "Presbítero" },
  { value: "PASTOR", label: "Pastor" },
] as const;

export const FORMA_ADMISSAO_OPTIONS = [
  { value: "BATISMO", label: "Batismo" },
  { value: "PROFISSAO_FE", label: "Profissão de Fé" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "JURISDICAO", label: "Jurisdição" },
  { value: "RESTAURACAO", label: "Restauração" },
  { value: "BATISMO_INFANCIA", label: "Batismo na Infância" },
  { value: "JURISDICAO_EX_OFFICIO", label: "Jurisdição Ex Officio" },
  { value: "DESIGNACAO_PRESBITERIO", label: "Designação do Presbitério" },
] as const;

export const FORMA_DEMISSAO_OPTIONS = [
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "EXCLUSAO", label: "Exclusão Disciplinar" },
  { value: "FALECIMENTO", label: "Falecimento" },
  { value: "PEDIDO_DEMISSAO", label: "Pedido de Demissão" },
  { value: "JURISDICAO", label: "Mudança de Jurisdição" },
] as const;

export const MOTIVO_DEMISSAO_OPTIONS = [
  { value: "DISCIPLINA", label: "Disciplina" },
  { value: "AUSENCIA_PROLONGADA", label: "Ausência prolongada" },
  { value: "ABANDONO", label: "Abandono" },
  { value: "PEDIDO_PROPRIO", label: "Pedido próprio" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const TIPO_DOCUMENTO_OPTIONS = [
  { value: "RG", label: "RG" },
  { value: "RNE", label: "RNE" },
  { value: "RNM", label: "RNM" },
] as const;

export const SEXO_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
] as const;

export const ESTADO_CIVIL_OPTIONS = [
  { value: "SOLTEIRO", label: "Solteiro(a)" },
  { value: "CASADO", label: "Casado(a)" },
  { value: "DIVORCIADO", label: "Divorciado(a)" },
  { value: "VIUVO", label: "Viúvo(a)" },
  { value: "UNIAO_ESTAVEL", label: "União Estável" },
] as const;

export const FORMACAO_OPTIONS = [
  { value: "FUNDAMENTAL", label: "Fundamental" },
  { value: "MEDIO", label: "Médio" },
  { value: "SUPERIOR", label: "Superior" },
  { value: "POS_GRADUACAO", label: "Pós-Graduação" },
  { value: "MESTRADO", label: "Mestrado" },
  { value: "DOUTORADO", label: "Doutorado" },
] as const;

export const VINCULO_IGREJA_OPTIONS = [
  { value: "MEMBRO", label: "Membro" },
  { value: "FREQUENTADOR", label: "Frequentador" },
  { value: "VISITANTE", label: "Visitante" },
  { value: "EX_MEMBRO", label: "Ex-membro" },
  { value: "NAO_MEMBRO", label: "Não-membro" },
] as const;

// MEMBRO/DEPENDENTE nao sao papeis: membresia deriva de `membros` +
// `vinculoIgreja`. Papeis marcam so PJ (fornecedor/parceira) e PF nao-membro.
export const PAPEL_OPTIONS = [
  { value: "VISITANTE", label: "Visitante" },
  { value: "CONTATO", label: "Contato" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "IGREJA_PARCEIRA", label: "Igreja Parceira" },
] as const;

export const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "secretaria", label: "Secretaria" },
  { value: "secretario_executivo", label: "Secretário Executivo" },
  { value: "obreiro", label: "Obreiro" },
  { value: "membro", label: "Membro" },
] as const;

export const CBCM_OPTIONS = [
  { value: "NAO_INICIADO", label: "Não Iniciado" },
  { value: "CURSANDO", label: "Cursando" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-green-100 text-green-800",
  INATIVO: "bg-gray-100 text-gray-800",
  TRANSFERIDO: "bg-blue-100 text-blue-800",
  FALECIDO: "bg-gray-200 text-gray-600",
  DESLIGADO: "bg-red-100 text-red-800",
};
