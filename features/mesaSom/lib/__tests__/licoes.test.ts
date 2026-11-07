import { describe, expect, it } from "vitest";
import { ZERO } from "../config";
import { alvosAtuais, cabosNaBandeja, criarTreino, IDS_LICAO, LICOES, reduzirTreino, type Treino } from "../licoes";
import type { AcaoMesa } from "../simulador";

const INICIO = 1_000_000;

// Percorre uma lição como o voluntário: cada ação tem que cumprir o passo atual
function percorrer(id: string, roteiro: AcaoMesa[][]) {
  let agora = INICIO;
  let t: Treino = criarTreino(id, agora, []);
  const total = LICOES.find((l) => l.id === id)?.passos.length;
  expect(roteiro).toHaveLength(total ?? -1);
  roteiro.forEach((acoes, n) => {
    expect(t.passo).toBe(n);
    expect(t.aguardando).toBe(false);
    agora += 11_000;
    for (const acao of acoes) t = reduzirTreino(t, { tipo: "mesa", acao, agora });
    expect(t.aguardando, `passo ${n + 1} de ${id} não concluiu`).toBe(true);
    expect(t.msg?.k).toBe("ok");
    t = reduzirTreino(t, { tipo: "avancar" });
  });
  return t;
}

const liga = (id: string, porta: string): AcaoMesa[] => [{ tipo: "cabo", id }, { tipo: "porta", porta }];
const fader = (id: number | "main", f: number): AcaoMesa[] => [{ tipo: "fader", id, f }];
const so = (acao: AcaoMesa): AcaoMesa[] => [acao];

describe("cada lição do início ao fim", () => {
  it("cabos", () => {
    const t = percorrer("cabos", [
      liga("dc", "p-dc"),
      liga("rede", "p-pri"),
      so({ tipo: "vista", vista: "rack" }),
      liga("m0", "r-1"),
      liga("m1", "r-2"),
      liga("m4", "r-5"),
    ]);
    expect(t.concluida).toBe(true);
    expect(t.feitas).toEqual(["cabos"]);
  });

  it("ligar e desligar", () => {
    const t = percorrer("ligar", [
      so({ tipo: "chave" }),
      so({ tipo: "fimBoot" }),
      so({ tipo: "chave" }),
      so({ tipo: "chave" }),
    ]);
    expect(t.concluida).toBe(true);
  });

  it("canais e mute", () => {
    const t = percorrer("mute", [
      so({ tipo: "on", id: 0 }),
      fader(0, ZERO),
      so({ tipo: "on", id: 0 }),
      so({ tipo: "on", id: 0 }),
      so({ tipo: "banco", banco: "in2" }),
      so({ tipo: "banco", banco: "in1" }),
    ]);
    expect(t.concluida).toBe(true);
  });

  it("controlar cada caixa", () => {
    const t = percorrer("caixas", [
      so({ tipo: "on", id: "main" }),
      so({ tipo: "on", id: "main" }),
      fader("main", 0.5),
      fader("main", ZERO),
      so({ tipo: "banco", banco: "out" }),
      fader(1, 0),
      fader(1, ZERO),
      so({ tipo: "on", id: 3 }),
      so({ tipo: "on", id: 3 }),
      so({ tipo: "banco", banco: "in1" }),
      so({ tipo: "envio", i: 0 }),
      fader(0, ZERO),
      so({ tipo: "sair" }),
    ]);
    expect(t.concluida).toBe(true);
    // Subir o envio do Mon 1 não mexeu no canal
    expect(t.s.ch[0].f).toBe(ZERO);
    expect(t.s.ch[0].send[0]).toBe(ZERO);
  });

  it("gravar no pendrive", () => {
    const t = percorrer("gravar", [
      liga("usb", "usb-top"),
      so({ tipo: "abrirRec" }),
      so({ tipo: "recRec" }),
      so({ tipo: "recPlay" }),
      so({ tipo: "tempo", dt: 5 }),
      so({ tipo: "recStop" }),
      so({ tipo: "ejetar" }),
      so({ tipo: "porta", porta: "usb-top" }),
    ]);
    expect(t.concluida).toBe(true);
    expect(t.s.rec.arquivos).toHaveLength(1);
  });

  it("carregar presets", () => {
    const t = percorrer("presets", [
      so({ tipo: "abrirCena" }),
      so({ tipo: "selecionarCena", id: "A01" }),
      so({ tipo: "recall" }),
      fader(1, 0),
      so({ tipo: "recall" }),
      so({ tipo: "selecionarCena", id: "A05" }),
      so({ tipo: "recall" }),
      so({ tipo: "selecionarCena", id: "A06" }),
      so({ tipo: "recall" }),
      so({ tipo: "fecharTela" }),
    ]);
    expect(t.concluida).toBe(true);
    expect(t.s.cena).toBe("A06");
  });

  it("banda e retornos", () => {
    const t = percorrer("banda", [
      fader(1, ZERO),
      so({ tipo: "banco", banco: "in2" }),
      fader(4, 0.646),
      so({ tipo: "on", id: 5 }),
      so({ tipo: "banco", banco: "in1" }),
      so({ tipo: "envio", i: 0 }),
      fader(4, ZERO),
      so({ tipo: "banco", banco: "in2" }),
      fader(4, 0.292),
      so({ tipo: "envio", i: 2 }),
      fader(3, ZERO),
      so({ tipo: "envio", i: 1 }),
      fader("main", ZERO),
      so({ tipo: "sair" }),
    ]);
    expect(t.concluida).toBe(true);
    expect(t.s.ch[12].f).toBe(0.646);
    expect(t.s.ch[12].send[0]).toBe(0.292);
    expect(t.s.ch[13].on).toBe(false);
    expect(t.s.mix[1].f).toBe(ZERO);
  });
});

