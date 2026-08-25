import type { Doc } from "@/convex/_generated/dataModel";
import type { InscricaoEditValues } from "./validations";

// Conversao entre o documento aninhado da inscricao (Convex) e o shape FLAT
// usado pelo formulario (React Hook Form).

type InscricaoLike = Pick<
  Doc<"inscricoesRetiro">,
  "responsavel" | "participantes" | "hospedagem" | "extras" | "pagamentoPreferido"
>;

/**
 * O documento guarda o whatsapp em E.164 (+5511999998888), mas o campo do
 * formulario (PhoneInputBR) trabalha com os digitos nacionais. Sem tirar o
 * +55 a mascara leria o codigo do pais como DDD e cortaria os 2 ultimos
 * digitos do numero.
 */
export function whatsappParaForm(e164: string): string {
  const d = (e164 ?? "").replace(/\D/g, "");
  return d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
}

export function inscricaoToForm(insc: InscricaoLike): InscricaoEditValues {
  return {
    responsavelNome: insc.responsavel.nome,
    responsavelWhatsapp: whatsappParaForm(insc.responsavel.whatsapp),
    participantes: insc.participantes.map((p) => ({
      nome: p.nome,
      dataNascimento: p.dataNascimento,
      participaPalestras: p.participaPalestras,
      membroId: p.membroId ?? undefined,
    })),
    quartosIndividual: insc.hospedagem.quartos.individual,
    quartosDuplo: insc.hospedagem.quartos.duplo,
    quartosTriplo: insc.hospedagem.quartos.triplo,
    quartosQuadruplo: insc.hospedagem.quartos.quadruplo,
    camasExtras: insc.hospedagem.camasExtras,
    pets: insc.hospedagem.pets,
    colegaDeQuarto: insc.extras?.colegaDeQuarto ?? "",
    berco: insc.extras?.berco ?? false,
    necessidadesEspeciais: insc.extras?.necessidadesEspeciais ?? "",
    observacao: insc.extras?.observacao ?? "",
    forma: insc.pagamentoPreferido.forma,
    parcelas: insc.pagamentoPreferido.parcelas
      ? String(insc.pagamentoPreferido.parcelas)
      : undefined,
    cpfPagante: insc.pagamentoPreferido.cpfPagante ?? "",
    motivo: "",
  };
}

/** Hospedagem no shape do Convex (usado tambem no resumo de valor ao vivo). */
export function formToHospedagem(d: {
  quartosIndividual: number;
  quartosDuplo: number;
  quartosTriplo: number;
  quartosQuadruplo: number;
  camasExtras: number;
  pets: number;
}) {
  return {
    quartos: {
      individual: d.quartosIndividual,
      duplo: d.quartosDuplo,
      triplo: d.quartosTriplo,
      quadruplo: d.quartosQuadruplo,
    },
    camasExtras: d.camasExtras,
    pets: d.pets,
  };
}

/** Args da mutation retiro.mutations.editarInscricao. */
export function formToEditArgs(d: InscricaoEditValues) {
  return {
    responsavel: { nome: d.responsavelNome, whatsapp: d.responsavelWhatsapp },
    participantes: d.participantes.map((p) => ({
      nome: p.nome,
      dataNascimento: p.dataNascimento,
      participaPalestras: p.participaPalestras,
      membroId: (p.membroId || undefined) as never,
    })),
    hospedagem: formToHospedagem(d),
    extras: {
      colegaDeQuarto: d.colegaDeQuarto?.trim() || undefined,
      berco: d.berco || undefined,
      necessidadesEspeciais: d.necessidadesEspeciais?.trim() || undefined,
      observacao: d.observacao?.trim() || undefined,
    },
    pagamentoPreferido: {
      forma: d.forma,
      parcelas: d.forma === "PARCELADO" ? Number(d.parcelas) : undefined,
      cpfPagante: d.cpfPagante?.replace(/\D/g, "") || undefined,
    },
    motivo: d.motivo?.trim() || undefined,
  };
}
