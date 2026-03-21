import { z } from "zod/v4";

export const ministerioFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  icone: z.string().optional(),
  cor: z.string().optional(),
  papeis: z.array(z.string()).min(1, "Adicione pelo menos um papel"),
  subgrupos: z.array(z.string()).optional(),
});

export type MinisterioFormValues = z.infer<typeof ministerioFormSchema>;

export const addMembroFormSchema = z.object({
  membroId: z.string().min(1, "Selecione um membro"),
  papel: z.string().min(1, "Selecione um papel"),
  subgrupos: z.array(z.string()).optional(),
});

export type AddMembroFormValues = z.infer<typeof addMembroFormSchema>;
