import { z } from "zod/v4";

export const membroFormSchema = z.object({
  // Entidade PF fields
  foto: z.string().optional(),
  nomeCompleto: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  apelido: z.string().optional(),
  cpf: z.string().optional(),
  tipoDocumento: z.enum(["RG", "RNE", "RNM"]).optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  sexo: z.enum(["M", "F"]).optional(),
  estadoCivil: z.enum(["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO", "UNIAO_ESTAVEL"]).optional(),
  nacionalidade: z.string().optional(),
  pai: z.string().optional(),
  mae: z.string().optional(),
  profissao: z.string().optional(),
  formacao: z.enum(["FUNDAMENTAL", "MEDIO", "SUPERIOR", "POS_GRADUACAO", "MESTRADO", "DOUTORADO"]).optional(),
  whatsapp: z.string().optional(),
  telefone: z.string().optional(),
  email: z.email("Email invalido").optional().or(z.literal("")),

  // Endereco
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),

  // Membro fields
  role: z.string().optional(),
  rol: z.string().optional(),
  dataMembresia: z.string().optional(),
  formaAdmissao: z.enum(["BATISMO", "PROFISSAO_FE", "TRANSFERENCIA", "JURISDICAO"]).optional(),
  cargoEclesiastico: z.enum(["MEMBRO_COMUNGANTE", "MEMBRO_NAO_COMUNGANTE", "DIACONO", "PRESBITERO", "PASTOR"]).optional(),
  dataConversao: z.string().optional(),
  dataBatismo: z.string().optional(),
  igrejaProcedencia: z.string().optional(),

  // Compliance (CBCM)
  cbcm: z.enum(["NAO_INICIADO", "CURSANDO", "CONCLUIDO"]).optional(),
  atestadoAntecedentes: z.string().optional(),
});

export type MembroFormValues = z.infer<typeof membroFormSchema>;
