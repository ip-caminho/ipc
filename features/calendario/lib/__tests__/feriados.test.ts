import { describe, it, expect } from "vitest";
import { getFeriado } from "../feriados";

describe("getFeriado", () => {
  it("feriados fixos nacionais", () => {
    expect(getFeriado("2026-01-01")).toBe("Confraternização Universal");
    expect(getFeriado("2026-09-07")).toBe("Independência");
    expect(getFeriado("2026-12-25")).toBe("Natal");
  });

  it("feriado estadual de SP — 9 de julho", () => {
    expect(getFeriado("2026-07-09")).toBe("Revolução Constitucionalista");
    expect(getFeriado("2027-07-09")).toBe("Revolução Constitucionalista");
  });

  it("feriado municipal da capital", () => {
    expect(getFeriado("2026-01-25")).toBe("Aniversário de São Paulo");
  });

  it("feriados móveis derivados da Páscoa (2026: domingo 05/04)", () => {
    expect(getFeriado("2026-04-05")).toBe("Páscoa");
    expect(getFeriado("2026-04-03")).toBe("Sexta-feira Santa");
    expect(getFeriado("2026-02-17")).toBe("Carnaval");
    expect(getFeriado("2026-06-04")).toBe("Corpus Christi");
  });

  it("dia comum retorna null", () => {
    expect(getFeriado("2026-07-08")).toBeNull();
    expect(getFeriado("2026-03-15")).toBeNull();
    expect(getFeriado("")).toBeNull();
  });
});
