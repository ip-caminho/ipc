import { describe, it, expect } from "vitest";
import {
  agruparEscalas,
  particionarDias,
  domingosDoMes,
  type EscalaRow,
  type EscalaMembro,
} from "../escala";

function membro(
  membroId: string,
  papel: EscalaMembro["papel"],
  extra: Partial<EscalaMembro> = {}
): EscalaMembro {
  return {
    membroId,
    papel,
    nome: extra.nome ?? membroId,
    foto: extra.foto ?? null,
    cacValidade: extra.cacValidade ?? null,
    cacVencido: extra.cacVencido ?? false,
  };
}

function row(
  _id: string,
  data: string,
  subgrupo: string,
  membros: EscalaMembro[]
): EscalaRow {
  return { _id, data, subgrupo, membros };
}

describe("agruparEscalas", () => {
  it("sempre expoe todas as turmas na ordem de TURMA_OPTIONS", () => {
    const dias = agruparEscalas([
      row("r1", "2026-07-05", "3-4", [membro("a", "PROFESSOR")]),
    ]);
    expect(dias).toHaveLength(1);
    expect(dias[0].turmas.map((t) => t.subgrupo)).toEqual([
      "0-2",
      "3-4",
      "5-6",
      "7-8",
      "9-10",
    ]);
  });

  it("marca turma sem professor como lacuna", () => {
    const dias = agruparEscalas([
      row("r1", "2026-07-05", "3-4", [membro("a", "PROFESSOR")]),
      row("r2", "2026-07-05", "5-6", [membro("b", "AUXILIAR")]),
    ]);
    const [dia] = dias;
    const t34 = dia.turmas.find((t) => t.subgrupo === "3-4")!;
    const t56 = dia.turmas.find((t) => t.subgrupo === "5-6")!;
    const t02 = dia.turmas.find((t) => t.subgrupo === "0-2")!;
    expect(t34.semProfessor).toBe(false);
    expect(t56.semProfessor).toBe(true); // so auxiliar
    expect(t02.semProfessor).toBe(true); // sem linha
    expect(dia.temLacuna).toBe(true);
  });

  it("nao acusa lacuna quando toda turma preenchida tem professor e as demais sao ignoradas? (temLacuna reflete qualquer turma vazia)", () => {
    // Preenche as 5 turmas com professor -> sem lacuna
    const dias = agruparEscalas([
      row("r1", "2026-07-05", "0-2", [membro("a", "PROFESSOR")]),
      row("r2", "2026-07-05", "3-4", [membro("b", "PROFESSOR")]),
      row("r3", "2026-07-05", "5-6", [membro("c", "PROFESSOR")]),
      row("r4", "2026-07-05", "7-8", [membro("d", "PROFESSOR")]),
      row("r5", "2026-07-05", "9-10", [membro("e", "PROFESSOR")]),
    ]);
    expect(dias[0].temLacuna).toBe(false);
  });

  it("detecta conflito: mesma pessoa em 2 turmas no mesmo dia", () => {
    const dias = agruparEscalas([
      row("r1", "2026-07-05", "3-4", [membro("x", "PROFESSOR", { nome: "Ana" })]),
      row("r2", "2026-07-05", "5-6", [membro("x", "AUXILIAR", { nome: "Ana" })]),
    ]);
    expect(dias[0].conflitos).toEqual(["Ana"]);
  });

  it("nao acusa conflito para pessoas diferentes", () => {
    const dias = agruparEscalas([
      row("r1", "2026-07-05", "3-4", [membro("x", "PROFESSOR")]),
      row("r2", "2026-07-05", "5-6", [membro("y", "PROFESSOR")]),
    ]);
    expect(dias[0].conflitos).toEqual([]);
  });

  it("propaga cacVencido para o dia", () => {
    const dias = agruparEscalas([
      row("r1", "2026-07-05", "3-4", [
        membro("x", "PROFESSOR", { cacValidade: "2026-06-01", cacVencido: true }),
      ]),
    ]);
    expect(dias[0].temCacVencido).toBe(true);
  });

  it("ordena dias por data crescente", () => {
    const dias = agruparEscalas([
      row("r2", "2026-07-12", "3-4", [membro("b", "PROFESSOR")]),
      row("r1", "2026-07-05", "3-4", [membro("a", "PROFESSOR")]),
    ]);
    expect(dias.map((d) => d.data)).toEqual(["2026-07-05", "2026-07-12"]);
  });
});

describe("particionarDias", () => {
  it("separa proximos (>= hoje) de passados (mais recente primeiro)", () => {
    const dias = agruparEscalas([
      row("r1", "2026-06-28", "3-4", [membro("a", "PROFESSOR")]),
      row("r2", "2026-07-05", "3-4", [membro("b", "PROFESSOR")]),
      row("r3", "2026-07-12", "3-4", [membro("c", "PROFESSOR")]),
    ]);
    const { proximos, passados } = particionarDias(dias, "2026-07-05");
    expect(proximos.map((d) => d.data)).toEqual(["2026-07-05", "2026-07-12"]);
    expect(passados.map((d) => d.data)).toEqual(["2026-06-28"]);
  });
});

describe("domingosDoMes", () => {
  it("lista os domingos de julho/2026", () => {
    expect(domingosDoMes(2026, 7)).toEqual([
      "2026-07-05",
      "2026-07-12",
      "2026-07-19",
      "2026-07-26",
    ]);
  });

  it("lista 5 domingos quando o mes tem", () => {
    // Marco/2026 comeca num domingo (01/03/2026 e domingo)
    expect(domingosDoMes(2026, 3)).toEqual([
      "2026-03-01",
      "2026-03-08",
      "2026-03-15",
      "2026-03-22",
      "2026-03-29",
    ]);
  });
});
