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

  it("contem novos campos editaveis pelo membro", () => {
    expect(SELF_SERVICE_FIELDS.has("cpf")).toBe(true);
    expect(SELF_SERVICE_FIELDS.has("estadoCivil")).toBe(true);
    expect(SELF_SERVICE_FIELDS.has("nacionalidade")).toBe(true);
  });

  it("nao contem campos administrativos", () => {
    expect(SELF_SERVICE_FIELDS.has("rg")).toBe(false);
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
      role: "admin",
      status: "INATIVO",
    });
    expect(result).toEqual({ telefone: "+5511999999999" });
  });

  it("retorna null quando nenhum campo é permitido", () => {
    const result = filterSelfServiceFields({
      role: "admin",
      status: "INATIVO",
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

  it("aceita todos os campos self-service", () => {
    const data = {
      telefone: "123",
      email: "a@b.com",
      endereco: "Rua A",
      profissao: "Dev",
      formacao: "SUPERIOR",
      foto: "https://url.com/foto.jpg",
      apelido: "Joao",
      nomeSocial: "Joao Social",
      contatoEmergencia: { nome: "Maria", telefone: "+5511", parentesco: "Conjuge" },
      dadosIncertos: ["dataBatismo"],
    };
    const result = filterSelfServiceFields(data);
    expect(result).toEqual(data);
  });

  it("aceita nomeSocial e contatoEmergencia", () => {
    const result = filterSelfServiceFields({
      nomeSocial: "Nome Social",
      contatoEmergencia: { nome: "X", telefone: "Y", parentesco: "Z" },
      role: "should be filtered",
    });
    expect(result).toEqual({
      nomeSocial: "Nome Social",
      contatoEmergencia: { nome: "X", telefone: "Y", parentesco: "Z" },
    });
  });

  it("aceita dadosIncertos (marcacao 'nao lembro')", () => {
    const result = filterSelfServiceFields({
      dadosIncertos: ["dataBatismo", "dataConversao"],
    });
    expect(result).toEqual({
      dadosIncertos: ["dataBatismo", "dataConversao"],
    });
  });

  it("bloqueia campos sensiveis de rol mesmo com dadosIncertos", () => {
    const result = filterSelfServiceFields({
      dadosIncertos: ["x"],
      tipoRol: "COMUNGANTE",
      numeroMatricula: "123",
      cargoEclesiastico: "PASTOR",
    });
    expect(result).toEqual({ dadosIncertos: ["x"] });
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
      cpf: "000",
      foto: "url",
      profissao: "Eng",
    });
  });
});
