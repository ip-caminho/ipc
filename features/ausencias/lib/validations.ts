import { z } from "zod/v4";

export const ausenciaFormSchema = z
  .object({
    dataInicio: z.string().min(1, "Informe a data de início"),
    dataFim: z.string().optional(),
    motivo: z.string().optional(),
  })
  .refine((d) => !d.dataFim || d.dataFim >= d.dataInicio, {
    message: "A data final deve ser igual ou posterior ao início",
    path: ["dataFim"],
  });

export type AusenciaFormValues = z.infer<typeof ausenciaFormSchema>;
