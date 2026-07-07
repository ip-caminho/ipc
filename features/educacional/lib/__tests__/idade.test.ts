import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  turmaPorCoorte,
  coorteIdade,
  proximaTransicaoTurma,
  turmaDivergente,
  idadeEmAnos,
} from "../idade";

// Fixa "hoje" = 06/07/2026 para tornar os calculos deterministicos.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T12:00:00"));
});
afterAll(() => {
  vi.useRealTimers();
});

describe("coorteIdade", () => {
  it("usa o ano civil (idade que faz no ano), nao a idade completa", () => {
    // Nasce dez/2023: em 2026 faz 3, mesmo antes do aniversario
    expect(coorteIdade("2023-12-11")).toBe(3);
    // Nasce jan/2022: em 2026 faz 4
    expect(coorteIdade("2022-01-01")).toBe(4);
  });

  it("aceita ano de referencia explicito", () => {
    expect(coorteIdade("2023-12-11", 2028)).toBe(5);
  });
});

describe("turmaPorCoorte", () => {
  it("mapeia cada coorte para a turma", () => {
    expect(turmaPorCoorte(0)).toBe("0-2");
    expect(turmaPorCoorte(2)).toBe("0-2");
    expect(turmaPorCoorte(3)).toBe("3-4");
    expect(turmaPorCoorte(4)).toBe("3-4");
    expect(turmaPorCoorte(6)).toBe("5-6");
    expect(turmaPorCoorte(8)).toBe("7-8");
    expect(turmaPorCoorte(10)).toBe("9-10");
  });

  it("retorna null acima de 10 (saiu do departamento)", () => {
    expect(turmaPorCoorte(11)).toBeNull();
    expect(turmaPorCoorte(15)).toBeNull();
  });
});

describe("idadeEmAnos (idade real completa)", () => {
  it("calcula anos completos considerando o aniversario", () => {
    expect(idadeEmAnos("2020-07-10")).toBe(5); // ainda nao fez em 06/07
    expect(idadeEmAnos("2020-07-01")).toBe(6); // ja fez
  });

  it("retorna null para data invalida ou ausente", () => {
    expect(idadeEmAnos(undefined)).toBeNull();
    expect(idadeEmAnos("xx")).toBeNull();
  });
});

describe("proximaTransicaoTurma (por coorte)", () => {
  it("preve o ano e a turma da proxima borda de coorte", () => {
    // coorte 4 (nasc 2022) -> proxima borda 5 -> turma 5-6 no ano 2027
    const t = proximaTransicaoTurma("2022-01-01");
    expect(t).not.toBeNull();
    expect(t!.proximaTurma).toBe("5-6");
    expect(t!.ano).toBe(2027);
    expect(t!.saiDoDepartamento).toBe(false);
  });

  it("marca saida do departamento na coorte 11", () => {
    // coorte 10 (nasc 2016) -> proxima borda 11 -> sai do infantil em 2027
    const t = proximaTransicaoTurma("2016-01-01");
    expect(t).not.toBeNull();
    expect(t!.proximaTurma).toBeNull();
    expect(t!.saiDoDepartamento).toBe(true);
    expect(t!.ano).toBe(2027);
  });

  it("retorna null quando ja saiu do departamento", () => {
    expect(proximaTransicaoTurma("2010-01-01")).toBeNull();
  });

  it("nao quebra com nascidos em 29 de fevereiro (regressao do crash)", () => {
    // coorte 6 (nasc 2020) -> proxima borda 7 -> turma 7-8 no ano 2027.
    // Antes gerava data "2027-02-29" (invalida). Agora e so o ano.
    const t = proximaTransicaoTurma("2020-02-29");
    expect(t).not.toBeNull();
    expect(t!.proximaTurma).toBe("7-8");
    expect(t!.ano).toBe(2027);
  });
});

describe("turmaDivergente (por coorte)", () => {
  it("NAO acusa divergencia para crianca enturmada por coorte", () => {
    // Amy: nasce 2023-12-11 (2 anos completos), turma "3-4". Coorte 3 = "3-4".
    // Antes (idade completa) acusava falso-positivo; agora nao.
    expect(turmaDivergente("3-4", "2023-12-11")).toBe(false);
  });

  it("acusa divergencia quando a turma nao bate com a coorte", () => {
    expect(turmaDivergente("0-2", "2023-12-11")).toBe(true);
  });

  it("nao acusa divergencia sem data de nascimento", () => {
    expect(turmaDivergente("0-2", undefined)).toBe(false);
  });
});
