import { z } from "zod/v4";

export const cursoFormSchema = z.object({
  nome: z.string().min(1, "Nome obrigatorio"),
  descricao: z.string().optional(),
  ementa: z.string().optional(),
  cargaHoraria: z.number().min(1).optional(),
  totalAulas: z.number().min(1).optional(),
  frequenciaMinima: z
    .number()
    .min(0, "Minimo 0")
    .max(100, "Maximo 100"),
  criterioAprovacao: z.enum(["PERCENTUAL", "MAX_FALTAS"]).optional(),
  maxFaltas: z.number().min(0, "Minimo 0").optional(),
}).refine(
  (v) => v.criterioAprovacao !== "MAX_FALTAS" || typeof v.maxFaltas === "number",
  { message: "Informe o maximo de faltas", path: ["maxFaltas"] }
);

export type CursoFormValues = z.infer<typeof cursoFormSchema>;

export const turmaFormSchema = z.object({
  nome: z.string().min(1, "Nome obrigatorio"),
  cursoId: z.string().optional(),
  tipo: z.enum(["NOVOS_MEMBROS", "CATACUMENOS", "OUTRO"]).optional(),
  instrutorId: z.string().optional(),
  instrutorNome: z.string().optional(),
  descricao: z.string().optional(),
  dataInicio: z.string().min(1, "Data de inicio obrigatoria"),
  dataFim: z.string().optional(),
  inscricoesDe: z.string().optional(),
  inscricoesAte: z.string().optional(),
  publicarNoSite: z.boolean().optional(),
  diaSemana: z.string().optional(),
  horario: z.string().optional(),
  local: z.string().optional(),
  vagas: z.number().min(1).optional(),
  camposSistema: z.array(z.string()),
  // Espelha convex/schema.ts: sem tipo/opcoes/ajuda o form perderia a
  // definicao ao passar por aqui.
  perguntasExtras: z.array(z.object({
    id: z.string(),
    label: z.string(),
    obrigatorio: z.boolean(),
    tipo: z.enum(["TEXTO", "TEXTO_LONGO", "ESCOLHA_UNICA", "ESCOLHA_MULTIPLA"]).optional(),
    opcoes: z.array(z.string()).optional(),
    ajuda: z.string().optional(),
  })).optional(),
}).refine(
  (v) => !v.inscricoesDe || !v.inscricoesAte || v.inscricoesAte >= v.inscricoesDe,
  { message: "Encerramento antes da abertura", path: ["inscricoesAte"] }
);

export type TurmaFormValues = z.infer<typeof turmaFormSchema>;

export const inscricaoPublicSchema = z.object({
  nomeCompleto: z.string().min(1, "Nome obrigatorio"),
  whatsapp: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  dataNascimento: z.string().optional(),
  sexo: z.string().optional(),
  lgpdConsentimento: z.literal(true, { message: "Consentimento obrigatorio" }),
});
