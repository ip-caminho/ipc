import { describe, it, expect } from "vitest";
import {
  normalizeToE164,
  normalizeForComparison,
  isValidBrazilianMobile,
  formatForDisplay,
  phonesMatch,
} from "../phoneUtils";

describe("normalizeToE164", () => {
  it("adiciona +55 a numero local", () => {
    expect(normalizeToE164("11999999999")).toBe("+5511999999999");
  });

  it("adiciona + quando comeca com 55", () => {
    expect(normalizeToE164("5511999999999")).toBe("+5511999999999");
  });

  it("mantem formato +55 inalterado", () => {
    expect(normalizeToE164("+5511999999999")).toBe("+5511999999999");
  });

  it("mantem outros codigos de pais", () => {
    expect(normalizeToE164("+14155551234")).toBe("+14155551234");
  });

  it("remove caracteres especiais", () => {
    expect(normalizeToE164("(11) 99999-9999")).toBe("+5511999999999");
  });

  it("remove sufixo JID do WhatsApp", () => {
    expect(normalizeToE164("5511999999999@s.whatsapp.net")).toBe("+5511999999999");
    expect(normalizeToE164("5511999999999@c.us")).toBe("+5511999999999");
  });
});

describe("normalizeForComparison", () => {
  it("retorna apenas digitos locais", () => {
    expect(normalizeForComparison("+5511999999999")).toBe("11999999999");
    expect(normalizeForComparison("5511999999999")).toBe("11999999999");
    expect(normalizeForComparison("11999999999")).toBe("11999999999");
  });

  it("limpa formatacao", () => {
    expect(normalizeForComparison("(11) 99999-9999")).toBe("11999999999");
  });

  it("remove JID", () => {
    expect(normalizeForComparison("5511999999999@s.whatsapp.net")).toBe("11999999999");
  });
});

describe("isValidBrazilianMobile", () => {
  it("aceita celular com 11 digitos (DDD + 9XXXX-XXXX)", () => {
    expect(isValidBrazilianMobile("11999999999")).toBe(true);
    expect(isValidBrazilianMobile("21912345678")).toBe(true);
  });

  it("aceita celular com codigo do pais", () => {
    expect(isValidBrazilianMobile("5511999999999")).toBe(true);
  });

  it("aceita formato antigo com 10 digitos", () => {
    expect(isValidBrazilianMobile("1199999999")).toBe(true);
  });

  it("rejeita numero muito curto", () => {
    expect(isValidBrazilianMobile("1234")).toBe(false);
  });

  it("rejeita fixo com 11 digitos que nao comeca com 9", () => {
    expect(isValidBrazilianMobile("11333344445")).toBe(false);
  });

  it("limpa formatacao antes de validar", () => {
    expect(isValidBrazilianMobile("(11) 99999-9999")).toBe(true);
  });
});

describe("formatForDisplay", () => {
  it("formata celular", () => {
    expect(formatForDisplay("11999999999")).toBe("(11) 99999-9999");
    expect(formatForDisplay("+5511999999999")).toBe("(11) 99999-9999");
  });

  it("formata fixo", () => {
    expect(formatForDisplay("1133334444")).toBe("(11) 3333-4444");
    expect(formatForDisplay("5511333344444")).toBe("(11) 33334-4444");
  });

  it("retorna original se formato desconhecido", () => {
    expect(formatForDisplay("123")).toBe("123");
  });
});

describe("phonesMatch", () => {
  it("compara numeros em formatos diferentes", () => {
    expect(phonesMatch("+5511999999999", "11999999999")).toBe(true);
    expect(phonesMatch("(11) 99999-9999", "5511999999999")).toBe(true);
  });

  it("detecta numeros diferentes", () => {
    expect(phonesMatch("+5511999999999", "+5521999999999")).toBe(false);
  });

  it("compara com JID do WhatsApp", () => {
    expect(phonesMatch("5511999999999@s.whatsapp.net", "(11) 99999-9999")).toBe(true);
  });
});
