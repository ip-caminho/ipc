import { describe, it, expect } from "vitest";
import { calcularFrequencia, descreverRegra } from "../lib/frequencia";

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
      regra: { frequenciaMinima: 75 },
    });
    expect(r).toEqual({
      aulasConsideradas: 4,
      aulasPresentes: 3,
      faltas: 1,
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
      faltas: 0,
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
    expect(calcularFrequencia({ ...args, regra: { frequenciaMinima: 50 } }).apto).toBe(true);
    expect(calcularFrequencia({ ...args, regra: { frequenciaMinima: 51 } }).apto).toBe(false);
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

// Novos Membros aprova por "no maximo 3 faltas nos 8 encontros". Em percentual
// isso seria 62,5% e quebraria se uma aula fosse cancelada — o motivo do
// criterio existir.
describe("calcularFrequencia — criterio MAX_FALTAS", () => {
  const oitoAulas = Array.from({ length: 8 }, (_, i) =>
    aula(`a${i + 1}`, `2026-09-${String(20 + i * 7).padStart(2, "0")}`)
  );

  function comFaltas(qtd: number) {
    const presencas = new Map<string, boolean>();
    oitoAulas.forEach((a, i) => presencas.set(a._id, i >= qtd));
    return calcularFrequencia({
      aulas: oitoAulas,
      presencaPorAula: presencas,
      inscritoDesde: "2026-09-01",
      regra: { criterio: "MAX_FALTAS", maxFaltas: 3 },
    });
  }

  it("aprova no limite exato (3 faltas de 8)", () => {
    const r = comFaltas(3);
    expect(r.faltas).toBe(3);
    expect(r.percentual).toBe(63); // 5/8 = 62,5 arredonda
    expect(r.apto).toBe(true);
  });

  it("reprova na quarta falta", () => {
    const r = comFaltas(4);
    expect(r.faltas).toBe(4);
    expect(r.apto).toBe(false);
  });

  it("sem falta nenhuma, aprova", () => {
    expect(comFaltas(0).apto).toBe(true);
  });

  it("aula cancelada nao muda o veredito (o que o percentual quebraria)", () => {
    // 7 aulas apuradas, 3 faltas: 4/7 = 57%. Por percentual (75%) reprovaria.
    const seteAulas = oitoAulas.slice(0, 7);
    const presencas = new Map<string, boolean>();
    seteAulas.forEach((a, i) => presencas.set(a._id, i >= 3));

    const porFaltas = calcularFrequencia({
      aulas: seteAulas,
      presencaPorAula: presencas,
      inscritoDesde: "2026-09-01",
      regra: { criterio: "MAX_FALTAS", maxFaltas: 3 },
    });
    expect(porFaltas.faltas).toBe(3);
    expect(porFaltas.apto).toBe(true);

    const porPercentual = calcularFrequencia({
      aulas: seteAulas,
      presencaPorAula: presencas,
      inscritoDesde: "2026-09-01",
      regra: { criterio: "PERCENTUAL", frequenciaMinima: 75 },
    });
    expect(porPercentual.percentual).toBe(57);
    expect(porPercentual.apto).toBe(false);
  });

  it("aula sem chamada nao vira falta nem sob MAX_FALTAS", () => {
    const aulas = [...oitoAulas.slice(0, 6), aula("a7", "2026-11-01", false)];
    const presencas = new Map<string, boolean>();
    aulas.slice(0, 6).forEach((a, i) => presencas.set(a._id, i >= 3));

    const r = calcularFrequencia({
      aulas,
      presencaPorAula: presencas,
      inscritoDesde: "2026-09-01",
      regra: { criterio: "MAX_FALTAS", maxFaltas: 3 },
    });
    expect(r.aulasConsideradas).toBe(6);
    expect(r.faltas).toBe(3);
    expect(r.apto).toBe(true);
  });

  it("denominador zero segue reprovando, sem percentual", () => {
    const r = calcularFrequencia({
      aulas: [aula("a1", "2026-09-20", false)],
      presencaPorAula: new Map(),
      inscritoDesde: "2026-09-01",
      regra: { criterio: "MAX_FALTAS", maxFaltas: 3 },
    });
    expect(r.percentual).toBeNull();
    expect(r.faltas).toBe(0);
    expect(r.apto).toBe(false);
  });
});

describe("descreverRegra", () => {
  it("descreve os dois criterios", () => {
    expect(descreverRegra({ criterio: "MAX_FALTAS", maxFaltas: 3 })).toBe(
      "maximo de 3 faltas"
    );
    expect(descreverRegra({ criterio: "MAX_FALTAS", maxFaltas: 1 })).toBe(
      "maximo de 1 falta"
    );
    expect(descreverRegra({ criterio: "PERCENTUAL", frequenciaMinima: 75 })).toBe(
      "frequencia minima de 75%"
    );
    expect(descreverRegra({})).toBe("frequencia minima de 75%");
  });
});
