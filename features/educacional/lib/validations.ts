import { z } from "zod/v4";

export const criancaFormSchema = z.object({
  nomeCompleto: z.string().min(1, "Nome obrigatorio"),
  dataNascimento: z.string().optional(),
  sexo: z.enum(["M", "F"]).optional(),
  turma: z.string().min(1, "Selecione a turma"),
  usoImagem: z.enum(["AUTORIZADO", "NAO_AUTORIZADO", "PENDENTE"]),
  observacoesMedicas: z.string().optional(),
  observacoesFamilia: z.string().optional(),
  ovelhinhaId: z.string().optional(),
});

export type CriancaFormValues = z.infer<typeof criancaFormSchema>;

export const relatorioFormSchema = z.object({
  turma: z.string().min(1, "Selecione a turma"),
  data: z.string().min(1, "Informe a data"),
  professores: z.string().min(1, "Informe os professores"),
  observacoes: z.string().optional(),
  presentes: z.array(z.string()),
  // Conteudo da licao
  numero: z.string().optional(), // convertido p/ number na submissao
  tema: z.string().optional(),
  textosBaseText: z.string().optional(), // um por linha
  passagemMemorizar: z.string().optional(),
  historia: z.string().optional(),
  aplicacao: z.string().optional(),
  licaoDeCasa: z.string().optional(),
  visitantesText: z.string().optional(), // um por linha
});

export type RelatorioFormValues = z.infer<typeof relatorioFormSchema>;

export const escalaFormSchema = z.object({
  data: z.string().min(1, "Informe a data"),
  subgrupo: z.string().optional(),
  membros: z.array(z.object({
    membroId: z.string().min(1),
    papel: z.string().optional(),
  })).min(1, "Adicione pelo menos um membro"),
  observacoes: z.string().optional(),
});

export type EscalaFormValues = z.infer<typeof escalaFormSchema>;

export const voluntarioFormSchema = z.object({
  membroId: z.string().min(1, "Selecione o membro"),
  papelEdu: z.enum(["PROFESSOR", "AUXILIAR", "APOIO"]),
  turmasHabilitadas: z.array(z.string()),
  cbcm: z.enum(["NAO_INICIADO", "CURSANDO", "CONCLUIDO"]).optional(),
  cacValidade: z.string().optional(),
  certificadoCacUrl: z.string().optional(),
  observacoes: z.string().optional(),
});

export type VoluntarioFormValues = z.infer<typeof voluntarioFormSchema>;
