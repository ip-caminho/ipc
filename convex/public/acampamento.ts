import { query, mutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { calcularValorInscricao } from "../acampamento/calculoHelpers";

// Resolve a familia do membro logado (ele + conjuge + filhos) a partir da base,
// com o membroId de cada um quando existir registro de `membros` (crianças
// costumam ser so `entidades`, sem membro). Usado tanto no pre-preenchimento
// quanto na validacao anti-forja do vinculo no `responder`.
type FamiliarBase = {
  entidadeId: Id<"entidades">;
  nome: string;
  dataNascimento: string | null;
  membroId: Id<"membros"> | null;
};
async function familiaDoUsuario(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<{ responsavelNome: string; responsavelWhatsapp: string; familiares: FamiliarBase[] } | null> {
  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();
  if (!membro) return null;
  const eu = await ctx.db.get(membro.entidadeId);
  if (!eu) return null;

  async function membroIdDe(entidadeId: Id<"entidades">): Promise<Id<"membros"> | null> {
    const m = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
      .first();
    return m?._id ?? null;
  }

  const familiares: FamiliarBase[] = [
    {
      entidadeId: eu._id,
      nome: eu.nomeCompleto ?? "",
      dataNascimento: eu.dataNascimento ?? null,
      membroId: membro._id,
    },
  ];

  if (membro.conjugeId) {
    const conjuge = await ctx.db.get(membro.conjugeId);
    if (conjuge) {
      familiares.push({
        entidadeId: conjuge._id,
        nome: conjuge.nomeCompleto ?? "",
        dataNascimento: conjuge.dataNascimento ?? null,
        membroId: await membroIdDe(conjuge._id),
      });
    }
  }

  const vinculos = await ctx.db
    .query("responsaveis")
    .withIndex("by_responsavel", (q) => q.eq("responsavelEntidadeId", membro.entidadeId))
    .collect();
  for (const vinc of vinculos) {
    const filho = await ctx.db.get(vinc.criancaEntidadeId);
    if (filho) {
      familiares.push({
        entidadeId: filho._id,
        nome: filho.nomeCompleto ?? "",
        dataNascimento: filho.dataNascimento ?? null,
        membroId: await membroIdDe(filho._id),
      });
    }
  }

  return {
    responsavelNome: eu.nomeCompleto ?? "",
    responsavelWhatsapp: eu.whatsapp ?? "",
    familiares,
  };
}

// Acampamento — endpoints PUBLICOS (sem auth obrigatoria), mesmo padrao das
// inscricoes genericas: `responder` recebe ipHash de um route handler Next.

function inscricoesAbertas(a: Doc<"acampamentos">, agora: number): boolean {
  if (!a.ativa) return false;
  if (a.inscricoesAbrem != null && a.inscricoesAbrem > agora) return false;
  if (a.inscricoesFecham != null && a.inscricoesFecham < agora) return false;
  return true;
}

// Shape publico: sem contadores internos alem da disponibilidade por tipo.
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const a = await ctx.db
      .query("acampamentos")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!a || !a.ativa) return null;
    return {
      _id: a._id,
      slug: a.slug,
      titulo: a.titulo,
      descricao: a.descricao,
      dataInicio: a.dataInicio,
      dataFim: a.dataFim,
      inscricoesAbertas: inscricoesAbertas(a, Date.now()),
      precos: a.precos,
      disponibilidade: {
        duplos: Math.max(0, a.estoqueDuplos - a.duplosReservados),
        triplos: Math.max(0, a.estoqueTriplos - a.triplosReservados),
      },
    };
  },
});

// Pre-preenchimento p/ membro logado: ele + conjuge + filhos, com nascimento
// vindo da base (resolve o problema das datas invalidas do form antigo).
// Retorna null se nao logado — o form segue em branco.
export const minhaFamilia = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const familia = await familiaDoUsuario(ctx, userId);
    if (!familia) return null;
    return {
      responsavel: { nome: familia.responsavelNome, whatsapp: familia.responsavelWhatsapp },
      participantes: familia.familiares
        .filter((f) => f.nome)
        .map((f) => ({
          nome: f.nome,
          dataNascimento: f.dataNascimento,
          // Só vai o membroId de quem tem cadastro de membro — o vínculo é
          // reconfirmado no servidor no envio.
          membroId: f.membroId ?? undefined,
        })),
    };
  },
});

