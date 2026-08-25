import { z } from "zod/v4";
import { isValidCPF } from "@shared/lib/validations/brazilian";

// Schemas da inscricao do retiro, compartilhados entre o formulario publico
// (RetiroForm) e a edicao da secretaria (InscricaoEditForm). O shape e FLAT —
// os mappers em ./mappers.ts convertem de/para o documento aninhado do Convex.

export const hojeIso = () => new Date().toISOString().slice(0, 10);

export const participanteSchema = z.object({
  nome: z.string().trim().min(3, "Nome completo"),
  dataNascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data")
    .refine((d) => d < hojeIso(), "Data no futuro"),
  participaPalestras: z.boolean(),
  // Vinculo com o cadastro de membro (pre-preenchimento no publico, matching
  // no admin). Reconfirmado no servidor.
  membroId: z.string().optional(),
});

export const inscricaoBaseShape = {
  responsavelNome: z.string().trim().min(3, "Informe seu nome"),
  responsavelWhatsapp: z.string().refine((s) => {
    const d = s.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 15;
  }, "WhatsApp inválido"),
  participantes: z.array(participanteSchema).min(1, "Adicione ao menos um participante").max(10),
  quartosIndividual: z.number().int().min(0),
  quartosDuplo: z.number().int().min(0),
  quartosTriplo: z.number().int().min(0),
  quartosQuadruplo: z.number().int().min(0),
  camasExtras: z.number().int().min(0),
  pets: z.number().int().min(0),
  colegaDeQuarto: z.string().optional(),
  berco: z.boolean(),
  necessidadesEspeciais: z.string().optional(),
  observacao: z.string().optional(),
  forma: z.enum(["A_VISTA", "PARCELADO"]),
  parcelas: z.string().optional(),
  cpfPagante: z.string().refine((s) => isValidCPF(s ?? ""), "CPF do pagante inválido"),
};

// Regras que valem nos dois formularios: ao menos 1 quarto e parcelas 2..12.
export function comRegrasDeInscricao<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (d: any) =>
        d.quartosIndividual + d.quartosDuplo + d.quartosTriplo + d.quartosQuadruplo > 0,
      { message: "Escolha ao menos um quarto", path: ["quartosDuplo"] },
    )
    .refine(
      (d: any) => d.forma !== "PARCELADO" || (Number(d.parcelas) >= 2 && Number(d.parcelas) <= 12),
      { message: "Escolha de 2 a 12 parcelas", path: ["parcelas"] },
    );
}

// Edicao pela secretaria: sem LGPD/honeypot, com motivo opcional.
export const inscricaoEditSchema = comRegrasDeInscricao(
  z.object({
    ...inscricaoBaseShape,
    motivo: z.string().optional(),
  }),
);

export type InscricaoEditValues = z.infer<typeof inscricaoEditSchema>;
