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

export const livroEdicaoSchema = livroFormSchema.pick({
  titulo: true,
  autores: true,
  editora: true,
  ano: true,
  categorias: true,
  descricao: true,
  capaUrl: true,
});

export type LivroEdicaoValues = z.infer<typeof livroEdicaoSchema>;

export const pessoaSemCadastroSchema = z.object({
  nome: z.string().trim().min(2),
  whatsapp: z.string().regex(/^\d{10,11}$/),
});
