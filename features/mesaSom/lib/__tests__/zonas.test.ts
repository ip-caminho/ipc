import { describe, expect, it } from "vitest";
import { criarTreino, LICOES, reduzirTreino, type Treino } from "../licoes";
import { zonaDoAlvo, zonaDoPasso } from "../zonas";

const INICIO = 1_000_000;

describe("zonas da mesa no celular", () => {
  it("todo passo de toda lição aponta para uma zona", () => {
    for (const licao of LICOES.filter((l) => l.passos.length)) {
      let t: Treino = criarTreino(licao.id, INICIO, []);
      while (!t.concluida) {
        expect(zonaDoPasso(t), `${licao.id}, passo ${t.passo + 1}`).not.toBeNull();
        t = reduzirTreino(t, { tipo: "pular" });
        if (t.aguardando) t = reduzirTreino(t, { tipo: "avancar" });
      }
    }
  });

  it("pegar o cabo não troca de zona: o cabo e a porta ficam no mesmo lugar", () => {
    for (const [cabo, porta] of [["c-dc", "p-dc"], ["c-rede", "p-pri"], ["c-m0", "r-1"], ["c-usb", "usb-top"]]) {
      expect(zonaDoAlvo(cabo)).toBe(zonaDoAlvo(porta));
    }
  });

  it("separa tela e faders como na mesa", () => {
    expect(zonaDoAlvo("snd-0")).toBe("tela");
    expect(zonaDoAlvo("cn-A01")).toBe("tela");
    expect(zonaDoAlvo("fader-main")).toBe("faders");
    expect(zonaDoAlvo("bk-out")).toBe("faders");
    expect(zonaDoAlvo("v-rack")).toBe("rack");
  });

  it("modo livre e lição concluída não puxam para zona nenhuma", () => {
    expect(zonaDoPasso(criarTreino("livre", INICIO, []))).toBeNull();
    expect(zonaDoPasso({ ...criarTreino("ligar", INICIO, []), concluida: true })).toBeNull();
  });
});
