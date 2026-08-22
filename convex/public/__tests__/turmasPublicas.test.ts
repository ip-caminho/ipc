import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { getSaoPauloDateString } from "../../_shared/datetime";

// A turma so vai para o site se a igreja marcar. O opt-in existe porque a
// resposta publica inclui o token — que e o endereco do formulario.
function novoTeste() {
  return convexTest(schema, modules);
}

const base = {
  dataInicio: "2026-09-20",
  diaSemana: "DOMINGO",
  horario: "08:30",
  camposSistema: ["nomeCompleto"],
  vagasOcupadas: 0,
  criadoEm: 1,
};

async function seedTurma(
  t: ReturnType<typeof novoTeste>,
  extra: Record<string, unknown>
) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("turmas", {
      nome: "Novos Membros 2/2026",
      status: "ABERTA",
      token: "tok-publico",
      ...base,
      ...extra,
    } as never)
  );
}

describe("public.turmas.listAbertas", () => {
  it("nao lista turma sem publicarNoSite", async () => {
    const t = novoTeste();
    await seedTurma(t, {});
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    expect(await t.query(api.public.turmas.listAbertas, {})).toEqual([]);
  });

  it("lista turma marcada, com token para o link", async () => {
    const t = novoTeste();
    await seedTurma(t, { publicarNoSite: true, vagas: 20 });

    const r = await t.query(api.public.turmas.listAbertas, {});
    expect(r.length).toBe(1);
    expect(r[0].nome).toBe("Novos Membros 2/2026");
    expect(r[0].token).toBe("tok-publico");
    expect(r[0].vagasRestantes).toBe(20);
  });

  it("some quando a janela fecha, mesmo marcada", async () => {
    const t = novoTeste();
    await seedTurma(t, { publicarNoSite: true, inscricoesAte: "2020-01-01" });
    expect(await t.query(api.public.turmas.listAbertas, {})).toEqual([]);
  });

  it("nao aparece antes da abertura das inscricoes", async () => {
    const t = novoTeste();
    await seedTurma(t, { publicarNoSite: true, inscricoesDe: "2090-01-01" });
    expect(await t.query(api.public.turmas.listAbertas, {})).toEqual([]);
  });

  it("aparece dentro da janela", async () => {
    const t = novoTeste();
    const hoje = getSaoPauloDateString();
    await seedTurma(t, {
      publicarNoSite: true,
      inscricoesDe: hoje,
      inscricoesAte: hoje,
    });
    expect((await t.query(api.public.turmas.listAbertas, {})).length).toBe(1);
  });

  it("turma encerrada nao aparece nem marcada", async () => {
    const t = novoTeste();
    await seedTurma(t, { publicarNoSite: true, status: "ENCERRADA" });
    expect(await t.query(api.public.turmas.listAbertas, {})).toEqual([]);
  });
});
