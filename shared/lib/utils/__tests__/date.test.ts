import { describe, expect, it } from "vitest";
import { interpretarDataColada, isoParaPartes, validarPartesData } from "../date";

const hoje = "2026-11-09";
const validar = (dia: string, mes: string, ano: string, min?: string) =>
  validarPartesData({ dia, mes, ano }, { hoje, min });

describe("validarPartesData", () => {
  it("monta o ISO com dia e mês na posição certa", () => {
    expect(validar("12", "03", "1990").iso).toBe("1990-03-12");
  });

  it("completa dia e mês de um dígito", () => {
    expect(validar("4", "3", "1990").iso).toBe("1990-03-04");
  });

  it("não acusa erro com tudo vazio", () => {
    expect(validar("", "", "")).toEqual({ iso: null, erro: null, incompleta: true });
  });

  it("recusa mês 13 na hora, mesmo sem o ano", () => {
    const r = validar("12", "13", "");
    expect(r.erro).toBe("O mês vai de 1 a 12.");
    expect(r.incompleta).toBe(false);
  });

  it("não acusa erro no zero à esquerda enquanto digita", () => {
    expect(validar("0", "", "").erro).toBe("Preencha dia, mês e ano.");
    expect(validar("0", "", "").incompleta).toBe(true);
    expect(validar("12", "0", "").incompleta).toBe(true);
  });

  it("recusa mês zero com a data completa", () => {
    expect(validar("12", "0", "1990").erro).toBe("O mês vai de 1 a 12.");
  });

  it("recusa dia 32", () => {
    expect(validar("32", "01", "1990").erro).toBe("O dia vai de 1 a 31.");
  });

  it("recusa 31 de fevereiro", () => {
    const r = validar("31", "02", "1990");
    expect(r.iso).toBeNull();
    expect(r.erro).toContain("fevereiro de 1990 não tem dia 31");
  });

  it("aceita 29/02 só em ano bissexto", () => {
    expect(validar("29", "02", "2024").iso).toBe("2024-02-29");
    expect(validar("29", "02", "2023").iso).toBeNull();
  });

  it("trata dados faltantes como incompletos", () => {
    expect(validar("12", "", "1990")).toMatchObject({ iso: null, incompleta: true });
    expect(validar("12", "03", "90")).toMatchObject({ iso: null, incompleta: true });
  });

  it("recusa ano antes de 1900", () => {
    expect(validar("12", "03", "1899").iso).toBeNull();
  });

  it("aceita hoje e recusa amanhã", () => {
    expect(validar("09", "11", "2026").iso).toBe("2026-11-09");
    expect(validar("10", "11", "2026").erro).toBe("A data não pode estar no futuro.");
  });

  it("respeita a data mínima", () => {
    expect(validar("01", "01", "2000", "2000-01-02").erro).toContain("02/01/2000");
    expect(validar("02", "01", "2000", "2000-01-02").iso).toBe("2000-01-02");
  });
});

describe("isoParaPartes", () => {
  it("faz ida e volta com o ISO", () => {
    expect(validarPartesData(isoParaPartes("1990-03-12"), { hoje }).iso).toBe("1990-03-12");
  });

  it("devolve vazio para valor que não é ISO", () => {
    expect(isoParaPartes("")).toEqual({ dia: "", mes: "", ano: "" });
  });
});

describe("interpretarDataColada", () => {
  const esperado = { dia: "12", mes: "03", ano: "1990" };

  it.each(["12/03/1990", "12.03.1990", "12031990", "1990-03-12"])("entende %s", (texto) => {
    expect(interpretarDataColada(texto)).toEqual(esperado);
  });

  it("ignora digitação comum", () => {
    expect(interpretarDataColada("1")).toBeNull();
    expect(interpretarDataColada("1990")).toBeNull();
  });
});
