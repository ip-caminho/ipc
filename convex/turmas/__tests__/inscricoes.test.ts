import { describe, it, expect } from "vitest";
import { avaliarJanelaInscricao } from "../lib/inscricoes";

const aberta = { status: "ABERTA" };

describe("avaliarJanelaInscricao", () => {
  it("sem datas: aceita enquanto a turma estiver ABERTA", () => {
    expect(avaliarJanelaInscricao(aberta, "2026-08-10").aberta).toBe(true);
  });

  it("turma nao ABERTA nunca aceita, mesmo dentro da janela", () => {
    const r = avaliarJanelaInscricao(
      { status: "ENCERRADA", inscricoesDe: "2026-08-01", inscricoesAte: "2026-08-31" },
      "2026-08-10"
    );
    expect(r).toEqual({ aberta: false, motivo: "NAO_ABERTA" });
  });

  it("antes da abertura recusa com motivo proprio", () => {
    const r = avaliarJanelaInscricao(
      { ...aberta, inscricoesDe: "2026-08-15" },
      "2026-08-14"
    );
    expect(r).toEqual({ aberta: false, motivo: "AINDA_NAO_COMECOU" });
  });

  it("depois do encerramento recusa com motivo proprio", () => {
    const r = avaliarJanelaInscricao(
      { ...aberta, inscricoesAte: "2026-08-20" },
      "2026-08-21"
    );
    expect(r).toEqual({ aberta: false, motivo: "ENCERRADA" });
  });

  it("janela e inclusiva nas duas pontas", () => {
    const janela = { ...aberta, inscricoesDe: "2026-08-15", inscricoesAte: "2026-08-20" };
    expect(avaliarJanelaInscricao(janela, "2026-08-15").aberta).toBe(true);
    expect(avaliarJanelaInscricao(janela, "2026-08-20").aberta).toBe(true);
    expect(avaliarJanelaInscricao(janela, "2026-08-17").aberta).toBe(true);
  });

  it("compara datas de anos diferentes corretamente (nao e ordem alfabetica ingenua)", () => {
    const janela = { ...aberta, inscricoesDe: "2026-12-20", inscricoesAte: "2027-01-10" };
    expect(avaliarJanelaInscricao(janela, "2026-12-31").aberta).toBe(true);
    expect(avaliarJanelaInscricao(janela, "2027-01-05").aberta).toBe(true);
    expect(avaliarJanelaInscricao(janela, "2027-01-11").motivo).toBe("ENCERRADA");
    expect(avaliarJanelaInscricao(janela, "2026-12-19").motivo).toBe("AINDA_NAO_COMECOU");
  });

  it("so uma ponta definida deixa a outra livre", () => {
    expect(
      avaliarJanelaInscricao({ ...aberta, inscricoesDe: "2026-01-01" }, "2030-01-01").aberta
    ).toBe(true);
    expect(
      avaliarJanelaInscricao({ ...aberta, inscricoesAte: "2030-01-01" }, "2020-01-01").aberta
    ).toBe(true);
  });
});
