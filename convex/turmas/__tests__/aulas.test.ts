import { describe, it, expect } from "vitest";
import { gerarDatasAulas } from "../lib/aulas";

describe("gerarDatasAulas", () => {
  it("gera N datas semanais a partir da data de inicio quando nao ha dia da semana", () => {
    // 2026-08-03 e uma segunda-feira
    expect(gerarDatasAulas("2026-08-03", undefined, 3)).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
    ]);
  });

  it("mantem a data de inicio quando ela ja cai no dia da semana pedido", () => {
    expect(gerarDatasAulas("2026-08-03", "SEGUNDA", 2)).toEqual([
      "2026-08-03",
      "2026-08-10",
    ]);
  });

  it("adianta a primeira aula para o proximo dia da semana pedido", () => {
    // de segunda (03/08) para a quarta seguinte (05/08)
    expect(gerarDatasAulas("2026-08-03", "QUARTA", 2)).toEqual([
      "2026-08-05",
      "2026-08-12",
    ]);
    // de segunda para o domingo seguinte (09/08), nao o anterior
    expect(gerarDatasAulas("2026-08-03", "DOMINGO", 1)).toEqual(["2026-08-09"]);
  });

  it("atravessa virada de mes e de ano", () => {
    expect(gerarDatasAulas("2026-12-28", "SEGUNDA", 3)).toEqual([
      "2026-12-28",
      "2027-01-04",
      "2027-01-11",
    ]);
  });

  it("nao gera nada com total invalido ou data quebrada", () => {
    expect(gerarDatasAulas("2026-08-03", "SEGUNDA", 0)).toEqual([]);
    expect(gerarDatasAulas("2026-08-03", "SEGUNDA", -1)).toEqual([]);
    expect(gerarDatasAulas("2026-08-03", "SEGUNDA", 1.5)).toEqual([]);
    expect(gerarDatasAulas("", "SEGUNDA", 3)).toEqual([]);
  });

  it("ignora dia da semana desconhecido e usa a data de inicio", () => {
    expect(gerarDatasAulas("2026-08-03", "FERIADO", 2)).toEqual([
      "2026-08-03",
      "2026-08-10",
    ]);
  });
});