describe("andamento do treino", () => {
  it("o passo não avança com a ação errada", () => {
    const t = reduzirTreino(criarTreino("mute", INICIO, []), { tipo: "mesa", acao: { tipo: "on", id: 1 }, agora: INICIO });
    expect(t.aguardando).toBe(false);
    expect(t.passo).toBe(0);
  });

  it("aviso de erro fica na tela e não avança", () => {
    const inicio = criarTreino("cabos", INICIO, []);
    const comCabo = reduzirTreino(inicio, { tipo: "mesa", acao: { tipo: "cabo", id: "rede" }, agora: INICIO });
    const t = reduzirTreino(comCabo, { tipo: "mesa", acao: { tipo: "porta", porta: "p-dc" }, agora: INICIO });
    expect(t.msg?.k).toBe("erro");
    expect(t.s.dc).toBe(false);
    expect(t.passo).toBe(0);
  });

  it("aviso continua na tela enquanto arrasta outro cabo, para a porta não sair de baixo do dedo", () => {
    const inicio = criarTreino("cabos", INICIO, []);
    const comAviso = reduzirTreino(inicio, { tipo: "mesa", acao: { tipo: "porta", porta: "p-sec" }, agora: INICIO });
    expect(comAviso.msg).not.toBeNull();
    const arrastando = reduzirTreino(comAviso, { tipo: "mesa", acao: { tipo: "pegarCabo", id: "dc" }, agora: INICIO });
    expect(arrastando.msg).toEqual(comAviso.msg);
    expect(arrastando.s.cabo).toBe("dc");
    const largou = reduzirTreino(arrastando, { tipo: "mesa", acao: { tipo: "largarCabo" }, agora: INICIO });
    expect(largou.s.cabo).toBeNull();
  });

  it("pular até o fim conclui sem contar como feita", () => {
    let t = criarTreino("ligar", INICIO, []);
    for (let i = 0; i < 4; i++) {
      t = reduzirTreino(t, { tipo: "pular" });
      if (t.aguardando) t = reduzirTreino(t, { tipo: "avancar" });
    }
    expect(t.concluida).toBe(true);
    expect(t.feitas).toEqual([]);
  });

  it("recomeçar volta ao primeiro passo e guarda as feitas", () => {
    const t = reduzirTreino({ ...criarTreino("mute", INICIO, ["cabos"]), passo: 3 }, { tipo: "abrir", id: "mute", agora: INICIO });
    expect(t.passo).toBe(0);
    expect(t.feitas).toEqual(["cabos"]);
  });

  it("lição desconhecida cai na primeira", () => {
    expect(criarTreino("nao-existe", INICIO, []).licaoId).toBe(IDS_LICAO[0]);
  });

  it("modo livre não tem passo a cumprir", () => {
    const t = reduzirTreino(criarTreino("livre", INICIO, []), { tipo: "mesa", acao: { tipo: "on", id: 0 }, agora: INICIO });
    expect(t.aguardando).toBe(false);
    expect(alvosAtuais(t)).toEqual([]);
  });

  it("tempo sem gravação não muda o treino, para não redesenhar à toa", () => {
    const t = criarTreino("gravar", INICIO, []);
    expect(reduzirTreino(t, { tipo: "mesa", acao: { tipo: "tempo", dt: 1 }, agora: INICIO })).toBe(t);
  });
});

describe("destaque do passo", () => {
  it("manda para a vista certa antes do controle", () => {
    const t = criarTreino("cabos", INICIO, []);
    expect(alvosAtuais(t)).toEqual(["c-dc"]);
    const emCima = reduzirTreino(t, { tipo: "mesa", acao: { tipo: "vista", vista: "top" }, agora: INICIO });
    expect(alvosAtuais(emCima)).toEqual(["v-rear"]);
  });

  it("depois de pegar o cabo, destaca a porta", () => {
    const t = reduzirTreino(criarTreino("cabos", INICIO, []), { tipo: "mesa", acao: { tipo: "cabo", id: "dc" }, agora: INICIO });
    expect(alvosAtuais(t)).toEqual(["p-dc"]);
  });

  it("com a lista de presets fechada, destaca o nome do preset", () => {
    const t = { ...criarTreino("presets", INICIO, []), passo: 1 };
    expect(alvosAtuais(t)).toEqual(["tb-cena"]);
    const aberta = reduzirTreino(t, { tipo: "mesa", acao: { tipo: "abrirCena" }, agora: INICIO });
    expect(alvosAtuais(aberta)).toEqual(["cn-A01"]);
  });
});

describe("bandeja de cabos", () => {
  it("mostra o que cabe em cada vista", () => {
    const cabos = criarTreino("cabos", INICIO, []);
    expect(cabosNaBandeja(cabos.s, "cabos").map((c) => c.id)).toEqual(["dc", "rede"]);
    const gravar = criarTreino("gravar", INICIO, []);
    expect(cabosNaBandeja(gravar.s, "gravar").map((c) => c.id)).toEqual(["usb"]);
    expect(cabosNaBandeja(criarTreino("mute", INICIO, []).s, "mute")).toEqual([]);
    expect(cabosNaBandeja({ ...gravar.s, vista: "rack" }, "gravar")).toHaveLength(14);
  });
});
