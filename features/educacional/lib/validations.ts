import { z } from "zod/v4";

export const criancaFormSchema = z.object({
  nomeCompleto: z.string().min(1, "Nome obrigatorio"),
  dataNascimento: z.string().optional(),
  sexo: z.enum(["M", "F"]).optional(),
  turma: z.string().min(1, "Selecione a turma"),
  usoImagem: z.enum(["AUTORIZADO", "NAO_AUTORIZADO", "PENDENTE"]),
  observacoesMedicas: z.string().optional(),
  observacoesFamilia: z.string().optional(),
});

export type CriancaFormValues = z.infer<typeof criancaFormSchema>;

export const relatorioFormSchema = z.object({
  turma: z.string().min(1, "Selecione a turma"),
  data: z.string().min(1, "Informe a data"),
  professores: z.string().min(1, "Informe os professores"),
  observacoes: z.string().optional(),
  presentes: z.array(z.string()),
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
