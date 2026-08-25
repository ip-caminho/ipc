import { describe, expect, it } from "vitest";
import { MARGEM_SEGUNDOS, planejarDownload } from "../rangeSermao";

// Culto tipico: 1h de MP3 CBR mono 64k (~28,8 MB), sermao dos 20 aos 50 min.
const TOTAL_SEGUNDOS = 3600;
const TOTAL_BYTES = 8000 * TOTAL_SEGUNDOS; // 64 kbps = 8.000 B/s
const base = {
  tamanhoTotal: TOTAL_BYTES,
  duracaoTotal: TOTAL_SEGUNDOS,
  contentType: "audio/mpeg",
  url: "https://cdn.yhc.com.br/gravacoes-audio/culto.mp3",
};

describe("planejarDownload", () => {
  it("pede so o trecho do sermao, com margem dos dois lados", () => {
    const plano = planejarDownload({ ...base, inicio: 1200, fim: 3000 });

    expect(plano.range).not.toBeNull();
    expect(plano.offsetSegundos).toBe(1200 - MARGEM_SEGUNDOS);
    expect(plano.duracaoSegundos).toBe(3000 - 1200 + 2 * MARGEM_SEGUNDOS);
    expect(plano.range!.inicio).toBe((1200 - MARGEM_SEGUNDOS) * 8000);
    expect(plano.range!.fim).toBe((3000 + MARGEM_SEGUNDOS) * 8000);
  });

  it("economiza a maior parte do arquivo no caso tipico", () => {
    const plano = planejarDownload({ ...base, inicio: 1200, fim: 3000 });
    const baixado = plano.range!.fim - plano.range!.inicio;
    expect(baixado / TOTAL_BYTES).toBeLessThan(0.55);
  });

  it("nao ultrapassa os limites do arquivo", () => {
    const plano = planejarDownload({ ...base, inicio: 0, fim: 600 });
    expect(plano.range!.inicio).toBe(0);
    expect(plano.offsetSegundos).toBe(0);
  });

  it("usa o fim do arquivo quando o trecho nao tem fim definido", () => {
    const plano = planejarDownload({ ...base, inicio: 3000, fim: null });
    expect(plano.range!.fim).toBe(TOTAL_BYTES - 1);
  });

  it("baixa inteiro quando o formato nao e MP3 (importacao do YouTube)", () => {
    const plano = planejarDownload({
      ...base,
      contentType: "audio/mp4",
      url: "https://cdn.yhc.com.br/gravacoes-audio/yt.m4a",
      inicio: 1200,
      fim: 3000,
    });
    expect(plano.range).toBeNull();
    expect(plano.offsetSegundos).toBe(0);
  });

  it("baixa inteiro quando falta tamanho ou duracao", () => {
    expect(planejarDownload({ ...base, tamanhoTotal: null, inicio: 1200, fim: 3000 }).range).toBeNull();
    expect(planejarDownload({ ...base, duracaoTotal: null, inicio: 1200, fim: 3000 }).range).toBeNull();
    expect(planejarDownload({ ...base, duracaoTotal: 0, inicio: 1200, fim: 3000 }).range).toBeNull();
  });

  it("baixa inteiro quando nao ha recorte", () => {
    expect(planejarDownload({ ...base, inicio: null, fim: null }).range).toBeNull();
  });

  it("baixa inteiro quando o trecho cobre quase todo o culto", () => {
    const plano = planejarDownload({ ...base, inicio: 10, fim: TOTAL_SEGUNDOS - 10 });
    expect(plano.range).toBeNull();
  });

  it("baixa inteiro quando as bordas estao invertidas", () => {
    expect(planejarDownload({ ...base, inicio: 3000, fim: 1200 }).range).toBeNull();
  });

  it("aceita MP3 pela extensao quando o Content-Type nao ajuda", () => {
    const plano = planejarDownload({
      ...base,
      contentType: "application/octet-stream",
      inicio: 1200,
      fim: 3000,
    });
    expect(plano.range).not.toBeNull();
  });
});
