// Logica pura da escala do educacional: agrupa as linhas (uma por turma) em
// dias, detecta lacunas (turma sem professor) e conflitos (mesma pessoa em 2+
// turmas no mesmo dia), e lista os domingos de um mes. Sem I/O — testavel.

import { TURMA_OPTIONS } from "./constants";

export type PapelEscala = "PROFESSOR" | "AUXILIAR" | "APOIO";

export interface EscalaMembro {
  membroId: string;
  papel: PapelEscala;
  nome: string;
  foto: string | null;
  cacValidade: string | null;
  cacVencido: boolean;
}

// Linha crua vinda de listEscalas (uma por turma).
export interface EscalaRow {
  _id: string;
  data: string;
  subgrupo?: string;
  observacoes?: string;
  membros: EscalaMembro[];
}

export interface TurmaSlot {
  subgrupo: string;
  escalaId: string | null;
  membros: EscalaMembro[];
  semProfessor: boolean;
}

export interface DiaEscala {
  data: string;
  turmas: TurmaSlot[];
  conflitos: string[]; // nomes escalados em 2+ turmas no mesmo dia
  temLacuna: boolean;
  temCacVencido: boolean;
}

const TURMAS = TURMA_OPTIONS.map((t) => t.value);

/**
 * Agrupa as linhas por data e, dentro de cada dia, mapeia todas as turmas
 * (sempre na ordem de TURMA_OPTIONS). Turma sem linha ou sem professor vira
 * lacuna. Retorna ordenado por data crescente.
 */
export function agruparEscalas(escalas: EscalaRow[]): DiaEscala[] {
  const porData = new Map<string, EscalaRow[]>();
  for (const e of escalas) {
    const arr = porData.get(e.data) ?? [];
    arr.push(e);
    porData.set(e.data, arr);
  }

  const dias: DiaEscala[] = [];
  for (const [data, rows] of porData) {
    const rowPorTurma = new Map<string, EscalaRow>();
    for (const r of rows) {
      if (r.subgrupo) rowPorTurma.set(r.subgrupo, r);
    }

    const turmas: TurmaSlot[] = TURMAS.map((subgrupo) => {
      const row = rowPorTurma.get(subgrupo);
      const membros = row?.membros ?? [];
      return {
        subgrupo,
        escalaId: row?._id ?? null,
        membros,
        semProfessor: !membros.some((m) => m.papel === "PROFESSOR"),
      };
    });

    // Conflito: mesmo membroId aparece em 2+ turmas no mesmo dia.
    const contagem = new Map<string, { nome: string; n: number }>();
    for (const t of turmas) {
      for (const m of t.membros) {
        const cur = contagem.get(m.membroId) ?? { nome: m.nome, n: 0 };
        cur.n += 1;
        contagem.set(m.membroId, cur);
      }
    }
    const conflitos = [...contagem.values()]
      .filter((c) => c.n > 1)
      .map((c) => c.nome);

    dias.push({
      data,
      turmas,
      conflitos,
      temLacuna: turmas.some((t) => t.semProfessor),
      temCacVencido: turmas.some((t) => t.membros.some((m) => m.cacVencido)),
    });
  }

  return dias.sort((a, b) => a.data.localeCompare(b.data));
}

/** Separa dias em proximos (data >= hoje) e passados, ambos ordenados. */
export function particionarDias(
  dias: DiaEscala[],
  hoje: string
): { proximos: DiaEscala[]; passados: DiaEscala[] } {
  const proximos = dias.filter((d) => d.data >= hoje);
  const passados = dias.filter((d) => d.data < hoje).reverse(); // mais recente primeiro
  return { proximos, passados };
}

/** Domingos (YYYY-MM-DD) de um mes. Meio-dia UTC evita drift de fuso. */
export function domingosDoMes(ano: number, mes: number): string[] {
  const res: string[] = [];
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  for (let d = 1; d <= diasNoMes; d++) {
    if (new Date(Date.UTC(ano, mes - 1, d, 12)).getUTCDay() === 0) {
      res.push(
        `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
  }
  return res;
}
