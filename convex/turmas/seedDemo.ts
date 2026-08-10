import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { PASTOR_TITULAR } from "./lib/constants";
import { getSaoPauloDateString } from "../_shared/datetime";
import { v } from "convex/values";

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
// Instrutor real, para o certificado sair com a assinatura de quem assina.
const INSTRUTOR_NOME = "Leandro Luiz Novaes";
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

    // Instrutor: busca pelo nome na lista de membros. Se nao achar, a turma
    // fica sem instrutor e a linha do professor sai em branco no impresso.
    const entidadeInstrutor = (await ctx.db.query("entidades").collect()).find(
      (e) => e.nomeCompleto === INSTRUTOR_NOME
    );
    const membroInstrutor = entidadeInstrutor
      ? await ctx.db
          .query("membros")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeInstrutor._id))
          .first()
      : null;

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
      instrutorId: membroInstrutor?._id,
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
          instrutorNome: membroInstrutor ? INSTRUTOR_NOME : undefined,
          pastorNome: PASTOR_TITULAR,
          codigo: Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase(),
          emitidoPor: admin._id,
          emitidoEm: agora,
        });
        emitidos++;
      }
    }

    return `Turma de teste criada: ${ALUNOS.length} alunos, ${emitidos} certificados emitidos, instrutor ${membroInstrutor ? INSTRUTOR_NOME : "NAO ENCONTRADO"}. Turma ${turmaId}`;
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

// ===== Chamada: turma temporaria para ver o widget do dashboard =====
//
// O widget "Chamadas pendentes" so aparece para quem e INSTRUTOR de uma turma
// com aula dentro da janela de 7 dias e sem presenca registrada. Este seed cria
// exatamente esse cenario para um membro (achado pelo email), para conferir a
// tela do professor com dados na mao. Remover depois com limparChamadaDemo.

const TURMA_CHAMADA = `${PREFIXO} Chamada (temporaria)`;

const ALUNOS_CHAMADA = [
  "Ana Beatriz Ferreira",
  "Carlos Eduardo Lima",
  "Joana Ribeiro dos Santos",
  "Marcos Vinicius Alves",
  "Patricia Nogueira",
];

export const seedChamadaDemo = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const entidade = (await ctx.db.query("entidades").collect()).find(
      (e) => e.email?.toLowerCase() === email.toLowerCase()
    );
    if (!entidade) return `Nenhuma entidade com o email ${email}.`;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
      .first();
    if (!membro) return `A entidade ${entidade.nomeCompleto} nao e membro.`;

    const jaExiste = (await ctx.db.query("turmas").collect()).find(
      (t) => t.nome === TURMA_CHAMADA
    );
    if (jaExiste) return "Turma de chamada ja existe. Rode limparChamadaDemo antes.";

    const agora = Date.now();
    const ontem = getSaoPauloDateString(new Date(agora - 24 * 60 * 60 * 1000));

    const turmaId = await ctx.db.insert("turmas", {
      nome: TURMA_CHAMADA,
      // Sem diaSemana de proposito: evita o caso "aula de hoje", que criaria um
      // encontro ao abrir. O cenario aqui e a aula de ontem ainda pendente.
      dataInicio: ontem,
      horario: "19:30",
      local: "Sala 1",
      instrutorId: membro._id,
      vagasOcupadas: ALUNOS_CHAMADA.length,
      status: "EM_ANDAMENTO",
      camposSistema: ["nomeCompleto"],
      criadoEm: agora,
    });

    // Aula de ontem, criada dentro da janela e SEM presencaRegistradaEm.
    await ctx.db.insert("turmaEncontros", {
      turmaId,
      data: ontem,
      titulo: "Aula 3",
      criadoEm: agora - 24 * 60 * 60 * 1000,
    });

    for (const nome of ALUNOS_CHAMADA) {
      await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: { nomeCompleto: nome },
        status: "CONFIRMADA",
        lgpdConsentimento: true,
        criadoEm: agora - 30 * 24 * 60 * 60 * 1000,
      });
    }

    return `Turma criada para ${entidade.nomeCompleto}: ${ALUNOS_CHAMADA.length} alunos, aula de ${ontem} pendente. O card aparece no dashboard dele.`;
  },
});

export const limparChamadaDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const turmas = (await ctx.db.query("turmas").collect()).filter(
      (t) => t.nome === TURMA_CHAMADA
    );
    let removidos = 0;

    for (const turma of turmas) {
      const aulas = await ctx.db
        .query("turmaEncontros")
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
      const inscricoes = await ctx.db
        .query("inscricoes")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect();
      for (const i of inscricoes) {
        await ctx.db.delete(i._id);
        removidos++;
      }
      await ctx.db.delete(turma._id);
      removidos++;
    }

    return `Documentos removidos: ${removidos}`;
  },
});

/**
 * Nova aula pendente na turma de demo, para rever o card de chamada depois de
 * ter salvado a anterior (chamada feita sai do widget de proposito).
 */
export const novaAulaPendenteDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const turma = (await ctx.db.query("turmas").collect()).find(
      (t) => t.nome === TURMA_CHAMADA
    );
    if (!turma) return "Turma de chamada nao existe. Rode seedChamadaDemo primeiro.";

    const agora = Date.now();
    const anteontem = getSaoPauloDateString(new Date(agora - 2 * 24 * 60 * 60 * 1000));

    const jaTem = (
      await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect()
    ).find((e) => e.data === anteontem && !e.presencaRegistradaEm);
    if (jaTem) return `Ja existe aula pendente em ${anteontem}.`;

    await ctx.db.insert("turmaEncontros", {
      turmaId: turma._id,
      data: anteontem,
      titulo: "Aula 4",
      criadoEm: agora - 2 * 24 * 60 * 60 * 1000,
    });
    return `Aula pendente de ${anteontem} criada. O card volta a aparecer no dashboard.`;
  },
});

