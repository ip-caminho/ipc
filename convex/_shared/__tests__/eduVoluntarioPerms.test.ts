import { describe, it, expect } from "vitest";
import {
  derivedPermsForPapel,
  mergeDerived,
  EDU_VOLUNTARIO_DERIVED,
} from "../eduVoluntarioPerms";

describe("derivedPermsForPapel", () => {
  it("PROFESSOR herda o conjunto Professor", () => {
    expect(derivedPermsForPapel("PROFESSOR")).toEqual([...EDU_VOLUNTARIO_DERIVED]);
  });
  it("AUXILIAR herda o conjunto Professor", () => {
    expect(derivedPermsForPapel("AUXILIAR")).toEqual([...EDU_VOLUNTARIO_DERIVED]);
  });
  it("APOIO nao herda nada", () => {
    expect(derivedPermsForPapel("APOIO")).toEqual([]);
  });
  it("papel ausente/undefined nao herda", () => {
    expect(derivedPermsForPapel(undefined)).toEqual([]);
    expect(derivedPermsForPapel(null)).toEqual([]);
    expect(derivedPermsForPapel("")).toEqual([]);
  });
});

describe("mergeDerived", () => {
  it("une sem duplicar", () => {
    const r = mergeDerived(["educacional:read", "membros:read"], [
      "criancas:read",
      "educacional:read",
      "relatorio_edu:write",
    ]);
    expect(r).toContain("membros:read");
    expect(r).toContain("criancas:read");
    expect(r).toContain("relatorio_edu:write");
    // educacional:read aparece uma vez so
    expect(r.filter((p) => p === "educacional:read")).toHaveLength(1);
  });

  it("base com * fica intacta (admin)", () => {
    expect(mergeDerived(["*"], ["relatorio_edu:write"])).toEqual(["*"]);
  });

  it("derivadas vazias retorna a base", () => {
    const base = ["educacional:read"];
    expect(mergeDerived(base, [])).toBe(base);
  });

  it("nao muta a base", () => {
    const base = ["educacional:read"];
    mergeDerived(base, ["relatorio_edu:write"]);
    expect(base).toEqual(["educacional:read"]);
  });
});
