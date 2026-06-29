import { z } from "zod/v4";

export const eventoFormSchema = z.object({
  titulo: z.string().min(2, "Titulo deve ter pelo menos 2 caracteres"),
  data: z.string().min(1, "Data e obrigatoria"),
  dataFim: z.string().optional(),
  ministerioId: z.string().optional(),
  descricao: z.string().optional(),
  // Categoria exibida na agenda publica
  tipo: z.enum(["evento", "pg", "reuniao"]).optional(),
});

export type EventoFormValues = z.infer<typeof eventoFormSchema>;
