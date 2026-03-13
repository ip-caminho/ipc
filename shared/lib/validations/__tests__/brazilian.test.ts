import { describe, it, expect } from "vitest";
import {
  isValidCPF,
  isValidCNPJ,
  formatCPF,
  formatCNPJ,
  formatPhone,
} from "../brazilian";

describe("isValidCPF", () => {
  it("aceita CPF valido", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("rejeita CPF com digitos repetidos", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("000.000.000-00")).toBe(false);
    expect(isValidCPF("999.999.999-99")).toBe(false);
  });

  it("rejeita CPF com tamanho errado", () => {
    expect(isValidCPF("123")).toBe(false);
    expect(isValidCPF("1234567890")).toBe(false);
    expect(isValidCPF("123456789012")).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });

  it("rejeita CPF com digito verificador invalido", () => {
    expect(isValidCPF("529.982.247-26")).toBe(false);
    expect(isValidCPF("529.982.247-35")).toBe(false);
  });

  it("aceita CPF com formatacao variada", () => {
    expect(isValidCPF("529 982 247 25")).toBe(true);
    expect(isValidCPF("529-982-247-25")).toBe(true);
  });
});

describe("isValidCNPJ", () => {
  it("aceita CNPJ valido", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });

  it("rejeita CNPJ com digitos repetidos", () => {
    expect(isValidCNPJ("11.111.111/1111-11")).toBe(false);
    expect(isValidCNPJ("00.000.000/0000-00")).toBe(false);
  });

  it("rejeita CNPJ com tamanho errado", () => {
    expect(isValidCNPJ("123")).toBe(false);
    expect(isValidCNPJ("1234567890123")).toBe(false);
    expect(isValidCNPJ("123456789012345")).toBe(false);
    expect(isValidCNPJ("")).toBe(false);
  });

  it("rejeita CNPJ com digito verificador invalido", () => {
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
  });
});

describe("formatCPF", () => {
  it("formata CPF corretamente", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  it("retorna original se tamanho errado", () => {
    expect(formatCPF("123")).toBe("123");
    expect(formatCPF("")).toBe("");
  });

  it("limpa caracteres antes de formatar", () => {
    expect(formatCPF("529.982.247-25")).toBe("529.982.247-25");
  });
});

describe("formatCNPJ", () => {
  it("formata CNPJ corretamente", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("retorna original se tamanho errado", () => {
    expect(formatCNPJ("123")).toBe("123");
    expect(formatCNPJ("")).toBe("");
  });

  it("limpa caracteres antes de formatar", () => {
    expect(formatCNPJ("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });
});

describe("formatPhone", () => {
  it("formata celular (11 digitos)", () => {
    expect(formatPhone("11999999999")).toBe("(11) 99999-9999");
  });

  it("formata fixo (10 digitos)", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("remove codigo do pais 55", () => {
    expect(formatPhone("5511999999999")).toBe("(11) 99999-9999");
    expect(formatPhone("+5511999999999")).toBe("(11) 99999-9999");
  });

  it("retorna original se formato desconhecido", () => {
    expect(formatPhone("123")).toBe("123");
    expect(formatPhone("")).toBe("");
  });

  it("limpa caracteres especiais", () => {
    expect(formatPhone("(11) 99999-9999")).toBe("(11) 99999-9999");
  });
});
