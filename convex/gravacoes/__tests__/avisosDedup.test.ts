import { describe, it, expect } from "vitest";
import { normalizarTitulo, titulosSimilares } from "../iaHelpers";

describe("normalizarTitulo", () => {
  it("remove acentos, caixa e pontuacao", () => {
    expect(normalizarTitulo("Retiro de Jovens!")).toBe("retiro de jovens");
    expect(normalizarTitulo("  Reunião  de   Oração ")).toBe("reuniao de oracao");
    expect(normalizarTitulo("Culto — Santa Ceia")).toBe("culto santa ceia");
  });
});

describe("titulosSimilares", () => {
  it("iguais exatos", () => {
    expect(titulosSimilares("Retiro de Jovens", "Retiro de Jovens")).toBe(true);
  });

  it("so difere em acento/caixa", () => {
    expect(titulosSimilares("Retiro de Jovens", "retiro de jovens")).toBe(true);
    expect(titulosSimilares("Reunião de Oração", "reuniao de oracao")).toBe(true);
  });

  it("artigo/preposicao trocada", () => {
    expect(titulosSimilares("Retiro de Jovens", "Retiro dos Jovens")).toBe(true);
  });

  it("sufixo/contexto extra (subconjunto)", () => {
    expect(
      titulosSimilares("Retiro de jovens", "Retiro de jovens - inscrições abertas")
    ).toBe(true);
    expect(
      titulosSimilares("Ceia do Senhor", "Ceia do Senhor neste domingo")
    ).toBe(true);
  });

  it("eventos claramente distintos", () => {
    expect(titulosSimilares("Culto de Santa Ceia", "Reunião de oração")).toBe(false);
    expect(titulosSimilares("Batismo", "Assembleia da igreja")).toBe(false);
  });

  it("parecido mas coisa diferente — nao funde", () => {
    expect(titulosSimilares("Retiro de Jovens", "Retiro de Casais")).toBe(false);
    expect(titulosSimilares("Reunião de Diáconos", "Reunião de Presbíteros")).toBe(false);
  });

  it("titulo so com stopwords cai na igualdade normalizada", () => {
    expect(titulosSimilares("de a o", "de a o")).toBe(true);
    expect(titulosSimilares("de a o", "Retiro de Jovens")).toBe(false);
  });
});
