import { z } from "zod/v4";

export const livroFormSchema = z.object({
  titulo: z.string().min(1, "Titulo obrigatorio"),
  autores: z.string().min(1, "Autor obrigatorio"), // separados por virgula
  editora: z.string().optional(),
  isbn: z.string().optional(),
  ano: z.number().optional(),
  categorias: z.array(z.string()),
  descricao: z.string().optional(),
  capaUrl: z.string().optional(),
  paginas: z.number().optional(),
  // Primeiro exemplar
  condicao: z.enum(["NOVO", "BOM", "REGULAR", "RUIM"]).optional(),
  doadorNome: z.string().optional(),
});

export type LivroFormValues = z.infer<typeof livroFormSchema>;
