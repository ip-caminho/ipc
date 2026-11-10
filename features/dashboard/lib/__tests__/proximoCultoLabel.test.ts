import { describe, it, expect } from "vitest";
import { proximoCultoLabel } from "../proximoCultoLabel";

describe("proximoCultoLabel", () => {
  it("com culto e horário mostra dia e horário", () => {
    // 2026-11-15 é domingo
    expect(
      proximoCultoLabel({ data: "2026-11-15", horario: "10h" }, new Date(2026, 10, 9, 15, 30)),
    ).toBe("domingo, 10h");
  });

  it("com culto sem horário mostra só o dia, sem dígito", () => {
    const label = proximoCultoLabel(
      { data: "2026-11-15", horario: null },
      new Date(2026, 10, 9, 15, 30),
    );
    expect(label).toBe("domingo");
    expect(label).not.toMatch(/\d/);
  });

  it("sem culto mostra o próximo domingo, sem hora", () => {
    // 2026-11-09 é segunda
    const label = proximoCultoLabel(null, new Date(2026, 10, 9, 15, 30));
    expect(label).toBe("domingo");
    expect(label).not.toMatch(/\d/);
  });

  it("sem culto, em domingo, mostra o próprio dia sem hora", () => {
    const label = proximoCultoLabel(undefined, new Date(2026, 10, 15, 9, 45));
    expect(label).toBe("domingo");
    expect(label).not.toMatch(/\d/);
  });
});
