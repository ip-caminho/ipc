import { describe, it, expect } from "vitest";
import { calcularFrequencia } from "../lib/frequencia";

const aula = (id: string, data: string, comChamada = true) => ({
  _id: id,
  data,
  presencaRegistradaEm: comChamada ? 1 : undefined,
});

// 4 aulas semanais, todas com chamada feita
const quatroAulas = [
  aula("a1", "2026-08-03"),
  aula("a2", "2026-08-10"),
  aula("a3", "2026-08-17"),
  aula("a4", "2026-08-24"),
];

describe("calcularFrequencia", () => {
  it("conta presenca sobre as aulas com chamada", () => {
    const r = calcularFrequencia({
      aulas: quatroAulas,
      presencaPorAula: new Map([
        ["a1", true],
        ["a2", true],
        ["a3", true],
        ["a4", false],
      ]),
      inscritoDesde: "2026-08-01",
      frequenciaMinima: 75,
    });
    expect(r).toEqual({
      aulasConsideradas: 4,
      aulasPresentes: 3,
      percentual: 75,
      apto: true,
    });
  });

  it("aula SEM chamada nao vira falta de ninguem", () => {
    // a4 nao teve chamada: denominador cai para 3, e 3/3 = 100%
    const aulas = [quatroAulas[0], quatroAulas[1], quatroAulas[2], aula("a4", "2026-08-24", false)];
    const r = calcularFrequencia({
      aulas,
      presencaPorAula: new Map([
        ["a1", true],
        ["a2", true],
        ["a3", true],
      ]),
      inscritoDesde: "2026-08-01",
    });
    expect(r.aulasConsideradas).toBe(3);
    expect(r.percentual).toBe(100);
  });

  it("aula anterior a inscricao nao conta para o aluno", () => {
    // Entrou na 3a aula: so a3 e a4 contam, e ele foi as duas
    const r = calcularFrequencia({
      aulas: quatroAulas,
      presencaPorAula: new Map([
        ["a3", true],
        ["a4", true],
      ]),
      inscritoDesde: "2026-08-17",
    });
    expect(r).toEqual({
      aulasConsideradas: 2,
      aulasPresentes: 2,
      percentual: 100,
      apto: true,
    });
  });

  it("inscricao no mesmo dia da aula conta essa aula", () => {
    const r = calcularFrequencia({
      aulas: [aula("a1", "2026-08-03")],
      presencaPorAula: new Map([["a1", true]]),
      inscritoDesde: "2026-08-03",
    });
    expect(r.aulasConsideradas).toBe(1);
  });

  it("sem registro numa aula COM chamada conta como falta", () => {
    // A chamada foi feita e ele nao estava na lista
    const r = calcularFrequencia({
      aulas: quatroAulas,
      presencaPorAula: new Map([["a1", true]]),
      inscritoDesde: "2026-08-01",
    });
    expect(r.aulasPresentes).toBe(1);
    expect(r.aulasConsideradas).toBe(4);
    expect(r.percentual).toBe(25);
    expect(r.apto).toBe(false);
  });

  it("denominador zero devolve percentual null, nao 0% nem NaN", () => {
    const r = calcularFrequencia({
      aulas: [aula("a1", "2026-08-03", false)],
      presencaPorAula: new Map(),
      inscritoDesde: "2026-08-01",
    });
    expect(r.percentual).toBeNull();
    expect(r.apto).toBe(false);
  });

  it("corte de aptidao usa a frequencia minima informada", () => {
    const args = {
      aulas: quatroAulas,
      presencaPorAula: new Map([
        ["a1", true],
        ["a2", true],
        ["a3", false],
        ["a4", false],
      ]),
      inscritoDesde: "2026-08-01",
    };
    expect(calcularFrequencia({ ...args, frequenciaMinima: 50 }).apto).toBe(true);
    expect(calcularFrequencia({ ...args, frequenciaMinima: 51 }).apto).toBe(false);
    // Sem informar, usa o padrao (75)
    expect(calcularFrequencia(args).apto).toBe(false);
  });

  it("arredonda o percentual (2 de 3 = 67%)", () => {
    const r = calcularFrequencia({
      aulas: quatroAulas.slice(0, 3),
      presencaPorAula: new Map([
        ["a1", true],
        ["a2", true],
        ["a3", false],
      ]),
      inscritoDesde: "2026-08-01",
    });
    expect(r.percentual).toBe(67);
  });
});
