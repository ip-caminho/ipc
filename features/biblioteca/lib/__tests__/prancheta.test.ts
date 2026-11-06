import { describe, expect, it } from "vitest";
import { dataPrevistaDevolucao, somarDias } from "@/convex/biblioteca/prazo";
import { formatarData, linkLembrete, tempoFora } from "../prancheta";
import { pessoaSemCadastroSchema } from "../validations";

describe("tempoFora", () => {
  const hoje = "2026-11-08";

  it.each([
    ["2026-11-08", "hoje"],
    ["2026-11-07", "ontem"],
    ["2026-11-05", "há 3 dias"],
    ["2026-11-01", "há 1 semana"],
    ["2026-10-26", "há 1 semana"],
    ["2026-10-25", "há 2 semanas"],
    ["2026-09-27", "há 6 semanas"],
  ])("%s vira %s", (data, esperado) => {
    expect(tempoFora(data, hoje)).toBe(esperado);
  });
});

describe("prazo", () => {
  it("soma 4 semanas, virando o mes e o ano", () => {
    expect(dataPrevistaDevolucao("2026-11-08")).toBe("2026-12-06");
    expect(dataPrevistaDevolucao("2026-12-20")).toBe("2027-01-17");
  });

  it("nao perde dia em datas proximas da virada", () => {
    expect(somarDias("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("linkLembrete", () => {
  const base = {
    pessoa: "Marina Alves",
    livroTitulo: "Deuses falsos",
    dataPrevistaDevolucao: "2026-10-27",
  };

  it("usa o primeiro nome, o livro e a data do prazo", () => {
    const link = new URL(linkLembrete({ ...base, whatsapp: "+5511999998888" }));
    expect(link.pathname).toBe("/5511999998888");
    const texto = link.searchParams.get("text");
    expect(texto).toContain("Olá, Marina!");
    expect(texto).not.toContain("Alves");
    expect(texto).toContain('"Deuses falsos"');
    expect(texto).toContain("27/10/2026");
  });

  it("pula o tratamento digitado no nome", () => {
    const link = new URL(linkLembrete({ ...base, pessoa: "Sr. Jorge", whatsapp: "+5511999998888" }));
    expect(link.searchParams.get("text")).toContain("Olá, Jorge!");
  });

  it("completa o codigo do pais em numero nacional, inclusive com DDD 55", () => {
    expect(linkLembrete({ ...base, whatsapp: "(11) 99999-8888" })).toContain("wa.me/5511999998888?");
    expect(linkLembrete({ ...base, whatsapp: "55999998888" })).toContain("wa.me/5555999998888?");
  });
});

describe("pessoaSemCadastroSchema", () => {
  it("exige nome e WhatsApp com DDD", () => {
    const ok = pessoaSemCadastroSchema.safeParse({ nome: "Jorge", whatsapp: "11999998888" });
    expect(ok.success).toBe(true);
    expect(pessoaSemCadastroSchema.safeParse({ nome: "Jorge", whatsapp: "" }).success).toBe(false);
    expect(pessoaSemCadastroSchema.safeParse({ nome: "Jorge", whatsapp: "999998888" }).success).toBe(false);
    expect(pessoaSemCadastroSchema.safeParse({ nome: " ", whatsapp: "11999998888" }).success).toBe(false);
  });
});

describe("formatarData", () => {
  it("mostra dd/MM/yyyy", () => {
    expect(formatarData("2026-11-08")).toBe("08/11/2026");
  });
});
