import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Dados de teste para validar a IMPRESSAO dos certificados em papel.
 *
 * internalMutation (padrao dos seeds do projeto): roda por
 * `npx convex run turmas/seedDemo:seedCertificadosDemo`, nunca do cliente.
 *
 * Tudo recebe o prefixo [TESTE] no nome para ser reconhecivel e removivel com
 * `npx convex run turmas/seedDemo:limparCertificadosDemo`. Nomes ficticios.
 */

const PREFIXO = "[TESTE]";
const CURSO_NOME = `${PREFIXO} Curso de Novos Membros`;
const TURMA_NOME = `${PREFIXO} Novos Membros 2/2026`;

// 4 aulas, minimo de 75%. Casos escolhidos para exercitar a impressao:
const ALUNOS: Array<{ nome: string; presencas: boolean[] }> = [
  // Nome comprido, para ver se estoura a linha do certificado
  { nome: "Maria Aparecida de Souza Albuquerque Nascimento", presencas: [true, true, true, true] },
  // Nome minusculo e com espaco duplo: caso de corrigir na emissao
  { nome: "joão  pereira", presencas: [true, true, true, false] },
  // 50%: abaixo do minimo, aparece como "Abaixo de 75%"
  { nome: "Carlos Eduardo Lima", presencas: [true, false, true, false] },
  // Nome curto
  { nome: "Ana Rocha", presencas: [true, true, true, true] },
  // Acentos e cedilha, para conferir no papel
  { nome: "Conceição Gonçalves Assunção", presencas: [true, true, false, true] },
];

export const seedCertificadosDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jaExiste = await ctx.db
      .query("turmas")
      .withIndex("by_status", (q) => q.eq("status", "ENCERRADA"))
      .collect();
    if (jaExiste.some((t) => t.nome === TURMA_NOME)) {
      return "Turma de teste ja existe. Rode limparCertificadosDemo antes de recriar.";
    }

    // emitidoPor precisa de um membro real: usa o primeiro admin.
    const admin = await ctx.db
      .query("membros")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    if (!admin) return "Nenhum membro admin encontrado — nao consigo assinar a emissao.";

    const agora = Date.now();

    const cursoId = await ctx.db.insert("cursos", {
      nome: CURSO_NOME,
      descricao: "Curso de teste para validar a impressao dos certificados.",
      cargaHoraria: 12,
      totalAulas: 4,
      frequenciaMinima: 75,
      status: "ATIVO",
      criadoEm: agora,
    });

    const turmaId = await ctx.db.insert("turmas", {
      nome: TURMA_NOME,
      cursoId,
      frequenciaMinima: 75,
      dataInicio: "2026-08-03",
      diaSemana: "SEGUNDA",
      horario: "19:30",
      local: "Sala 1",
      vagasOcupadas: ALUNOS.length,
      // ENCERRADA: turma de teste nao deve aceitar inscricao de ninguem
      status: "ENCERRADA",
      camposSistema: ["nomeCompleto"],
      criadoEm: agora,
    });

    // 4 aulas, todas com chamada feita
    const aulas: Id<"turmaEncontros">[] = [];
    for (const [i, data] of ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"].entries()) {
      aulas.push(
        await ctx.db.insert("turmaEncontros", {
          turmaId,
          data,
          titulo: `Aula ${i + 1}`,
          presencaRegistradaEm: agora,
          criadoEm: agora,
        })
      );
    }

    let emitidos = 0;
    for (const aluno of ALUNOS) {
      const inscricaoId = await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: aluno.nome },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: new Date("2026-08-01T12:00:00Z").getTime(),
      });

      for (const [i, presente] of aluno.presencas.entries()) {
        await ctx.db.insert("turmaPresencas", {
          encontroId: aulas[i],
          inscricaoId,
          presente,
          registradoPor: admin._id,
        });
      }

      const aulasPresentes = aluno.presencas.filter(Boolean).length;
      const percentual = Math.round((aulasPresentes / aluno.presencas.length) * 100);

      // Emite so para os aptos — os demais ficam para testar a emissao manual
      // pela tela (inclusive a edicao do nome).
      if (percentual >= 75) {
        const bytes = new Uint8Array(6);
        crypto.getRandomValues(bytes);
        await ctx.db.insert("certificados", {
          turmaId,
          inscricaoId,
          nomeImpresso: aluno.nome.replace(/\s+/g, " ").trim(),
          percentualFrequencia: percentual,
          aulasPresentes,
          aulasConsideradas: aluno.presencas.length,
          cursoNome: CURSO_NOME,
          turmaNome: TURMA_NOME,
          cargaHoraria: 12,
          codigo: Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase(),
          emitidoPor: admin._id,
          emitidoEm: agora,
        });
        emitidos++;
      }
    }

    return `Turma de teste criada: ${ALUNOS.length} alunos, ${emitidos} certificados emitidos. Turma ${turmaId}`;
  },
});

export const limparCertificadosDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const turmas = (await ctx.db.query("turmas").collect()).filter(
      (t) => t.nome === TURMA_NOME
    );
    let removidos = 0;

    for (const turma of turmas) {
      const inscricoes = await ctx.db
        .query("inscricoes")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect();
      const aulas = await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect();
      const certificados = await ctx.db
        .query("certificados")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect();

      for (const aula of aulas) {
        const presencas = await ctx.db
          .query("turmaPresencas")
          .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", aula._id))
          .collect();
        for (const p of presencas) {
          await ctx.db.delete(p._id);
          removidos++;
        }
        await ctx.db.delete(aula._id);
        removidos++;
      }
      for (const c of certificados) {
        await ctx.db.delete(c._id);
        removidos++;
      }
      for (const i of inscricoes) {
        await ctx.db.delete(i._id);
        removidos++;
      }
      await ctx.db.delete(turma._id);
      removidos++;
    }

    const cursos = (await ctx.db.query("cursos").collect()).filter(
      (c) => c.nome === CURSO_NOME
    );
    for (const c of cursos) {
      await ctx.db.delete(c._id);
      removidos++;
    }

    return `Documentos removidos: ${removidos}`;
  },
});
