import { z } from "zod/v4";

export const louvorFormSchema = z.object({
  titulo: z.string().min(1, "Titulo e obrigatorio"),
  artista: z.string().optional(),
  tom: z.string().optional(),
  tomHomem: z.string().optional(),
  tomMulher: z.string().optional(),
  bpm: z.coerce.number().int().min(1).max(300).optional().or(z.literal("")),
  tags: z.string().optional(),
  conteudo: z.string().optional(),
  youtubeUrl: z.string().url("URL invalida").optional().or(z.literal("")),
  spotifyUrl: z.string().url("URL invalida").optional().or(z.literal("")),
  observacoes: z.string().optional(),
  estrutura: z.string().optional(),
});

export type LouvorFormValues = z.infer<typeof louvorFormSchema>;
