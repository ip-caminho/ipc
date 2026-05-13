import { describe, it, expect } from "vitest";
import {
  calcularJitter,
  podeReceberCampanha,
  renderizarTemplate,
  JITTER_MIN_MS,
  JITTER_MAX_MS,
  ANTISPAM_MAX_ENVIOS,
  ANTISPAM_JANELA_DIAS,
} from "../campanhasHelpers";

describe("calcularJitter", () => {
  it("retorna valores dentro do intervalo [MIN, MAX]", () => {
    for (let i = 0; i < 1000; i++) {
      const j = calcularJitter();
      expect(j).toBeGreaterThanOrEqual(JITTER_MIN_MS);
      expect(j).toBeLessThanOrEqual(JITTER_MAX_MS);
    }
  });

  it("usa random injetado para determinismo em testes", () => {
    expect(calcularJitter(() => 0)).toBe(JITTER_MIN_MS);
    expect(calcularJitter(() => 0.999999)).toBeLessThanOrEqual(JITTER_MAX_MS);
    expect(calcularJitter(() => 0.5)).toBe(
      Math.floor(JITTER_MIN_MS + 0.5 * (JITTER_MAX_MS - JITTER_MIN_MS))
    );
  });

  it("MIN configurado e razoavel (>= 30s)", () => {
    expect(JITTER_MIN_MS).toBeGreaterThanOrEqual(30_000);
  });

  it("MAX configurado e razoavel (<= 120s)", () => {
    expect(JITTER_MAX_MS).toBeLessThanOrEqual(120_000);
  });
});

describe("podeReceberCampanha (anti-spam)", () => {
  const agora = 1_700_000_000_000;
  const umDiaMs = 24 * 60 * 60 * 1000;
  const janelaMs = ANTISPAM_JANELA_DIAS * umDiaMs;

  it("permite quando sem historico", () => {
    expect(podeReceberCampanha([], agora)).toBe(true);
  });

  it("permite com 2 envios nos ultimos 30 dias", () => {
    const ts = [agora - 5 * umDiaMs, agora - 10 * umDiaMs];
    expect(podeReceberCampanha(ts, agora)).toBe(true);
  });

  it("bloqueia ao atingir limite (3) nos ultimos 30 dias", () => {
    const ts = [
      agora - 5 * umDiaMs,
      agora - 10 * umDiaMs,
      agora - 20 * umDiaMs,
    ];
    expect(podeReceberCampanha(ts, agora)).toBe(false);
  });

  it("ignora envios fora da janela de 30 dias", () => {
    const ts = [
      agora - 40 * umDiaMs,
      agora - 60 * umDiaMs,
      agora - 90 * umDiaMs,
    ];
    expect(podeReceberCampanha(ts, agora)).toBe(true);
  });

  it("conta apenas envios dentro da janela", () => {
    const ts = [
      agora - 5 * umDiaMs, // dentro
      agora - 35 * umDiaMs, // fora
      agora - 15 * umDiaMs, // dentro
      agora - 25 * umDiaMs, // dentro
      agora - 100 * umDiaMs, // fora
    ];
    // 3 envios dentro da janela => bloqueia
    expect(podeReceberCampanha(ts, agora)).toBe(false);
  });

  it("ANTISPAM_MAX_ENVIOS e razoavel (>= 1, <= 10)", () => {
    expect(ANTISPAM_MAX_ENVIOS).toBeGreaterThanOrEqual(1);
    expect(ANTISPAM_MAX_ENVIOS).toBeLessThanOrEqual(10);
  });
});

describe("renderizarTemplate", () => {
  it("substitui {nome}", () => {
    expect(renderizarTemplate("Ola {nome}", { nome: "Joao" })).toBe("Ola Joao");
  });

  it("substitui multiplas variaveis", () => {
    const tpl = "Ola {nome}, prazer {apelido}!";
    expect(renderizarTemplate(tpl, { nome: "Joao Silva", apelido: "Joao" })).toBe(
      "Ola Joao Silva, prazer Joao!"
    );
  });

  it("variavel ausente vira string vazia (sem deixar placeholder)", () => {
    expect(renderizarTemplate("Ola {nome} {sobrenome}", { nome: "Joao" })).toBe(
      "Ola Joao "
    );
  });

  it("nao falha com template sem variaveis", () => {
    expect(renderizarTemplate("Mensagem fixa", {})).toBe("Mensagem fixa");
  });

  it("nao substitui placeholders desconhecidos com fallback magico", () => {
    expect(renderizarTemplate("{nome} {url}", { nome: "X" })).toBe("X ");
  });
});
