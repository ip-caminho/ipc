import { describe, it, expect } from "vitest";
import { calculateCompleteness, isStale, REQUIRED_FIELDS } from "../completeness";

const EMPTY_ENTIDADE = {};
const EMPTY_MEMBRO = {};

const FULL_ENTIDADE = {
  nomeCompleto: "João Silva",
  cpf: "12345678900",
  dataNascimento: "1990-01-01",
  sexo: "M",
  estadoCivil: "CASADO",
  nacionalidade: "Brasileiro",
  whatsapp: "11999999999",
  email: "joao@email.com",
  endereco: {
    logradouro: "Rua A",
    numero: "100",
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP",
    cep: "01000000",
  },
  contatoEmergencia: {
    nome: "Maria Silva",
    telefone: "11888888888",
    parentesco: "Esposa",
  },
  profissao: "Engenheiro",
  foto: "https://cdn.example.com/foto.jpg",
};

const FULL_MEMBRO = {
  dataBatismo: "2010-06-15",
  dataMembresia: "2010-07-01",
  formaAdmissao: "BATISMO" as const,
};

describe("REQUIRED_FIELDS", () => {
  it("tem 13 campos obrigatorios", () => {
    expect(REQUIRED_FIELDS).toHaveLength(13);
  });

  it("cada campo tem key, label e check", () => {
    for (const field of REQUIRED_FIELDS) {
      expect(field.key).toBeTruthy();
      expect(field.label).toBeTruthy();
      expect(typeof field.check).toBe("function");
    }
  });
});

describe("calculateCompleteness", () => {
  it("retorna 100% para perfil completo", () => {
    const result = calculateCompleteness(FULL_ENTIDADE, FULL_MEMBRO);
    expect(result.percentage).toBe(100);
    expect(result.filled).toBe(13);
    expect(result.total).toBe(13);
    expect(result.missing).toEqual([]);
  });

  it("retorna 0% para perfil vazio", () => {
    const result = calculateCompleteness(EMPTY_ENTIDADE, EMPTY_MEMBRO);
    expect(result.percentage).toBe(0);
    expect(result.filled).toBe(0);
    expect(result.total).toBe(13);
    expect(result.missing).toHaveLength(13);
  });

  it("calcula porcentagem parcial corretamente", () => {
    const entidade = { nomeCompleto: "Ana", whatsapp: "11999" };
    const result = calculateCompleteness(entidade, EMPTY_MEMBRO);
    expect(result.filled).toBe(2);
    expect(result.total).toBe(13);
    expect(result.percentage).toBe(15);
    expect(result.missing).toHaveLength(11);
  });

  it("aceita email OU telefone como contatoSecundario", () => {
    const comEmail = calculateCompleteness({ email: "a@b.com" }, EMPTY_MEMBRO);
    const comTelefone = calculateCompleteness({ telefone: "1199" }, EMPTY_MEMBRO);
    const semNenhum = calculateCompleteness({}, EMPTY_MEMBRO);

    expect(comEmail.missing.find((m) => m.key === "contatoSecundario")).toBeUndefined();
    expect(comTelefone.missing.find((m) => m.key === "contatoSecundario")).toBeUndefined();
    expect(semNenhum.missing.find((m) => m.key === "contatoSecundario")).toBeDefined();
  });

  it("endereco incompleto conta como nao preenchido", () => {
    const parcial = { endereco: { logradouro: "Rua A" } };
    const result = calculateCompleteness(parcial, EMPTY_MEMBRO);
    expect(result.missing.find((m) => m.key === "endereco")).toBeDefined();
  });

  it("endereco completo (logradouro+cidade+estado+cep) conta como preenchido", () => {
    const completo = {
      endereco: { logradouro: "Rua A", cidade: "SP", estado: "SP", cep: "01000" },
    };
    const result = calculateCompleteness(completo, EMPTY_MEMBRO);
    expect(result.missing.find((m) => m.key === "endereco")).toBeUndefined();
  });

  it("contatoEmergencia incompleto conta como nao preenchido", () => {
    const parcial = { contatoEmergencia: { nome: "Maria" } };
    const result = calculateCompleteness(parcial, EMPTY_MEMBRO);
    expect(result.missing.find((m) => m.key === "contatoEmergencia")).toBeDefined();
  });

  it("contatoEmergencia completo conta como preenchido", () => {
    const completo = {
      contatoEmergencia: { nome: "Maria", telefone: "119", parentesco: "Mae" },
    };
    const result = calculateCompleteness(completo, EMPTY_MEMBRO);
    expect(result.missing.find((m) => m.key === "contatoEmergencia")).toBeUndefined();
  });

  it("dadosIncertos reduzem o denominador", () => {
    const result = calculateCompleteness(EMPTY_ENTIDADE, EMPTY_MEMBRO, [
      "dataBatismo",
      "profissao",
      "foto",
    ]);
    expect(result.total).toBe(10);
    expect(result.missing).toHaveLength(10);
    expect(result.missing.find((m) => m.key === "dataBatismo")).toBeUndefined();
  });

  it("100% possivel quando dadosIncertos cobrem campos vazios", () => {
    const incertos = REQUIRED_FIELDS.map((f) => f.key);
    const result = calculateCompleteness(EMPTY_ENTIDADE, EMPTY_MEMBRO, incertos);
    expect(result.percentage).toBe(100);
    expect(result.total).toBe(0);
    expect(result.filled).toBe(0);
  });

  it("campos de membro (dataBatismo, dataMembresia, formaAdmissao) verificados corretamente", () => {
    const result = calculateCompleteness(EMPTY_ENTIDADE, FULL_MEMBRO);
    expect(result.missing.find((m) => m.key === "dataBatismo")).toBeUndefined();
    expect(result.missing.find((m) => m.key === "dataMembresia")).toBeUndefined();
    expect(result.missing.find((m) => m.key === "formaAdmissao")).toBeUndefined();
  });
});

describe("isStale", () => {
  const NOW = 1716681600000; // 2024-05-26 arbitrary fixed timestamp
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

  it("retorna true quando nunca atualizado", () => {
    expect(isStale(undefined, NOW)).toBe(true);
  });

  it("retorna true quando > 6 meses", () => {
    const sevenMonthsAgo = NOW - SIX_MONTHS_MS - 1;
    expect(isStale(sevenMonthsAgo, NOW)).toBe(true);
  });

  it("retorna false quando < 6 meses", () => {
    const ontem = NOW - 24 * 60 * 60 * 1000;
    expect(isStale(ontem, NOW)).toBe(false);
  });

  it("retorna false no limite exato de 6 meses", () => {
    const exato = NOW - SIX_MONTHS_MS;
    expect(isStale(exato, NOW)).toBe(false);
  });
});
