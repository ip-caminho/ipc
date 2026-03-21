import { z } from "zod/v4";

export const pgFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  liderId: z.string().min(1, "Selecione um lider"),
  coliderId: z.string().optional(),
  diaSemana: z.string().optional(),
  horario: z.string().optional(),
  local: z.string().optional(),
});

export type PGFormValues = z.infer<typeof pgFormSchema>;
