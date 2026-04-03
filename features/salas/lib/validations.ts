import { z } from "zod/v4";

export const reservaFormSchema = z.object({
  data: z.string().min(1, "Data e obrigatoria"),
  horaInicio: z.string().min(1, "Horario de inicio e obrigatorio"),
  horaFim: z.string().min(1, "Horario de termino e obrigatorio"),
  motivo: z.string().min(3, "Motivo deve ter pelo menos 3 caracteres"),
}).refine((data) => data.horaFim > data.horaInicio, {
  message: "Horario de termino deve ser posterior ao inicio",
  path: ["horaFim"],
});

export type ReservaFormValues = z.infer<typeof reservaFormSchema>;

// 30-min increments from 07:00 to 22:00
export const TIME_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});
