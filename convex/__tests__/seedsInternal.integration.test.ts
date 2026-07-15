import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import { seedUser, as } from "./helpers";

// Os seeds eram mutations PUBLICAS sem gate: um anonimo podia popular papeis,
// config da igreja, modulos, salas, ministerios, funcoes e ate 55 criancas.
// Sao idempotentes (insert-only), entao o poder era baixo — mas escrita ungated
// nao tem porque existir: viraram internalMutation (rodam via `npx convex run`).
//
// garantirCultosFuturos NAO virou internal: o layout de /escalas a dispara no
// mount para qualquer membro. Ali o gate correto e login.

// A prova de que um seed nao e mais chamavel do cliente e de TIPO, nao de
// runtime: `api` so tem as funcoes publicas, entao cada @ts-expect-error abaixo
// falha o `tsc` se o seed voltar a ser `mutation`. (Runtime nao serve: o
// convex-test executa internas por string ref igual as publicas, e o proxy do
// `api` resolve qualquer caminho — nenhum dos dois reproduz o cliente real.)
function _seedsNaoEstaoNaApiPublica() {
  // @ts-expect-error seedRolePermissions e internal
  void api.preferencias.rbac.seedRolePermissions;
  // @ts-expect-error seedIgrejaInfo e internal
  void api.preferencias.mutations.seedIgrejaInfo;
  // @ts-expect-error seedModulos e internal
  void api.modulos.mutations.seedModulos;
  // @ts-expect-error seedMinisterios e internal
  void api.ministerios.mutations.seedMinisterios;
  // @ts-expect-error seedSalas e internal
  void api.salas.mutations.seedSalas;
  // @ts-expect-error seedChecklistTemplate e internal
  void api.multimidia.mutations.seedChecklistTemplate;
  // @ts-expect-error seedCriancas e internal
  void api.educacional.mutations.seedCriancas;
  // @ts-expect-error seedFuncoes e internal
  void api.escalas.funcoes.seedFuncoes;
}

describe("seeds — nao sao mais chamaveis do cliente", () => {

  it("continuam rodando pelo backend (npx convex run)", async () => {
    const t = convexTest(schema, modules);
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await t.mutation(internal.modulos.mutations.seedModulos, {});
    const modulosSeeded = await t.run(async (ctx) =>
      await ctx.db.query("modulos").collect()
    );
    expect(modulosSeeded.length).toBeGreaterThan(0);
  });
});

describe("escalas.garantirCultosFuturos — exige login", () => {
  it("anonimo NAO insere cultos", async () => {
    const t = convexTest(schema, modules);
    await expect(
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      t.mutation(api.escalas.mutations.garantirCultosFuturos, {})
    ).rejects.toThrow();
    const cultos = await t.run(async (ctx) => await ctx.db.query("cultos").collect());
    expect(cultos.length).toBe(0);
  });

  // O layout de /escalas dispara isto para qualquer membro que abre a tela.
  it("membro comum continua garantindo os cultos (sem regressao)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { role: "membro" });
    const r = await as(t, userId).mutation(api.escalas.mutations.garantirCultosFuturos, {});
    expect(r.criados).toBeGreaterThan(0);
  });
});
