import { describe, it, expect } from "vitest";
import {
  maskSensitiveValue,
  hasChanged,
  formatValue,
  collectChangedFields,
  SKIP_FIELDS,
  SENSITIVE_FIELDS,
} from "../auditHelpers";

describe("maskSensitiveValue", () => {
  it("mascara CPF formatado", () => {
    expect(maskSensitiveValue("cpf", "52998224725")).toBe("***.982.247-**");
  });

  it("mascara RG", () => {
    // slice(3, -2) on "123456789" = "4567"
    expect(maskSensitiveValue("rg", "123456789")).toBe("***4567**");
  });

  it("nao mascara campos nao-sensiveis", () => {
    expect(maskSensitiveValue("nome", "Joao")).toBe("Joao");
    expect(maskSensitiveValue("email", "a@b.com")).toBe("a@b.com");
  });

  it("nao mascara valores nao-string", () => {
    expect(maskSensitiveValue("cpf", 12345)).toBe(12345);
    expect(maskSensitiveValue("cpf", null)).toBe(null);
  });

  it("mascara valor curto com ***", () => {
    expect(maskSensitiveValue("cpf", "123")).toBe("***");
    expect(maskSensitiveValue("rg", "ab")).toBe("***");
  });
});

describe("hasChanged", () => {
  it("detecta valores iguais", () => {
    expect(hasChanged("a", "a")).toBe(false);
    expect(hasChanged(1, 1)).toBe(false);
    expect(hasChanged(null, null)).toBe(false);
    expect(hasChanged(undefined, undefined)).toBe(false);
    expect(hasChanged(null, undefined)).toBe(false);
  });

  it("detecta valores primitivos diferentes", () => {
    expect(hasChanged("a", "b")).toBe(true);
    expect(hasChanged(1, 2)).toBe(true);
    expect(hasChanged(null, "a")).toBe(true);
    expect(hasChanged("a", null)).toBe(true);
  });

  it("compara arrays", () => {
    expect(hasChanged([1, 2], [1, 2])).toBe(false);
    expect(hasChanged([1, 2], [1, 3])).toBe(true);
    expect(hasChanged([1, 2], [1, 2, 3])).toBe(true);
    expect(hasChanged([1], "nao-array")).toBe(true);
  });

  it("compara objetos", () => {
    expect(hasChanged({ a: 1 }, { a: 1 })).toBe(false);
    expect(hasChanged({ a: 1 }, { a: 2 })).toBe(true);
    expect(hasChanged({ a: 1 }, { a: 1, b: 2 })).toBe(true);
  });

  it("compara objetos aninhados", () => {
    expect(hasChanged({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
    expect(hasChanged({ a: { b: 1 } }, { a: { b: 2 } })).toBe(true);
  });
});

describe("formatValue", () => {
  it("retorna undefined para null/undefined", () => {
    expect(formatValue(null)).toBeUndefined();
    expect(formatValue(undefined)).toBeUndefined();
  });

  it("serializa objetos como JSON", () => {
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });

  it("retorna arrays e primitivos como estao", () => {
    expect(formatValue([1, 2])).toEqual([1, 2]);
    expect(formatValue("texto")).toBe("texto");
    expect(formatValue(42)).toBe(42);
    expect(formatValue(true)).toBe(true);
  });
});

describe("collectChangedFields", () => {
  it("detecta campos alterados", () => {
    const old = { nome: "Joao", email: "a@b.com" };
    const novo = { nome: "Maria", email: "a@b.com" };
    const changes = collectChangedFields(old, novo);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ field: "nome", from: "Joao", to: "Maria" });
  });

  it("detecta campos adicionados", () => {
    const old = { nome: "Joao" };
    const novo = { nome: "Joao", email: "a@b.com" };
    const changes = collectChangedFields(old, novo);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ field: "email", from: undefined, to: "a@b.com" });
  });

  it("detecta campos removidos", () => {
    const old = { nome: "Joao", email: "a@b.com" };
    const novo = { nome: "Joao" };
    const changes = collectChangedFields(old, novo);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ field: "email", from: "a@b.com", to: undefined });
  });

  it("ignora campos _id e _creationTime", () => {
    const old = { _id: "1", _creationTime: 100, nome: "Joao" };
    const novo = { _id: "2", _creationTime: 200, nome: "Joao" };
    const changes = collectChangedFields(old, novo);

    expect(changes).toHaveLength(0);
  });

  it("mascara campos sensiveis (CPF)", () => {
    const old = { cpf: "52998224725" };
    const novo = { cpf: "12345678909" };
    const changes = collectChangedFields(old, novo);

    expect(changes).toHaveLength(1);
    expect(changes[0].from).toBe("***.982.247-**");
    expect(changes[0].to).toBe("***.456.789-**");
  });

  it("detecta mudancas em objetos aninhados", () => {
    const old = { endereco: { cidade: "SP", estado: "SP" } };
    const novo = { endereco: { cidade: "RJ", estado: "SP" } };
    const changes = collectChangedFields(old, novo);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ field: "endereco.cidade", from: "SP", to: "RJ" });
  });

  it("retorna vazio quando nada mudou", () => {
    const old = { nome: "Joao", email: "a@b.com" };
    const novo = { nome: "Joao", email: "a@b.com" };
    const changes = collectChangedFields(old, novo);

    expect(changes).toHaveLength(0);
  });

  it("lida com null records", () => {
    expect(collectChangedFields(null, { a: 1 })).toEqual([
      { field: "a", from: undefined, to: 1 },
    ]);
    expect(collectChangedFields({ a: 1 }, null)).toEqual([
      { field: "a", from: 1, to: undefined },
    ]);
  });
});

describe("constantes", () => {
  it("SKIP_FIELDS contem _id e _creationTime", () => {
    expect(SKIP_FIELDS.has("_id")).toBe(true);
    expect(SKIP_FIELDS.has("_creationTime")).toBe(true);
  });

  it("SENSITIVE_FIELDS contem cpf e rg", () => {
    expect(SENSITIVE_FIELDS.has("cpf")).toBe(true);
    expect(SENSITIVE_FIELDS.has("rg")).toBe(true);
  });
});
