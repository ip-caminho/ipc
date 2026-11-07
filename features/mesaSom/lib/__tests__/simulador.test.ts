import { describe, expect, it } from "vitest";
import { ZERO } from "../config";
import { db, estadoBase, nivelMix, nivelPA, reduzir, valorFader, type AcaoMesa, type Estado } from "../simulador";

const AGORA = 1_000_000;
const SINAL = Array<number>(16).fill(0.5);

function aplica(s: Estado, ...acoes: AcaoMesa[]) {
  return acoes.reduce((atual, acao) => reduzir(atual, acao, AGORA).s, s);
}
const msg = (s: Estado, acao: AcaoMesa, agora = AGORA) => reduzir(s, acao, agora).msg;

describe("escala do fader", () => {
  it("segue as marcas impressas na mesa", () => {
    expect(db(ZERO)).toBeCloseTo(0);
    expect(db(1)).toBe(10);
    expect(db(0)).toBe(-Infinity);
    expect(db(0.532)).toBeCloseTo(-10);
  });
});

describe("presets", () => {
  it("abre o pastor e o PC na pregação, com a banda fechada", () => {
    const s = estadoBase();
    expect(s.ch[0].on).toBe(true);
    expect(s.ch[7].on).toBe(true);
    expect(s.ch[8].on).toBe(false);
  });

  it("louvor põe o vocalista no canal 2 e deixa o pastor mudo", () => {
    const s = aplica(estadoBase(), { tipo: "selecionarCena", id: "A01" }, { tipo: "recall" });
    expect(s.cena).toBe("A01");
    expect(s.ch[0].on).toBe(false);
    expect(s.ch[1].on).toBe(true);
    expect(s.ch[12].f).toBe(0.82);
  });

  it("interação abre pastor e sem fio, sem mandar o sem fio aos monitores", () => {
    const s = aplica(estadoBase(), { tipo: "selecionarCena", id: "A06" }, { tipo: "recall" });
    expect(s.ch[0].on).toBe(true);
    expect(s.ch[1].on).toBe(true);
    expect(s.ch[1].send.slice(0, 3)).toEqual([0, 0, 0]);
    expect(s.ch[1].send[3]).toBeGreaterThan(0);
  });

  it("recall descarta o ajuste feito por cima e sai do modo de retorno", () => {
    let s = aplica(estadoBase(), { tipo: "envio", i: 0 }, { tipo: "fader", id: 0, f: 0.1 });
    expect(s.sof).toBe(0);
    expect(s.alterada).toBe(true);
    s = aplica(s, { tipo: "recall" });
    expect(s.sof).toBeNull();
    expect(s.alterada).toBe(false);
    expect(s.ch[0].send[0]).toBe(0.3);
  });
});

describe("faders mudam de função", () => {
  it("INPUT 9-16 troca o canal que o fader controla", () => {
    const s = aplica(estadoBase(), { tipo: "banco", banco: "in2" }, { tipo: "fader", id: 0, f: 0.5 });
    expect(s.ch[8].f).toBe(0.5);
    expect(s.ch[0].f).toBe(ZERO);
  });

  it("OUTPUT controla monitores e rears", () => {
    const s = aplica(estadoBase(), { tipo: "banco", banco: "out" }, { tipo: "fader", id: 3, f: 0.2 }, { tipo: "on", id: 4 });
    expect(s.mix[3].f).toBe(0.2);
    expect(s.mix[4].on).toBe(false);
  });

  it("no retorno aberto, fader é envio e MAIN é o volume geral dele", () => {
    const s = aplica(estadoBase(), { tipo: "envio", i: 1 }, { tipo: "fader", id: 0, f: 0.9 }, { tipo: "fader", id: "main", f: 0.4 });
    expect(s.ch[0].send[1]).toBe(0.9);
    expect(s.ch[0].f).toBe(ZERO);
    expect(s.mix[1].f).toBe(0.4);
    expect(s.main.f).toBe(ZERO);
    expect(valorFader(s, "main")).toBe(0.4);
  });

  it("apertar OUTPUT fecha o retorno aberto", () => {
    const s = aplica(estadoBase(), { tipo: "envio", i: 1 }, { tipo: "banco", banco: "out" });
    expect(s.sof).toBeNull();
  });

  it("saídas fora de uso não abrem", () => {
    const s = estadoBase();
    expect(reduzir(s, { tipo: "envio", i: 5 }, AGORA).s.sof).toBeNull();
    expect(msg(s, { tipo: "envio", i: 5 })?.t).toContain("não está em uso");
  });
});

