import { z } from "zod/v4";

export const tarefaFormSchema = z.object({
  titulo: z.string().min(1, "Titulo obrigatorio").max(200),
  descricao: z.string().max(2000).optional(),
  prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]),
  responsavelId: z.string().min(1, "Responsavel obrigatorio"),
  dataVencimento: z.string().optional(),
  moduloRelacionado: z.enum([
    "ministerios", "escalas", "calendario", "pequenos-grupos",
    "pastoreio", "gravacoes", "pedidos-oracao",
  ]).optional(),
  referenciaId: z.string().optional(),
  referenciaTitulo: z.string().optional(),
});

export type TarefaFormValues = z.infer<typeof tarefaFormSchema>;