const participanteValidator = v.object({
  nome: v.string(),
  dataNascimento: v.string(),
  participaPalestras: v.boolean(),
  // Hint de vínculo vindo do pré-preenchimento; só é aceito se pertencer à
  // família do usuário logado (validado no servidor).
  membroId: v.optional(v.id("membros")),
});

const hospedagemValidator = v.object({
  quartosDuplos: v.number(),
  quartosTriplos: v.number(),
  camasExtras: v.number(),
  pets: v.number(),
});

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Submissao publica da inscricao de grupo. Calcula o valor com snapshot da
// tabela vigente; estoque esgotado -> LISTA_ESPERA.
export const responder = mutation({
  args: {
    slug: v.string(),
    responsavel: v.object({ nome: v.string(), whatsapp: v.string() }),
    participantes: v.array(participanteValidator),
    hospedagem: hospedagemValidator,
    extras: v.optional(
      v.object({
        colegaDeQuarto: v.optional(v.string()),
        berco: v.optional(v.boolean()),
        necessidadesEspeciais: v.optional(v.string()),
        observacao: v.optional(v.string()),
      }),
    ),
    pagamentoPreferido: v.object({
      forma: v.union(v.literal("A_VISTA"), v.literal("PARCELADO")),
      parcelas: v.optional(v.number()),
      cpfPagante: v.optional(v.string()),
    }),
    lgpdConsentimento: v.boolean(),
    website: v.optional(v.string()), // honeypot
    ipHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Honeypot: bot preencheu campo oculto -> finge sucesso, nao grava.
    if (args.website && args.website.trim() !== "") {
      return { status: "ATIVA" as const };
    }
    if (!args.lgpdConsentimento) throw new Error("Consentimento LGPD obrigatório");

    const acamp = await ctx.db
      .query("acampamentos")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    const agora = Date.now();
    if (!acamp || !inscricoesAbertas(acamp, agora)) {
      throw new Error("Inscrições não encontradas ou encerradas");
    }

    // Validacoes de borda
    if (args.participantes.length === 0) {
      throw new Error("Informe ao menos um participante");
    }
    if (args.participantes.length > 10) {
      throw new Error("Máximo de 10 participantes por inscrição");
    }
    const hojeIso = new Date(agora).toISOString().slice(0, 10);
    for (const p of args.participantes) {
      if (!p.nome.trim()) throw new Error("Participante sem nome");
      if (!DATA_RE.test(p.dataNascimento) || p.dataNascimento >= hojeIso) {
        throw new Error(`Data de nascimento inválida: ${p.nome.trim()}`);
      }
    }
    const h = args.hospedagem;
    if ([h.quartosDuplos, h.quartosTriplos, h.camasExtras, h.pets].some((n) => n < 0 || !Number.isInteger(n))) {
      throw new Error("Quantidades de hospedagem inválidas");
    }
    if (h.quartosDuplos + h.quartosTriplos === 0) {
      throw new Error("Escolha ao menos um quarto");
    }
    // Normaliza o whatsapp para +digitos (chave de dedupe estavel)
    const soDigitos = args.responsavel.whatsapp.replace(/\D/g, "");
    if (soDigitos.length < 10 || soDigitos.length > 15) {
      throw new Error("WhatsApp inválido");
    }
    const whatsapp = `+${soDigitos.startsWith("55") ? soDigitos : `55${soDigitos}`}`;
    if (args.pagamentoPreferido.forma === "PARCELADO") {
      const n = args.pagamentoPreferido.parcelas;
      if (!n || n < 2 || n > 12) throw new Error("Número de parcelas inválido (2 a 12)");
    }

    // Rate limit anti-spam: 5 submissoes/hora por ipHash.
    const umaHoraAtras = agora - 60 * 60 * 1000;
    const recentes = await ctx.db
      .query("inscricoesAcampamento")
      .withIndex("by_ipHash_criadoEm", (q) =>
        q.eq("ipHash", args.ipHash).gte("criadoEm", umaHoraAtras),
      )
      .collect();
    if (recentes.length >= 5) {
      throw new Error("Muitas inscrições recentes. Tente novamente mais tarde.");
    }

    // Dedupe: 1 inscricao nao-cancelada por whatsapp por acampamento.
    const existente = await ctx.db
      .query("inscricoesAcampamento")
      .withIndex("by_acampamento_whatsapp", (q) =>
        q.eq("acampamentoId", acamp._id).eq("responsavel.whatsapp", whatsapp),
      )
      .collect();
    if (existente.some((i) => i.status !== "CANCELADA")) {
      throw new Error(
        "Já existe uma inscrição para este WhatsApp. Fale com a secretaria para alterá-la.",
      );
    }

    // Membro logado? Resolve a família no servidor: membroId do responsável +
    // mapa membroId->nome autorizado p/ auto-vincular os participantes que
    // vieram do pré-preenchimento (anti-forja: só vincula a própria família).
    let membroId: Doc<"membros">["_id"] | undefined = undefined;
    const familiaMap = new Map<string, string>(); // membroId -> nome do membro
    const userId = await getAuthUserId(ctx);
    if (userId) {
      const familia = await familiaDoUsuario(ctx, userId);
      if (familia) {
        membroId = familia.familiares[0]?.membroId ?? undefined;
        for (const f of familia.familiares) {
          if (f.membroId) familiaMap.set(f.membroId, f.nome);
        }
      }
    }

    // Calculo com snapshot da tabela vigente
    const calculo = calcularValorInscricao(
      args.participantes,
      h,
      acamp.precos,
      acamp.dataInicio,
      acamp.dataFim,
    );

    // Estoque: cabe -> ATIVA e reserva; esgotou algum tipo pedido -> LISTA_ESPERA.
    const cabeDuplos = acamp.duplosReservados + h.quartosDuplos <= acamp.estoqueDuplos;
    const cabeTriplos = acamp.triplosReservados + h.quartosTriplos <= acamp.estoqueTriplos;
    const status: "ATIVA" | "LISTA_ESPERA" = cabeDuplos && cabeTriplos ? "ATIVA" : "LISTA_ESPERA";
    if (status === "ATIVA" && h.quartosDuplos + h.quartosTriplos > 0) {
      await ctx.db.patch(acamp._id, {
        duplosReservados: acamp.duplosReservados + h.quartosDuplos,
        triplosReservados: acamp.triplosReservados + h.quartosTriplos,
      });
    }

    await ctx.db.insert("inscricoesAcampamento", {
      acampamentoId: acamp._id,
      responsavel: { nome: args.responsavel.nome.trim(), whatsapp, membroId },
      participantes: args.participantes.map((p) => {
        // Auto-vínculo só se o membroId veio no envio E pertence à família do
        // usuário logado. Caso contrário, entra sem vínculo (Vincular manual).
        const nome = p.nome.trim();
        const vincula = p.membroId && familiaMap.has(p.membroId);
        return {
          nome,
          dataNascimento: p.dataNascimento,
          participaPalestras: p.participaPalestras,
          ...(vincula
            ? { membroId: p.membroId, membroNome: familiaMap.get(p.membroId!) }
            : {}),
        };
      }),
      hospedagem: h,
      extras: args.extras,
      pagamentoPreferido: {
        ...args.pagamentoPreferido,
        cpfPagante: args.pagamentoPreferido.cpfPagante?.replace(/\D/g, "") || undefined,
      },
      valorTabela: calculo.total,
      precosSnapshot: acamp.precos,
      ajustes: [],
      recebimentos: [],
      planoPagamento: [],
      status,
      lgpdConsentimento: true,
      ipHash: args.ipHash,
      criadoEm: agora,
    });

    return { status, valorTabela: calculo.total };
  },
});