describe("o que toca em cada caixa", () => {
  it("mutar o MAIN cala só o PA", () => {
    const s = aplica(estadoBase(), { tipo: "on", id: "main" });
    expect(nivelPA(s, SINAL)).toBe(0);
    expect(nivelMix(s, SINAL, 0)).toBeGreaterThan(0);
  });

  it("mutar o canal corta o som dele em todas as caixas", () => {
    const s = aplica(estadoBase(), { tipo: "on", id: 0 }, { tipo: "on", id: 7 });
    for (const nivel of [nivelPA(s, SINAL), nivelMix(s, SINAL, 0), nivelMix(s, SINAL, 3)]) expect(nivel).toBe(0);
  });

  it("baixar o canal não mexe no monitor, mas baixa a rear", () => {
    const antes = estadoBase();
    const depois = aplica(antes, { tipo: "fader", id: 0, f: 0.2 }, { tipo: "fader", id: 7, f: 0.2 });
    expect(nivelMix(depois, SINAL, 0)).toBeCloseTo(nivelMix(antes, SINAL, 0));
    expect(nivelMix(depois, SINAL, 3)).toBeLessThan(nivelMix(antes, SINAL, 3));
  });

  it("sem o cabo de rede nada chega às caixas", () => {
    const s = aplica(estadoBase(), { tipo: "porta", porta: "p-pri" });
    expect(s.dante).toBeNull();
    expect(nivelPA(s, SINAL)).toBe(0);
    expect(nivelMix(s, SINAL, 0)).toBe(0);
  });
});

describe("erros didáticos nos cabos", () => {
  const comCabo = (id: string): Estado => ({ ...estadoBase(), dante: null, cabo: id });

  it("rede só vale no PRIMARY", () => {
    for (const porta of ["p-sec", "p-net"]) {
      const r = reduzir(comCabo("rede"), { tipo: "porta", porta }, AGORA);
      expect(r.s.dante).toBeNull();
      expect(r.msg?.k).toBe("erro");
    }
    expect(reduzir(comCabo("rede"), { tipo: "porta", porta: "p-pri" }, AGORA).s.dante).toBe("primary");
  });

  it("pendrive não vai no USB TO HOST", () => {
    const r = reduzir(comCabo("usb"), { tipo: "porta", porta: "p-host" }, AGORA);
    expect(r.s.usb).toBe(false);
    expect(r.msg?.t).toContain("USB de cima");
  });

  it("microfone precisa da entrada com o número do canal", () => {
    const s: Estado = { ...estadoBase(), mics: [], cabo: "m0" };
    const errado = reduzir(s, { tipo: "porta", porta: "r-2" }, AGORA);
    expect(errado.s.mics).toEqual([]);
    expect(errado.msg?.t).toContain("canal 1");
    expect(reduzir(s, { tipo: "porta", porta: "i-1" }, AGORA).msg?.t).toContain("rack");
    expect(reduzir(s, { tipo: "porta", porta: "r-1" }, AGORA).s.mics).toEqual([0]);
  });

  it("não tira a energia com a mesa ligada", () => {
    const s = estadoBase();
    const r = reduzir(s, { tipo: "porta", porta: "p-dc" }, AGORA);
    expect(r.s.dc).toBe(true);
    expect(r.msg?.k).toBe("erro");
  });
});

