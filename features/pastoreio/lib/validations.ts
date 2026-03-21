import { z } from "zod/v4";

export const visitaFormSchema = z.object({
  membroId: z.string().min(1, "Selecione o membro visitado"),
  visitanteId: z.string().min(1, "Selecione o visitante"),
  data: z.string().min(1, "Informe a data"),
  tipo: z.enum(["DOMICILIAR", "HOSPITALAR", "ACOLHIMENTO", "OUTRO"]),
  observacoes: z.string().optional(),
});

export type VisitaFormValues = z.infer<typeof visitaFormSchema>;

export const pedidoOracaoFormSchema = z.object({
  descricao: z.string().min(3, "Descreva seu pedido de oracao"),
});

export type PedidoOracaoFormValues = z.infer<typeof pedidoOracaoFormSchema>;

export const anotacaoFormSchema = z.object({
  membroId: z.string().min(1, "Selecione o membro"),
  texto: z.string().min(3, "Escreva a anotacao"),
});

export type AnotacaoFormValues = z.infer<typeof anotacaoFormSchema>;
