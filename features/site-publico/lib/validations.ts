import { z } from "zod/v4";

// Schema do editor de Informações da igreja (painel /admin/site-publico).
// Todos opcionais: salvar parcialmente é válido. `horarios` é lista editável.
export const horarioSchema = z.object({
  dia: z.string().min(1, "Dia obrigatório"),
  horario: z.string().min(1, "Horário obrigatório"),
  tipo: z.string().optional(),
});

export const igrejaInfoSchema = z.object({
  nome: z.string().optional(),
  descricao: z.string().optional(),
  endereco: z.string().optional(),
  googleMapsEmbed: z.string().optional(),
  horarios: z.array(horarioSchema).optional(),
  whatsapp: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  pix: z.string().optional(),
});

export type IgrejaInfoFormValues = z.infer<typeof igrejaInfoSchema>;
