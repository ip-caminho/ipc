/**
 * Rede familiar de um membro para a arvore genealogica (somente leitura).
 *
 * Reconstroi a arvore a partir do parentesco que ja existe no banco:
 * - conjuge  -> membros.conjugeId (bilateral quando espelhado)
 * - pai_filho -> tabela responsaveis (responsavelEntidadeId -> criancaEntidadeId)
 *
 * Sem tabela nova. O layout D3 (features/membros/components/ArvoreFamiliar.tsx)
 * so precisa das arestas conjuge + pai_filho.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAnyPermission } from "../_shared/requirePermission";
import type { Doc, Id } from "../_generated/dataModel";

// Teto rigido de nos varridos (guarda contra grafo patologico / bandwidth).
const MAX_NOS = 200;

type PessoaLite = {
  _id: Id<"entidades">;
  nomeCompleto: string;
  foto?: string;
  sexo?: "M" | "F";
  dataNascimento?: string;
  status: Doc<"entidades">["status"];
  membroId?: Id<"membros">;
};

type VinculoLite = {
  pessoaA: Id<"entidades">;
  pessoaB: Id<"entidades">;
  tipo: "conjuge" | "pai_filho";
};

export const redeFamiliar = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requireAnyPermission(ctx, ["membros:read", "diretorio:read", "rol:read"]);

    const membro = await ctx.db.get(membroId);
    if (!membro) return null;

    // BFS pela rede: comeca na entidade do membro, segue conjuge (saida/reverso),
    // pais e filhos. `visitados` evita ciclos e limita a MAX_NOS.
    const visitados = new Set<string>();
    const fila: Id<"entidades">[] = [membro.entidadeId];
    // Arestas dedupadas por chave.
    const conjugeArestas = new Map<string, VinculoLite>();
    const filhoArestas = new Map<string, VinculoLite>();
    // membroId por entidade (para o link de perfil).
    const membroPorEnt = new Map<string, Id<"membros">>();

    const parConjuge = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

    while (fila.length > 0 && visitados.size < MAX_NOS) {
      const atual = fila.pop()!;
      if (visitados.has(atual)) continue;
      visitados.add(atual);

      const [membroSaida, membrosReverso, comoCrianca, comoResponsavel] =
        await Promise.all([
          ctx.db
            .query("membros")
            .withIndex("by_entidade", (q) => q.eq("entidadeId", atual))
            .first(),
          ctx.db
            .query("membros")
            .withIndex("by_conjuge", (q) => q.eq("conjugeId", atual))
            .collect(),
          ctx.db
            .query("responsaveis")
            .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", atual))
            .collect(),
          ctx.db
            .query("responsaveis")
            .withIndex("by_responsavel", (q) => q.eq("responsavelEntidadeId", atual))
            .collect(),
        ]);

      if (membroSaida) membroPorEnt.set(atual, membroSaida._id);

      // Conjuge (saida): meu conjugeId.
      if (membroSaida?.conjugeId) {
        const outro = membroSaida.conjugeId;
        conjugeArestas.set(parConjuge(atual, outro), {
          pessoaA: atual,
          pessoaB: outro,
          tipo: "conjuge",
        });
        if (!visitados.has(outro)) fila.push(outro);
      }
      // Conjuge (reverso): quem aponta para mim (vinculo unilateral).
      for (const m of membrosReverso) {
        const outro = m.entidadeId;
        conjugeArestas.set(parConjuge(atual, outro), {
          pessoaA: outro,
          pessoaB: atual,
          tipo: "conjuge",
        });
        membroPorEnt.set(outro, m._id);
        if (!visitados.has(outro)) fila.push(outro);
      }
      // Pais: quem e responsavel por mim (A = pai/mae, B = eu).
      for (const r of comoCrianca) {
        const pai = r.responsavelEntidadeId;
        filhoArestas.set(`${pai}->${atual}`, {
          pessoaA: pai,
          pessoaB: atual,
          tipo: "pai_filho",
        });
        if (!visitados.has(pai)) fila.push(pai);
      }
      // Filhos: por quem eu sou responsavel (A = eu, B = filho).
      for (const r of comoResponsavel) {
        const filho = r.criancaEntidadeId;
        filhoArestas.set(`${atual}->${filho}`, {
          pessoaA: atual,
          pessoaB: filho,
          tipo: "pai_filho",
        });
        if (!visitados.has(filho)) fila.push(filho);
      }
    }

    const entidades = (
      await Promise.all(
        [...visitados].map((id) => ctx.db.get(id as Id<"entidades">)),
      )
    ).filter((e): e is Doc<"entidades"> => e !== null);

    const pessoas: PessoaLite[] = entidades.map((e) => ({
      _id: e._id,
      nomeCompleto: e.nomeCompleto ?? "",
      foto: e.foto,
      sexo: e.sexo,
      dataNascimento: e.dataNascimento,
      status: e.status,
      membroId: membroPorEnt.get(e._id),
    }));

    const vinculos: VinculoLite[] = [
      ...conjugeArestas.values(),
      ...filhoArestas.values(),
    ];

    return { pessoas, vinculos, focoEntidadeId: membro.entidadeId };
  },
});
