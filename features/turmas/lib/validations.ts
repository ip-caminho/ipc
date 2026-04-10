import { z } from "zod/v4";

export const turmaFormSchema = z.object({
  nome: z.string().min(1, "Nome obrigatorio"),
  instrutorId: z.string().optional(),
  instrutorNome: z.string().optional(),
  descricao: z.string().optional(),
  dataInicio: z.string().min(1, "Data de inicio obrigatoria"),
  dataFim: z.string().optional(),
  diaSemana: z.string().optional(),
  horario: z.string().optional(),
  local: z.string().optional(),
  vagas: z.number().min(1).optional(),
  camposSistema: z.array(z.string()),
  perguntasExtras: z.array(z.object({
    id: z.string(),
    label: z.string(),
    obrigatorio: z.boolean(),
  })).optional(),
});

export type TurmaFormValues = z.infer<typeof turmaFormSchema>;

export const inscricaoPublicSchema = z.object({
  nomeCompleto: z.string().min(1, "Nome obrigatorio"),
  whatsapp: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  dataNascimento: z.string().optional(),
  sexo: z.string().optional(),
  lgpdConsentimento: z.literal(true, { message: "Consentimento obrigatorio" }),
});
