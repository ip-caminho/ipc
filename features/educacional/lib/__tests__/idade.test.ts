import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  turmaPorIdade,
  proximaTransicaoTurma,
  turmaDivergente,
  idadeEmAnos,
  formatarMesAno,
} from "../idade";

// Fixa "hoje" = 06/07/2026 para tornar os calculos deterministicos.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T12:00:00"));
});
afterAll(() => {
  vi.useRealTimers();
});

describe("turmaPorIdade", () => {
  it("mapeia cada faixa etaria para a turma", () => {
    expect(turmaPorIdade(0)).toBe("0-2");
    expect(turmaPorIdade(2)).toBe("0-2");
    expect(turmaPorIdade(3)).toBe("3-4");
    expect(turmaPorIdade(4)).toBe("3-4");
    expect(turmaPorIdade(6)).toBe("5-6");
    expect(turmaPorIdade(8)).toBe("7-8");
    expect(turmaPorIdade(10)).toBe("9-10");
  });

  it("retorna null acima de 10 anos", () => {
    expect(turmaPorIdade(11)).toBeNull();
    expect(turmaPorIdade(15)).toBeNull();
  });
});

describe("idadeEmAnos", () => {
  it("calcula anos completos considerando o aniversario", () => {
    // Nasceu 10/07/2020 -> ainda nao fez aniversario em 06/07/2026 -> 5 anos
    expect(idadeEmAnos("2020-07-10")).toBe(5);
    // Nasceu 01/07/2020 -> ja fez aniversario -> 6 anos
    expect(idadeEmAnos("2020-07-01")).toBe(6);
  });

  it("retorna null para data invalida ou ausente", () => {
    expect(idadeEmAnos(undefined)).toBeNull();
    expect(idadeEmAnos("xx")).toBeNull();
  });
});

describe("proximaTransicaoTurma", () => {
  it("preve a data e a turma da proxima borda etaria", () => {
    // 4 anos (nasc. 01/01/2022) -> proxima borda 5 -> turma 5-6 em 01/01/2027
    const t = proximaTransicaoTurma("2022-01-01");
    expect(t).not.toBeNull();
    expect(t!.proximaTurma).toBe("5-6");
    expect(t!.data).toBe("2027-01-01");
    expect(t!.saiDoDepartamento).toBe(false);
  });

  it("marca saida do departamento aos 11 anos", () => {
    // 10 anos (nasc. 01/01/2016) -> proxima borda 11 -> sai do infantil
    const t = proximaTransicaoTurma("2016-01-01");
    expect(t).not.toBeNull();
    expect(t!.proximaTurma).toBeNull();
    expect(t!.saiDoDepartamento).toBe(true);
    expect(t!.data).toBe("2027-01-01");
  });

  it("retorna null quando ja saiu do departamento", () => {
    expect(proximaTransicaoTurma("2010-01-01")).toBeNull();
  });
});

describe("turmaDivergente", () => {
  it("detecta quando a turma snapshot nao bate com a idade", () => {
    // 6 anos (nasc. 01/01/2020) -> turma correta 5-6
    expect(turmaDivergente("0-2", "2020-01-01")).toBe(true);
    expect(turmaDivergente("5-6", "2020-01-01")).toBe(false);
  });

  it("nao acusa divergencia sem data de nascimento", () => {
    expect(turmaDivergente("0-2", undefined)).toBe(false);
  });
});

describe("formatarMesAno", () => {
  it("formata YYYY-MM-DD como mes/ano abreviado", () => {
    expect(formatarMesAno("2027-01-15")).toBe("jan/2027");
    expect(formatarMesAno("2026-12-01")).toBe("dez/2026");
  });

  it("retorna vazio para data invalida", () => {
    expect(formatarMesAno("2026-13-01")).toBe("");
  });
});
