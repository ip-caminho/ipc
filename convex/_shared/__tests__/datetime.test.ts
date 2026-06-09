import { describe, it, expect } from "vitest";
import { getSaoPauloDate } from "../datetime";

describe("getSaoPauloDate", () => {
  it("usa o dia em Sao Paulo, nao o UTC do servidor", () => {
    // 01:30 UTC = 22:30 do dia ANTERIOR em BRT (UTC-3)
    expect(getSaoPauloDate(new Date("2026-06-09T01:30:00Z"))).toEqual({
      year: 2026,
      month: 6,
      day: 8,
    });
    // 12:00 UTC = 09:00 BRT, mesmo dia
    expect(getSaoPauloDate(new Date("2026-06-09T12:00:00Z"))).toEqual({
      year: 2026,
      month: 6,
      day: 9,
    });
  });

  it("vira o ano/mes corretamente no fuso BRT", () => {
    // 02:00 UTC de 1/jan = 23:00 BRT de 31/dez do ano anterior
    expect(getSaoPauloDate(new Date("2026-01-01T02:00:00Z"))).toEqual({
      year: 2025,
      month: 12,
      day: 31,
    });
  });
});
