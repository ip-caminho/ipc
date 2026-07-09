import type { MembroFormValues } from "./validations";

/** Monta o objeto endereco a partir do form (undefined se vazio). */
export function buildEndereco(data: MembroFormValues) {
  if (!data.logradouro && !data.cidade) return undefined;
  return {
    logradouro: data.logradouro || "",
    numero: data.numero || "",
    complemento: data.complemento,
    bairro: data.bairro || "",
    cidade: data.cidade || "",
    estado: data.estado || "",
    cep: data.cep || "",
  };
}

/**
 * Campos de entidade (dados pessoais) do form -> payload de mutation.
 * Fonte unica do mapeamento, usada na criacao (/membros/novo)
 * e na edicao pessoal (/membros/[id]).
 */
export function mapFormToEntidadeData(data: MembroFormValues) {
  return {
    nomeCompleto: data.nomeCompleto,
    apelido: data.apelido || undefined,
    foto: data.foto || undefined,
    cpf: data.cpf || undefined,
    tipoDocumento: data.tipoDocumento || undefined,
    rg: data.rg || undefined,
    dataNascimento: data.dataNascimento || undefined,
    sexo: data.sexo || undefined,
    estadoCivil: data.estadoCivil || undefined,
    nacionalidade: data.nacionalidade || undefined,
    pai: data.pai || undefined,
    mae: data.mae || undefined,
    profissao: data.profissao || undefined,
    formacao: data.formacao || undefined,
    whatsapp: data.whatsapp || undefined,
    telefone: data.telefone || undefined,
    email: data.email || undefined,
    endereco: buildEndereco(data),
    vinculoIgreja: data.vinculoIgreja || undefined,
    cbcm: data.cbcm || undefined,
    atestadoAntecedentes: data.atestadoAntecedentes || undefined,
  };
}
