import { describe, it, expect } from "vitest";
import {
  calcProgress,
  emAndamento,
  heartbeatMudou,
  isComplete,
  mergeHeartbeat,
} from "../escutasHelpers";

describe("calcProgress", () => {
  it("calcula percentual corretamente", () => {
    expect(calcProgress(30, 100)).toBe(30);
    expect(calcProgress(50, 200)).toBe(25);
    expect(calcProgress(0, 100)).toBe(0);
  });

  it("arredonda para inteiro", () => {
    expect(calcProgress(33, 100)).toBe(33);
    expect(calcProgress(1, 3)).toBe(33); // 33.33... → 33
    expect(calcProgress(2, 3)).toBe(67); // 66.66... → 67
  });

  it("limita em 100%", () => {
    expect(calcProgress(150, 100)).toBe(100);
    expect(calcProgress(100, 100)).toBe(100);
  });

  it("retorna 0 para duracao zero ou negativa", () => {
    expect(calcProgress(50, 0)).toBe(0);
    expect(calcProgress(50, -10)).toBe(0);
  });
});

describe("isComplete", () => {
  it("completo com >= 90%", () => {
    expect(isComplete(90)).toBe(true);
    expect(isComplete(95)).toBe(true);
    expect(isComplete(100)).toBe(true);
  });

  it("incompleto com < 90%", () => {
    expect(isComplete(89)).toBe(false);
    expect(isComplete(0)).toBe(false);
    expect(isComplete(50)).toBe(false);
  });
});

describe("mergeHeartbeat", () => {
  it("avanca progresso para frente", () => {
    const existing = { progresso: 30, ultimoSegundo: 30, completou: false };
    const result = mergeHeartbeat(existing, 50, 50);

    expect(result.progresso).toBe(50);
    expect(result.ultimoSegundo).toBe(50);
    expect(result.completou).toBe(false);
  });

  it("nao regride progresso", () => {
    const existing = { progresso: 70, ultimoSegundo: 70, completou: false };
    const result = mergeHeartbeat(existing, 30, 30);

    expect(result.progresso).toBe(70);
    expect(result.ultimoSegundo).toBe(70);
  });

  it("marca completou quando atinge 90%", () => {
    const existing = { progresso: 85, ultimoSegundo: 85, completou: false };
    const result = mergeHeartbeat(existing, 92, 92);

    expect(result.completou).toBe(true);
    expect(result.progresso).toBe(92);
  });

  it("completou nunca volta a false", () => {
    const existing = { progresso: 95, ultimoSegundo: 95, completou: true };
    // Mesmo com progresso menor, completou permanece true
    const result = mergeHeartbeat(existing, 10, 10);

    expect(result.completou).toBe(true);
    expect(result.progresso).toBe(95); // mantém o maior
  });

  it("marca completou quando merge resulta em >= 90%", () => {
    const existing = { progresso: 91, ultimoSegundo: 91, completou: false };
    // Novo progresso é menor, mas existing já é >= 90
    const result = mergeHeartbeat(existing, 50, 50);

    expect(result.completou).toBe(true);
    expect(result.progresso).toBe(91);
  });

  it("lida com valores zerados", () => {
    const existing = { progresso: 0, ultimoSegundo: 0, completou: false };
    const result = mergeHeartbeat(existing, 5, 5);

    expect(result.progresso).toBe(5);
    expect(result.ultimoSegundo).toBe(5);
    expect(result.completou).toBe(false);
  });
});

describe("emAndamento", () => {
  // Regressao: o filtro ja comparou 0-100 contra 0.05/0.95 (fracao). Nenhum
  // registro passava, o card "Continuar ouvindo" nunca aparecia e a query
  // varria o historico inteiro do membro a cada heartbeat.
  it("aceita quem esta no meio da pregacao", () => {
    expect(emAndamento({ completou: false, progresso: 42 })).toBe(true);
    expect(emAndamento({ completou: false, progresso: 6 })).toBe(true);
    expect(emAndamento({ completou: false, progresso: 94 })).toBe(true);
  });

  it("descarta quem mal comecou", () => {
    expect(emAndamento({ completou: false, progresso: 0 })).toBe(false);
    expect(emAndamento({ completou: false, progresso: 5 })).toBe(false);
  });

  it("descarta quem praticamente terminou", () => {
    expect(emAndamento({ completou: false, progresso: 95 })).toBe(false);
    expect(emAndamento({ completou: false, progresso: 100 })).toBe(false);
  });

  it("descarta quem ja completou, mesmo com progresso no meio", () => {
    expect(emAndamento({ completou: true, progresso: 42 })).toBe(false);
  });

  it("trabalha na mesma escala que calcProgress grava", () => {
    // 40 min de uma pregacao de 60 min = 67%, e nao 0.67
    const progresso = calcProgress(2400, 3600);
    expect(progresso).toBe(67);
    expect(emAndamento({ completou: false, progresso })).toBe(true);
  });
});

describe("heartbeatMudou", () => {
  const base = { progresso: 40, ultimoSegundo: 1200, completou: false, duracaoTotal: 3000 };

  it("nao escreve quando nada avancou", () => {
    const merged = mergeHeartbeat(base, 40, 1200);
    expect(heartbeatMudou(base, merged, 3000)).toBe(false);
  });

  it("nao escreve quando o ouvinte volta para tras", () => {
    // mergeHeartbeat nunca regride: reouvir trecho ja ouvido nao muda o doc
    const merged = mergeHeartbeat(base, 20, 600);
    expect(heartbeatMudou(base, merged, 3000)).toBe(false);
  });

  it("escreve quando o ouvinte avanca", () => {
    const merged = mergeHeartbeat(base, 41, 1230);
    expect(heartbeatMudou(base, merged, 3000)).toBe(true);
  });

  it("escreve quando a escuta se completa", () => {
    const merged = mergeHeartbeat(base, 95, 2850);
    expect(merged.completou).toBe(true);
    expect(heartbeatMudou(base, merged, 3000)).toBe(true);
  });

  it("escreve quando a duracao conhecida do audio muda", () => {
    const merged = mergeHeartbeat(base, 40, 1200);
    expect(heartbeatMudou(base, merged, 3600)).toBe(true);
  });
});