/**
 * Abre a turma de demo para inscricao publica e devolve o link. A janela vai de
 * hoje ate 30 dias, para exercitar o formulario e o prazo.
 */
export const abrirInscricoesDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const turma = (await ctx.db.query("turmas").collect()).find(
      (t) => t.nome === TURMA_CHAMADA
    );
    if (!turma) return "Turma de chamada nao existe. Rode seedChamadaDemo primeiro.";

    const agora = Date.now();
    const hoje = getSaoPauloDateString(new Date(agora));
    const em30 = getSaoPauloDateString(new Date(agora + 30 * 24 * 60 * 60 * 1000));

    const token =
      turma.token ??
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");

    await ctx.db.patch(turma._id, {
      status: "ABERTA",
      inscricoesDe: hoje,
      inscricoesAte: em30,
      vagas: 10,
      token,
    });

    return `/inscricao/${token} — aberta de ${hoje} a ${em30}, 10 vagas (${turma.vagasOcupadas} ocupadas).`;
  },
});

/**
 * DEV: turma com instrutor, formulario de Catecumenos e inscritos que ja
 * responderam — para conferir a tela de consulta do instrutor com dados.
 */
export const seedConsultaInstrutorDemo = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const entidade = (await ctx.db.query("entidades").collect()).find(
      (e) => e.email?.toLowerCase() === email.toLowerCase()
    );
    if (!entidade) return `Nenhuma entidade com o email ${email}.`;
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
      .first();
    if (!membro) return "Entidade nao e membro.";

    const NOME = `${PREFIXO} Consulta instrutor`;
    if ((await ctx.db.query("turmas").collect()).some((t) => t.nome === NOME)) {
      return "Ja existe.";
    }

    const agora = Date.now();
    const perguntas = [
      {
        id: "tempo_igreja",
        label: "Ha quanto tempo voce frequenta a Igreja Presbiteriana do Caminho?",
        obrigatorio: true,
        tipo: "ESCOLHA_UNICA" as const,
        opcoes: ["Menos de 3 meses", "Entre 3 meses e 1 ano", "Mais de 1 ano"],
      },
      {
        id: "motivacao",
        label: "O que motivou voce a se inscrever neste estudo?",
        obrigatorio: true,
        tipo: "ESCOLHA_MULTIPLA" as const,
        opcoes: [
          "Quero conhecer mais sobre a fe crista",
          "Desejo professar publicamente minha fe em Cristo",
          "Quero ser batizado(a)",
        ],
      },
      {
        id: "expectativa",
        label: "O que voce espera aprender com este estudo?",
        obrigatorio: false,
        tipo: "TEXTO_LONGO" as const,
      },
    ];

    const turmaId = await ctx.db.insert("turmas", {
      nome: NOME,
      instrutorId: membro._id,
      frequenciaMinima: 75,
      dataInicio: "2026-08-16",
      diaSemana: "DOMINGO",
      horario: "08:30",
      local: "Na Igreja, 1o andar",
      vagasOcupadas: 4,
      status: "EM_ANDAMENTO",
      camposSistema: ["nomeCompleto", "whatsapp", "email", "dataNascimento"],
      perguntasExtras: perguntas,
      criadoEm: agora,
    });

    for (const [i, data] of ["2026-08-16", "2026-08-23", "2026-08-30"].entries()) {
      await ctx.db.insert("turmaEncontros", {
        turmaId,
        data,
        titulo: `Aula ${i + 1}`,
        presencaRegistradaEm: i === 0 ? agora : undefined,
        criadoEm: agora,
      });
    }

    const pessoas: Array<{ nome: string; tempo: string; motivos: string[]; texto: string }> = [
      {
        nome: "Ana Beatriz Ferreira",
        tempo: "Mais de 1 ano",
        motivos: ["Desejo professar publicamente minha fe em Cristo", "Quero ser batizado(a)"],
        texto: "Quero entender melhor a doutrina antes de professar minha fe.",
      },
      {
        nome: "Carlos Eduardo Lima",
        tempo: "Menos de 3 meses",
        motivos: ["Quero conhecer mais sobre a fe crista"],
        texto: "Comecei a frequentar agora e quero conhecer o basico.",
      },
      {
        nome: "Joana Ribeiro dos Santos",
        tempo: "Entre 3 meses e 1 ano",
        motivos: ["Quero conhecer mais sobre a fe crista", "Quero ser batizado(a)"],
        texto: "",
      },
      {
        nome: "Marcos Vinicius Alves",
        tempo: "Mais de 1 ano",
        motivos: ["Quero ser batizado(a)"],
        texto: "Fui criado na igreja mas nunca fui batizado.",
      },
    ];

    for (const [i, p] of pessoas.entries()) {
      await ctx.db.insert("inscricoes", {
        turmaId,
        dadosSistema: {
          nomeCompleto: p.nome,
          whatsapp: `+551199999000${i}`,
          email: `${p.nome.split(" ")[0].toLowerCase()}@exemplo.com`,
          dataNascimento: "1990-05-1" + i,
        },
        status: i === 3 ? "LISTA_ESPERA" : "CONFIRMADA",
        lgpdConsentimento: true,
        respostasExtras: [
          { perguntaId: "tempo_igreja", valor: p.tempo },
          { perguntaId: "motivacao", valor: p.motivos.join("; "), valores: p.motivos },
          ...(p.texto ? [{ perguntaId: "expectativa", valor: p.texto }] : []),
        ],
        criadoEm: agora - i * 86400000,
      });
    }

    return `Turma "${NOME}" criada com 4 inscritos respondidos. /minhas-turmas/${turmaId}`;
  },
});
