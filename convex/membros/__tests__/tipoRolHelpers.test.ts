import { describe, it, expect } from "vitest";
import { getTipoRol } from "../tipoRolHelpers";

describe("getTipoRol", () => {
  describe("status ATIVO", () => {
    it("MEMBRO_COMUNGANTE -> COMUNGANTE", () => {
      expect(getTipoRol("MEMBRO_COMUNGANTE", "ATIVO")).toBe("COMUNGANTE");
    });
    it("MEMBRO_NAO_COMUNGANTE -> NAO_COMUNGANTE", () => {
      expect(getTipoRol("MEMBRO_NAO_COMUNGANTE", "ATIVO")).toBe("NAO_COMUNGANTE");
    });
    it("PRESBITERO -> COMUNGANTE (oficial e comungante por definicao)", () => {
      expect(getTipoRol("PRESBITERO", "ATIVO")).toBe("COMUNGANTE");
    });
    it("DIACONO -> COMUNGANTE", () => {
      expect(getTipoRol("DIACONO", "ATIVO")).toBe("COMUNGANTE");
    });
    it("PASTOR -> COMUNGANTE", () => {
      expect(getTipoRol("PASTOR", "ATIVO")).toBe("COMUNGANTE");
    });
    it("sem cargo definido -> COMUNGANTE (default conservador)", () => {
      expect(getTipoRol(undefined, "ATIVO")).toBe("COMUNGANTE");
    });
  });

  describe("status INATIVO", () => {
    it("retorna PARADEIRO_IGNORADO independente do cargo (Art. 23 IPB)", () => {
      expect(getTipoRol("MEMBRO_COMUNGANTE", "INATIVO")).toBe("PARADEIRO_IGNORADO");
      expect(getTipoRol("MEMBRO_NAO_COMUNGANTE", "INATIVO")).toBe("PARADEIRO_IGNORADO");
      expect(getTipoRol("PRESBITERO", "INATIVO")).toBe("PARADEIRO_IGNORADO");
    });
  });

  describe("status fora do rol", () => {
    it("TRANSFERIDO -> null", () => {
      expect(getTipoRol("MEMBRO_COMUNGANTE", "TRANSFERIDO")).toBeNull();
    });
    it("FALECIDO -> null", () => {
      expect(getTipoRol("PRESBITERO", "FALECIDO")).toBeNull();
    });
    it("DESLIGADO -> null", () => {
      expect(getTipoRol("MEMBRO_COMUNGANTE", "DESLIGADO")).toBeNull();
    });
  });
});