describe("ligar e desligar", () => {
  it("exige 10 s desde o último ajuste para desligar", () => {
    const s: Estado = { ...estadoBase(), ultOp: AGORA };
    expect(reduzir(s, { tipo: "chave" }, AGORA + 3000).s.ligada).toBe(true);
    expect(reduzir(s, { tipo: "chave" }, AGORA + 3000).msg?.t).toContain("7 s");
    expect(reduzir(s, { tipo: "chave" }, AGORA + 10_000).s.ligada).toBe(false);
  });

  it("exige 6 s para religar", () => {
    const s: Estado = { ...estadoBase(), ligada: false, desligouEm: AGORA };
    expect(reduzir(s, { tipo: "chave" }, AGORA + 2000).s.ligada).toBe(false);
    const religada = reduzir(s, { tipo: "chave" }, AGORA + 6000).s;
    expect(religada.ligada).toBe(true);
    expect(religada.boot).toBe(true);
  });

  it("não liga sem energia nem desliga gravando", () => {
    const semDc: Estado = { ...estadoBase(), ligada: false, dc: false };
    expect(reduzir(semDc, { tipo: "chave" }, AGORA).s.ligada).toBe(false);
    const gravando = estadoBase();
    gravando.rec.e = "gravando";
    expect(reduzir(gravando, { tipo: "chave" }, AGORA + 60_000).s.ligada).toBe(true);
  });

  it("mesa desligada ou iniciando não responde aos controles", () => {
    const desligada: Estado = { ...estadoBase(), ligada: false };
    expect(msg(desligada, { tipo: "on", id: 0 })?.t).toContain("desligada");
    const iniciando: Estado = { ...estadoBase(), boot: true };
    expect(msg(iniciando, { tipo: "fader", id: 0, f: 0 })?.t).toContain("iniciar");
    expect(reduzir(iniciando, { tipo: "fader", id: 0, f: 0 }, AGORA).s.ch[0].f).toBe(ZERO);
  });
});

describe("gravador e pendrive", () => {
  it("não grava sem pendrive nem dá play sem preparar", () => {
    const s = estadoBase();
    expect(msg(s, { tipo: "recRec" })?.k).toBe("erro");
    expect(msg(s, { tipo: "recPlay" })?.k).toBe("erro");
  });

  it("pendrive só sai depois de parar e remover", () => {
    let s = aplica({ ...estadoBase(), cabo: "usb" }, { tipo: "porta", porta: "usb-top" }, { tipo: "recRec" }, { tipo: "recPlay" });
    expect(msg(s, { tipo: "porta", porta: "usb-top" })?.t).toContain("Pare a gravação");
    expect(msg(s, { tipo: "ejetar" })?.k).toBe("erro");
    s = aplica(s, { tipo: "tempo", dt: 2 }, { tipo: "recStop" });
    expect(s.rec.arquivos).toHaveLength(1);
    expect(s.rec.arquivos[0].nome).toMatch(/^\d{8}_\d{6}\.mp3$/);
    expect(msg(s, { tipo: "porta", porta: "usb-top" })?.t).toContain("Remover");
    s = aplica(s, { tipo: "ejetar" }, { tipo: "porta", porta: "usb-top" });
    expect(s.usb).toBe(false);
  });

  it("parar sem tempo gravado não cria arquivo", () => {
    const s = aplica({ ...estadoBase(), usb: true }, { tipo: "recRec" }, { tipo: "recStop" });
    expect(s.rec.arquivos).toHaveLength(0);
  });

  it("tempo só corre gravando e pausa segura", () => {
    let s = aplica({ ...estadoBase(), usb: true }, { tipo: "recRec" }, { tipo: "tempo", dt: 3 });
    expect(s.rec.t).toBe(0);
    s = aplica(s, { tipo: "recPlay" }, { tipo: "tempo", dt: 3 }, { tipo: "recPlay" }, { tipo: "tempo", dt: 3 });
    expect(s.rec.e).toBe("pausa");
    expect(s.rec.t).toBe(3);
  });
});

describe("controles fora do treino", () => {
  it("avisam sem mudar nada", () => {
    const s = estadoBase();
    const r = reduzir(s, { tipo: "fora" }, AGORA);
    expect(r.s).toBe(s);
    expect(r.msg?.t).toContain("não faz parte");
  });
});
