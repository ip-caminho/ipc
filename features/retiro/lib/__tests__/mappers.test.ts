import { describe, it, expect } from "vitest";
import { whatsappParaForm, formToHospedagem, inscricaoToForm } from "../mappers";

describe("whatsappParaForm", () => {
  it("tira o +55 do E.164 (senao a mascara le o pais como DDD)", () => {
    expect(whatsappParaForm("+5511999998888")).toBe("11999998888");
    expect(whatsappParaForm("+551133334444")).toBe("1133334444");
  });

  it("mantem numero ja nacional e tolera vazio", () => {
    expect(whatsappParaForm("11999998888")).toBe("11999998888");
    expect(whatsappParaForm("")).toBe("");
    // Fixo de DDD 55 (Santa Maria/RS): 10 digitos, nao e codigo de pais
    expect(whatsappParaForm("5533334444")).toBe("5533334444");
  });
});

describe("inscricaoToForm", () => {
  const insc = {
    responsavel: { nome: "Ana", whatsapp: "+5511999998888" },
    participantes: [
      {
        nome: "Ana",
        dataNascimento: "1990-01-01",
        participaPalestras: true,
        membroId: undefined,
        membroNome: undefined,
      },
    ],
    hospedagem: {
      quartos: { individual: 0, duplo: 1, triplo: 0, quadruplo: 0 },
      camasExtras: 1,
      pets: 0,
    },
    extras: { observacao: "chega tarde" },
    pagamentoPreferido: { forma: "PARCELADO" as const, parcelas: 3, cpfPagante: "11144477735" },
  };

  it("achata o documento no shape do formulario", () => {
    const f = inscricaoToForm(insc as never);
    expect(f.responsavelWhatsapp).toBe("11999998888");
    expect(f.quartosDuplo).toBe(1);
    expect(f.camasExtras).toBe(1);
    expect(f.parcelas).toBe("3");
    expect(f.observacao).toBe("chega tarde");
    expect(f.colegaDeQuarto).toBe("");
  });

  it("volta a hospedagem para o shape do Convex", () => {
    const f = inscricaoToForm(insc as never);
    expect(formToHospedagem(f)).toEqual(insc.hospedagem);
  });
});
