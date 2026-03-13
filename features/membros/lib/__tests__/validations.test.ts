import { describe, it, expect } from "vitest";
import { membroFormSchema } from "../validations";

describe("membroFormSchema", () => {
  it("valida formulario minimo (apenas nome)", () => {
    const result = membroFormSchema.safeParse({ nomeCompleto: "João Silva" });
    expect(result.success).toBe(true);
  });

  it("rejeita nome com menos de 3 caracteres", () => {
    const result = membroFormSchema.safeParse({ nomeCompleto: "Jo" });
    expect(result.success).toBe(false);
  });

  it("rejeita sem nome", () => {
    const result = membroFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("aceita todos os campos opcionais", () => {
    const result = membroFormSchema.safeParse({
      nomeCompleto: "João da Silva",
      foto: "https://example.com/foto.jpg",
      cpf: "529.982.247-25",
      rg: "12.345.678-9",
      dataNascimento: "1990-01-15",
      sexo: "M",
      estadoCivil: "CASADO",
      nacionalidade: "Brasileiro",
      pai: "José da Silva",
      mae: "Maria da Silva",
      profissao: "Engenheiro",
      formacao: "SUPERIOR",
      whatsapp: "+5511999999999",
      telefone: "+551133334444",
      email: "joao@email.com",
      logradouro: "Rua A",
      numero: "123",
      complemento: "Apto 4",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01001-000",
      role: "membro",
      rol: "001",
      dataMembresia: "2020-03-15",
      formaAdmissao: "PROFISSAO_FE",
      cargoEclesiastico: "MEMBRO_COMUNGANTE",
      dataConversao: "2015-06-01",
      dataBatismo: "2016-01-10",
      igrejaProcedencia: "IPB Central",
    });
    expect(result.success).toBe(true);
  });

  describe("sexo", () => {
    it("aceita M e F", () => {
      expect(membroFormSchema.safeParse({ nomeCompleto: "Ana", sexo: "M" }).success).toBe(true);
      expect(membroFormSchema.safeParse({ nomeCompleto: "Ana", sexo: "F" }).success).toBe(true);
    });

    it("rejeita valores invalidos", () => {
      expect(membroFormSchema.safeParse({ nomeCompleto: "Ana", sexo: "X" }).success).toBe(false);
    });
  });

  describe("estadoCivil", () => {
    const validos = ["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO", "UNIAO_ESTAVEL"];

    for (const ec of validos) {
      it(`aceita ${ec}`, () => {
        expect(
          membroFormSchema.safeParse({ nomeCompleto: "Ana", estadoCivil: ec }).success
        ).toBe(true);
      });
    }

    it("rejeita valor invalido", () => {
      expect(
        membroFormSchema.safeParse({ nomeCompleto: "Ana", estadoCivil: "OUTRO" }).success
      ).toBe(false);
    });
  });

  describe("formacao", () => {
    const validos = ["FUNDAMENTAL", "MEDIO", "SUPERIOR", "POS_GRADUACAO", "MESTRADO", "DOUTORADO"];

    for (const f of validos) {
      it(`aceita ${f}`, () => {
        expect(
          membroFormSchema.safeParse({ nomeCompleto: "Ana", formacao: f }).success
        ).toBe(true);
      });
    }
  });

  describe("formaAdmissao", () => {
    const validos = ["BATISMO", "PROFISSAO_FE", "TRANSFERENCIA", "JURISDICAO"];

    for (const fa of validos) {
      it(`aceita ${fa}`, () => {
        expect(
          membroFormSchema.safeParse({ nomeCompleto: "Ana", formaAdmissao: fa }).success
        ).toBe(true);
      });
    }
  });

  describe("cargoEclesiastico", () => {
    const validos = ["MEMBRO_COMUNGANTE", "MEMBRO_NAO_COMUNGANTE", "DIACONO", "PRESBITERO", "PASTOR"];

    for (const ce of validos) {
      it(`aceita ${ce}`, () => {
        expect(
          membroFormSchema.safeParse({ nomeCompleto: "Ana", cargoEclesiastico: ce }).success
        ).toBe(true);
      });
    }
  });

  describe("email", () => {
    it("aceita email valido", () => {
      expect(
        membroFormSchema.safeParse({ nomeCompleto: "Ana", email: "ana@email.com" }).success
      ).toBe(true);
    });

    it("aceita string vazia (campo limpo)", () => {
      expect(
        membroFormSchema.safeParse({ nomeCompleto: "Ana", email: "" }).success
      ).toBe(true);
    });

    it("rejeita email invalido", () => {
      expect(
        membroFormSchema.safeParse({ nomeCompleto: "Ana", email: "nao-email" }).success
      ).toBe(false);
    });
  });
});
