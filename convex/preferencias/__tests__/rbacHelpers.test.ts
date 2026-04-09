import { describe, it, expect } from "vitest";
import {
  INITIAL_ROLE_PERMISSIONS,
  resolvePermissions,
  hasPermission,
  togglePermission,
} from "../rbacHelpers";

describe("INITIAL_ROLE_PERMISSIONS", () => {
  it("admin tem wildcard *", () => {
    expect(INITIAL_ROLE_PERMISSIONS.admin).toEqual(["*"]);
  });

  it("secretaria tem permissoes de CRUD sem delete de membros", () => {
    const perms = INITIAL_ROLE_PERMISSIONS.secretaria;
    expect(perms).toContain("membros:read");
    expect(perms).toContain("membros:create");
    expect(perms).toContain("membros:update");
    expect(perms).not.toContain("membros:delete");
    expect(perms).toContain("gravacoes:process_ai");
    expect(perms).toContain("audit:read");
  });

  it("membro tem self_service, diretorio, gravacoes e modulos basicos", () => {
    const perms = INITIAL_ROLE_PERMISSIONS.membro;
    expect(perms).toContain("membros:self_service");
    expect(perms).toContain("diretorio:read");
    expect(perms).toContain("gravacoes:read");
    expect(perms).toContain("biblioteca:read");
    expect(perms).toContain("turmas:read");
  });
});

describe("resolvePermissions", () => {
  it("prioriza permissoes do membro quando existem", () => {
    const result = resolvePermissions(
      ["custom:perm1", "custom:perm2"],
      ["role:perm1"],
      "membro"
    );
    expect(result).toEqual(["custom:perm1", "custom:perm2"]);
  });

  it("ignora permissoes do membro quando array vazio", () => {
    const result = resolvePermissions([], ["role:perm1"], "membro");
    expect(result).toEqual(["role:perm1"]);
  });

  it("ignora permissoes do membro quando undefined", () => {
    const result = resolvePermissions(undefined, ["role:perm1"], "membro");
    expect(result).toEqual(["role:perm1"]);
  });

  it("usa defaults iniciais quando nao tem DB nem membro", () => {
    const result = resolvePermissions(undefined, undefined, "membro");
    expect(result).toEqual(INITIAL_ROLE_PERMISSIONS.membro);
  });

  it("retorna array vazio para role desconhecida sem DB", () => {
    const result = resolvePermissions(undefined, undefined, "inexistente");
    expect(result).toEqual([]);
  });

  it("usa permissoes do DB quando membro nao tem customizacao", () => {
    const customRolePerms = ["gravacoes:read", "gravacoes:create"];
    const result = resolvePermissions(undefined, customRolePerms, "membro");
    expect(result).toEqual(customRolePerms);
  });
});

describe("hasPermission", () => {
  it("wildcard * concede qualquer permissao", () => {
    expect(hasPermission(["*"], "membros:read")).toBe(true);
    expect(hasPermission(["*"], "qualquer:coisa")).toBe(true);
  });

  it("verifica permissao especifica", () => {
    expect(hasPermission(["membros:read", "diretorio:read"], "membros:read")).toBe(true);
    expect(hasPermission(["membros:read", "diretorio:read"], "membros:delete")).toBe(false);
  });

  it("array vazio nao concede nada", () => {
    expect(hasPermission([], "membros:read")).toBe(false);
  });
});

describe("togglePermission", () => {
  it("adiciona permissao quando grant=true", () => {
    const result = togglePermission(["a", "b"], "c", true);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("nao duplica permissao ja existente", () => {
    const result = togglePermission(["a", "b"], "b", true);
    expect(result).toEqual(["a", "b"]);
  });

  it("remove permissao quando grant=false", () => {
    const result = togglePermission(["a", "b", "c"], "b", false);
    expect(result).toEqual(["a", "c"]);
  });

  it("nao altera array quando removendo permissao inexistente", () => {
    const result = togglePermission(["a", "b"], "c", false);
    expect(result).toEqual(["a", "b"]);
  });

  it("nao muta o array original", () => {
    const original = ["a", "b"];
    togglePermission(original, "c", true);
    expect(original).toEqual(["a", "b"]);
  });
});
