import { describe, it, expect } from "vitest";
import {
  formatRelatorioWhatsApp,
  type RelatorioParaWhatsApp,
} from "../relatorioWhatsApp";

const base: RelatorioParaWhatsApp = {
  numero: 12,
  data: "2026-07-05", // domingo
  turma: "3-4",
  tema: "A Arca de Noé",
  textosBase: ["Gênesis 6", "Gênesis 9"],
  historia: "Deus mandou Noé construir uma arca.",
  aplicacao: "Assim como Noé confiou, nós confiamos.",
  licaoDeCasa: "Desenhar a arca.",
  voluntarios: [
    { nome: "Ana Souza", papel: "PROFESSOR" },
    { nome: "Bruno Lima", papel: "PROFESSOR" },
    { nome: "Carla Dias", papel: "AUXILIAR" },
  ],
};

describe("formatRelatorioWhatsApp", () => {
  it("monta título Lição N — tema", () => {
    const msg = formatRelatorioWhatsApp(base);
    expect(msg).toContain("📖 *Lição 12 — A Arca de Noé*");
  });

  it("data com dia da semana capitalizado + turma", () => {
    const msg = formatRelatorioWhatsApp(base);
    expect(msg).toContain("🗓 Domingo, 05/07/2026 · Turma 3-4");
  });

  it("lista só os professores (papel PROFESSOR)", () => {
    const msg = formatRelatorioWhatsApp(base);
    expect(msg).toContain("👤 Professores: Ana Souza, Bruno Lima");
    expect(msg).not.toContain("Carla Dias"); // auxiliar fica de fora
  });

  it("inclui texto base, história, aplicação e lição de casa em negrito", () => {
    const msg = formatRelatorioWhatsApp(base);
    expect(msg).toContain("*Texto base:* Gênesis 6, Gênesis 9");
    expect(msg).toContain("*História:* Deus mandou Noé construir uma arca.");
    expect(msg).toContain("*Aplicação:* Assim como Noé confiou, nós confiamos.");
    expect(msg).toContain("*Lição de casa:* Desenhar a arca.");
  });

  it("não repete linha 'Tema' (tema já está no título)", () => {
    const msg = formatRelatorioWhatsApp(base);
    expect(msg).not.toContain("*Tema:*");
  });

  it("omite seções ausentes", () => {
    const msg = formatRelatorioWhatsApp({
      data: "2026-07-05",
      turma: "5-6",
      tema: "Amor ao próximo",
    });
    expect(msg).toContain("📖 *Relatório — Amor ao próximo*");
    expect(msg).not.toContain("*Texto base:*");
    expect(msg).not.toContain("👤 Professores:");
  });

  it("usa professores (legado) quando não há voluntários estruturados", () => {
    const msg = formatRelatorioWhatsApp({
      numero: 3,
      data: "2026-07-05",
      turma: "0-2",
      professores: "Equipe A",
    });
    expect(msg).toContain("👤 Professores: Equipe A");
  });

  it("sem número usa 'Relatório' como base do título", () => {
    const msg = formatRelatorioWhatsApp({
      data: "2026-07-05",
      turma: "7-8",
    });
    expect(msg).toContain("📖 *Relatório*");
  });
});
