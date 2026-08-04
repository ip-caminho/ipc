import { describe, it, expect, vi } from "vitest";
import { apagarArquivosSumidos, urlsDoDocumento } from "../orfaos";

const A = "https://s3.us-east-005.backblazeb2.com/ipc-privado/membros/fotos/x_1.jpg";
const B = "https://s3.us-east-005.backblazeb2.com/ipc-privado/membros/fotos/x_2.jpg";
const COMP1 = "https://s3.us-east-005.backblazeb2.com/ipc-privado/retiro-comprovantes/i_1.jpg";
const COMP2 = "https://s3.us-east-005.backblazeb2.com/ipc-privado/retiro-comprovantes/i_2.jpg";

function ctxFake() {
  const agendados: string[] = [];
  return {
    agendados,
    ctx: {
      scheduler: {
        runAfter: async (_ms: number, _fn: unknown, args: { url: string }) => {
          agendados.push(args.url);
          return null;
        },
      },
    },
  };
}

describe("urlsDoDocumento", () => {
  it("acha campo simples", () => {
    expect(urlsDoDocumento("entidades", { foto: A })).toEqual([A]);
    expect(urlsDoDocumento("entidades", { foto: undefined })).toEqual([]);
  });

  it("acha arquivo dentro de arrays da inscricao", () => {
    const doc = {
      recebimentos: [{ comprovanteUrl: COMP1 }, { valor: 100 }],
      comprovantesPendentes: [{ comprovanteUrl: COMP2 }],
    };
    expect(urlsDoDocumento("inscricoesRetiro", doc).sort()).toEqual([COMP1, COMP2].sort());
  });

  it("tabela sem arquivo devolve vazio", () => {
    expect(urlsDoDocumento("tarefas", { titulo: "x" })).toEqual([]);
  });
});

describe("apagarArquivosSumidos", () => {
  it("troca de foto apaga a antiga e preserva a nova", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(ctx, "entidades", { foto: A }, { foto: B });
    expect(agendados).toEqual([A]);
  });

  it("limpar o campo apaga o arquivo", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(ctx, "entidades", { foto: A }, { foto: undefined });
    expect(agendados).toEqual([A]);
  });

  it("excluir o documento (depois=null) apaga tudo que ele tinha", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(
      ctx,
      "inscricoesRetiro",
      { recebimentos: [{ comprovanteUrl: COMP1 }], comprovantesPendentes: [{ comprovanteUrl: COMP2 }] },
      null,
    );
    expect(agendados.sort()).toEqual([COMP1, COMP2].sort());
  });

  it("salvar sem mexer no arquivo nao apaga nada", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(ctx, "entidades", { foto: A }, { foto: A, nomeCompleto: "novo" });
    expect(agendados).toEqual([]);
  });

  it("remover um comprovante preserva os outros da mesma inscricao", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(
      ctx,
      "inscricoesRetiro",
      { recebimentos: [{ comprovanteUrl: COMP1 }, { comprovanteUrl: COMP2 }] },
      { recebimentos: [{ comprovanteUrl: COMP2 }] },
    );
    expect(agendados).toEqual([COMP1]);
  });

  it("documento que nunca teve arquivo nao gera trabalho", async () => {
    const { ctx, agendados } = ctxFake();
    const spy = vi.spyOn(ctx.scheduler, "runAfter");
    await apagarArquivosSumidos(ctx, "entidades", { foto: undefined }, null);
    expect(agendados).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("documento legal nao some por esvaziamento de campo", () => {
  const CARTA = "https://s3.us-east-005.backblazeb2.com/ipc-privado/membros/cartas-transferencia/m_1.pdf";
  const CARTA2 = "https://s3.us-east-005.backblazeb2.com/ipc-privado/membros/cartas-transferencia/m_2.pdf";

  it("esvaziar o campo NAO apaga a carta", async () => {
    // O form eclesiastico limpa a carta ao trocar a forma de demissao; um
    // clique errado nao pode destruir documento legal.
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(ctx, "membros", { cartaTransferencia: CARTA }, {});
    expect(agendados).toEqual([]);
  });

  it("substituir por outra carta apaga a antiga", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(
      ctx,
      "membros",
      { cartaTransferencia: CARTA },
      { cartaTransferencia: CARTA2 },
    );
    expect(agendados).toEqual([CARTA]);
  });

  it("excluir o documento inteiro apaga a carta", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(ctx, "membros", { cartaTransferencia: CARTA }, null);
    expect(agendados).toEqual([CARTA]);
  });

  it("foto continua sendo apagada ao esvaziar (remover foto e intencional)", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(ctx, "entidades", { foto: A }, {});
    expect(agendados).toEqual([A]);
  });

  it("mesma URL em dois campos gera um unico delete", async () => {
    const { ctx, agendados } = ctxFake();
    await apagarArquivosSumidos(
      ctx,
      "inscricoesRetiro",
      { recebimentos: [{ comprovanteUrl: COMP1 }], comprovantesPendentes: [{ comprovanteUrl: COMP1 }] },
      null,
    );
    expect(agendados).toEqual([COMP1]);
  });
});
