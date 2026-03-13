import { describe, it, expect } from "vitest";
import { SELF_SERVICE_FIELDS, filterSelfServiceFields } from "../selfServiceHelpers";

describe("SELF_SERVICE_FIELDS", () => {
  it("contem campos permitidos", () => {
    expect(SELF_SERVICE_FIELDS.has("telefone")).toBe(true);
    expect(SELF_SERVICE_FIELDS.has("email")).toBe(true);
    expect(SELF_SERVICE_FIELDS.has("endereco")).toBe(true);
    expect(SELF_SERVICE_FIELDS.has("profissao")).toBe(true);
    expect(SELF_SERVICE_FIELDS.has("formacao")).toBe(true);
    expect(SELF_SERVICE_FIELDS.has("foto")).toBe(true);
  });

  it("nao contem campos administrativos", () => {
    expect(SELF_SERVICE_FIELDS.has("cpf")).toBe(false);
    expect(SELF_SERVICE_FIELDS.has("rg")).toBe(false);
    expect(SELF_SERVICE_FIELDS.has("nomeCompleto")).toBe(false);
    expect(SELF_SERVICE_FIELDS.has("role")).toBe(false);
    expect(SELF_SERVICE_FIELDS.has("permissions")).toBe(false);
    expect(SELF_SERVICE_FIELDS.has("status")).toBe(false);
    expect(SELF_SERVICE_FIELDS.has("dataNascimento")).toBe(false);
  });
});

describe("filterSelfServiceFields", () => {
  it("permite campos self-service", () => {
    const result = filterSelfServiceFields({
      telefone: "+5511999999999",
      email: "novo@email.com",
    });
    expect(result).toEqual({
      telefone: "+5511999999999",
      email: "novo@email.com",
    });
  });

  it("filtra campos nao permitidos", () => {
    const result = filterSelfServiceFields({
      telefone: "+5511999999999",
      cpf: "12345678900",
      role: "admin",
      nomeCompleto: "Hacker",
    });
    expect(result).toEqual({ telefone: "+5511999999999" });
  });

  it("retorna null quando nenhum campo é permitido", () => {
    const result = filterSelfServiceFields({
      cpf: "12345678900",
      role: "admin",
      nomeCompleto: "Hacker",
    });
    expect(result).toBeNull();
  });

  it("retorna null para objeto vazio", () => {
    expect(filterSelfServiceFields({})).toBeNull();
  });

  it("preserva valores undefined e null nos campos permitidos", () => {
    const result = filterSelfServiceFields({
      telefone: null,
      email: undefined,
    });
    expect(result).toEqual({
      telefone: null,
      email: undefined,
    });
  });

  it("aceita todos os 6 campos self-service", () => {
    const data = {
      telefone: "123",
      email: "a@b.com",
      endereco: "Rua A",
      profissao: "Dev",
      formacao: "SUPERIOR",
      foto: "https://url.com/foto.jpg",
    };
    const result = filterSelfServiceFields(data);
    expect(result).toEqual(data);
  });

  it("filtra mistura de campos permitidos e nao-permitidos", () => {
    const result = filterSelfServiceFields({
      telefone: "123",
      cpf: "000",
      foto: "url",
      role: "admin",
      status: "ATIVO",
      profissao: "Eng",
    });
    expect(result).toEqual({
      telefone: "123",
      foto: "url",
      profissao: "Eng",
    });
  });
});
