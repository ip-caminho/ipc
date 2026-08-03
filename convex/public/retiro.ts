import { query, mutation, internalQuery } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  calcularValorInscricao,
  valorFinal,
  totalRecebido,
  saldoInscricao,
  somaQuartos,
  totalQuartos,
} from "../retiro/calculoHelpers";
import { createFieldAuditLogs } from "../_shared/auditHelpers";
import { parseFileUrl } from "../files/urls";

// So aceita URL de um bucket nosso, na pasta de comprovantes (evita injetar
// URL arbitraria). Vale tanto a canonica do bucket fechado quanto a do CDN
// (comprovantes antigos). files/urls nao importa o SDK do B2, entao pode ser
// usado aqui no runtime V8.
const COMPROVANTE_PASTA = "retiro-comprovantes/";

function comprovanteUrlValida(url: string): boolean {
  const parsed = parseFileUrl(url);
  return !!parsed && parsed.key.startsWith(COMPROVANTE_PASTA);
}

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

// Retiro — endpoints PUBLICOS (sem auth obrigatoria), mesmo padrao das
// inscricoes genericas: `responder` recebe ipHash de um route handler Next.

function inscricoesAbertas(a: Doc<"retiros">, agora: number): boolean {
  if (!a.ativa) return false;
  if (a.inscricoesAbrem != null && a.inscricoesAbrem > agora) return false;
  if (a.inscricoesFecham != null && a.inscricoesFecham < agora) return false;
  return true;
}

// Shape publico: sem contadores internos (estoque/reservados sao so do admin).
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const a = await ctx.db
      .query("retiros")
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
    };
  },
});

export type RetiroPublicoLista = {
  _id: Id<"retiros">;
  slug: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
};

// Retiros com inscrições abertas — alimenta o card no hub /inscricoes.
// `retiros` é tabela de configuração (baixíssima cardinalidade, 1-2 por ano):
// `.collect()` sem índice dedicado é aceitável aqui.
export const listAtivos = query({
  args: {},
  handler: async (ctx) => {
    const agora = Date.now();
    const retiros = await ctx.db.query("retiros").collect();
    return retiros
      .filter((a) => inscricoesAbertas(a, agora))
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
      .map((a) => ({
        _id: a._id,
        slug: a.slug,
        titulo: a.titulo,
        descricao: a.descricao,
        dataInicio: a.dataInicio,
        dataFim: a.dataFim,
      }));
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
  quartos: v.object({
    individual: v.number(),
    duplo: v.number(),
    triplo: v.number(),
    quadruplo: v.number(),
  }),
  camasExtras: v.number(),
  pets: v.number(),
});

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Valida CPF (11 digitos + digitos verificadores). Inline porque o Convex nao
// empacota imports de fora de convex/ (shared/lib/validations/brazilian).
function cpfValido(raw: string): boolean {
  const c = raw.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dig = c.split("").map(Number);
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += dig[i] * (t + 1 - i);
    const d = ((soma * 10) % 11) % 10;
    if (d !== dig[t]) return false;
  }
  return true;
}

// Submissao publica da inscricao de grupo. Calcula o valor com snapshot da
// tabela vigente. Sem limite de vagas por estoque de quartos.
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
    // Token do link de comprovante — gerado no route handler (node crypto)
    comprovanteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Honeypot: bot preencheu campo oculto -> finge sucesso, nao grava.
    if (args.website && args.website.trim() !== "") {
      return { status: "ATIVA" as const, comprovanteToken: undefined };
    }
    if (!args.lgpdConsentimento) throw new Error("Consentimento LGPD obrigatório");

    const acamp = await ctx.db
      .query("retiros")
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
    const qh = h.quartos;
    if (
      [qh.individual, qh.duplo, qh.triplo, qh.quadruplo, h.camasExtras, h.pets].some(
        (n) => n < 0 || !Number.isInteger(n),
      )
    ) {
      throw new Error("Quantidades de hospedagem inválidas");
    }
    if (totalQuartos(qh) === 0) {
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
    // CPF do pagante obrigatório (borda: form já valida, mas o endpoint é público)
    if (!cpfValido(args.pagamentoPreferido.cpfPagante ?? "")) {
      throw new Error("CPF do pagante inválido");
    }

    // Rate limit anti-spam: 5 submissoes/hora por ipHash.
    const umaHoraAtras = agora - 60 * 60 * 1000;
    const recentes = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_ipHash_criadoEm", (q) =>
        q.eq("ipHash", args.ipHash).gte("criadoEm", umaHoraAtras),
      )
      .collect();
    if (recentes.length >= 5) {
      throw new Error("Muitas inscrições recentes. Tente novamente mais tarde.");
    }

    // Dedupe: 1 inscricao nao-cancelada por whatsapp por retiro.
    const existente = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_retiro_whatsapp", (q) =>
        q.eq("retiroId", acamp._id).eq("responsavel.whatsapp", whatsapp),
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
    let familia: Awaited<ReturnType<typeof familiaDoUsuario>> = null;
    const userId = await getAuthUserId(ctx);
    if (userId) {
      familia = await familiaDoUsuario(ctx, userId);
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

    // Sem limite de estoque: toda inscricao entra ATIVA. `reservados` segue
    // somado so para o board de alocacao de quartos (fase 5) — nao bloqueia
    // inscricao nem gera LISTA_ESPERA (esse status so existe hoje via acao
    // manual da secretaria, ver convex/retiro/mutations.ts). totalQuartos(qh)
    // > 0 aqui e garantido pelo throw acima ("Escolha ao menos um quarto").
    await ctx.db.patch(acamp._id, {
      reservados: somaQuartos(acamp.reservados, qh),
    });

    const inscricaoId = await ctx.db.insert("inscricoesRetiro", {
      retiroId: acamp._id,
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
      comprovanteToken: args.comprovanteToken,
      status: "ATIVA",
      lgpdConsentimento: true,
      ipHash: args.ipHash,
      criadoEm: agora,
    });

    // Write-back de cadastro: só para membro logado e entidades da própria
    // família (vínculo já reconfirmado acima). Campo vazio no cadastro ->
    // preenche automaticamente + audita. Campo preenchido e divergente -> não
    // sobrescreve; registra divergência p/ a secretaria revisar na inscrição.
    if (familia) {
      const norm = (s?: string | null) => (s ?? "").replace(/\D/g, "");
      const divergencias: Array<{
        entidadeId: Id<"entidades">;
        membroNome: string;
        campo: "whatsapp" | "dataNascimento";
        valorCadastro: string;
        valorInformado: string;
      }> = [];

      // Responsável -> WhatsApp da própria entidade (familiares[0] = o "eu").
      const eu = familia.familiares[0];
      if (eu?.entidadeId) {
        const ent = await ctx.db.get(eu.entidadeId);
        if (ent) {
          if (!ent.whatsapp) {
            await ctx.db.patch(ent._id, { whatsapp });
            await createFieldAuditLogs(
              ctx,
              { whatsapp: ent.whatsapp },
              { whatsapp },
              "entidades",
              ent._id,
            );
          } else if (norm(ent.whatsapp) !== norm(whatsapp)) {
            divergencias.push({
              entidadeId: ent._id,
              membroNome: eu.nome,
              campo: "whatsapp",
              valorCadastro: ent.whatsapp,
              valorInformado: whatsapp,
            });
          }
        }
      }

      // Participantes vinculados -> data de nascimento da entidade.
      const entPorMembro = new Map<string, Id<"entidades">>();
      for (const f of familia.familiares) {
        if (f.membroId) entPorMembro.set(f.membroId, f.entidadeId);
      }
      for (const p of args.participantes) {
        if (!p.membroId || !familiaMap.has(p.membroId)) continue;
        const entId = entPorMembro.get(p.membroId);
        if (!entId) continue;
        const ent = await ctx.db.get(entId);
        if (!ent) continue;
        if (!ent.dataNascimento) {
          await ctx.db.patch(ent._id, { dataNascimento: p.dataNascimento });
          await createFieldAuditLogs(
            ctx,
            { dataNascimento: ent.dataNascimento },
            { dataNascimento: p.dataNascimento },
            "entidades",
            ent._id,
          );
        } else if (ent.dataNascimento !== p.dataNascimento) {
          divergencias.push({
            entidadeId: ent._id,
            membroNome: familiaMap.get(p.membroId) ?? p.nome.trim(),
            campo: "dataNascimento",
            valorCadastro: ent.dataNascimento,
            valorInformado: p.dataNascimento,
          });
        }
      }

      if (divergencias.length > 0) {
        await ctx.db.patch(inscricaoId, { divergenciasCadastro: divergencias });
      }
    }

    return { status: "ATIVA" as const, valorTabela: calculo.total, comprovanteToken: args.comprovanteToken };
  },
});

// Inscricoes do membro logado (area "Minhas inscricoes") — ele envia o
// comprovante direto pelo app, sem lidar com URL/codigo (usa o proprio token
// por baixo). Retorna [] se nao logado ou sem membro.
export const minhasInscricoes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];
    const docs = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_responsavel_membro", (q) => q.eq("responsavel.membroId", membro._id))
      .collect();
    const out = [];
    for (const i of docs) {
      if (i.status === "CANCELADA") continue; // canceladas nao aparecem p/ o membro
      const acamp = await ctx.db.get(i.retiroId);
      out.push({
        _id: i._id,
        retiroTitulo: acamp?.titulo ?? "Retiro",
        dataInicio: acamp?.dataInicio ?? "",
        dataFim: acamp?.dataFim ?? "",
        status: i.status,
        valorFinal: valorFinal(i.valorTabela, i.ajustes),
        recebido: totalRecebido(i.recebimentos),
        saldo: saldoInscricao(i.valorTabela, i.ajustes, i.recebimentos),
        // Proprio dono — pode receber o token p/ enviar o comprovante pelo app
        comprovanteToken: i.comprovanteToken,
        comprovantesEnviados: i.comprovantesPendentes?.length ?? 0,
      });
    }
    return out.sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1));
  },
});

// ===== Comprovante de pagamento — link publico tokenizado (membro/visitante) =====

// Resumo minimo p/ a pagina de comprovante (sem PII alem do nome). Retorna null
// se o token nao existe ou a inscricao foi cancelada.
export const getComprovanteInfo = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const insc = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_comprovanteToken", (q) => q.eq("comprovanteToken", token))
      .first();
    if (!insc || insc.status === "CANCELADA") return null;
    const acamp = await ctx.db.get(insc.retiroId);
    const final = valorFinal(insc.valorTabela, insc.ajustes);
    const recebido = totalRecebido(insc.recebimentos);
    return {
      responsavelNome: insc.responsavel.nome,
      retiroTitulo: acamp?.titulo ?? "Retiro",
      valorFinal: final,
      recebido,
      saldo: saldoInscricao(insc.valorTabela, insc.ajustes, insc.recebimentos),
      enviados: insc.comprovantesPendentes?.length ?? 0,
    };
  },
});

// Envio do comprovante pelo pagante — apenas ANEXA (a secretaria confere o valor
// e registra o recebimento). Suporta parcelado: acumula varios comprovantes.
export const enviarComprovante = mutation({
  args: {
    token: v.string(),
    comprovanteUrl: v.string(),
    valorInformado: v.optional(v.number()), // centavos
    obs: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const insc = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_comprovanteToken", (q) => q.eq("comprovanteToken", args.token))
      .first();
    if (!insc || insc.status === "CANCELADA") {
      throw new Error("Link inválido ou inscrição cancelada");
    }
    if (!comprovanteUrlValida(args.comprovanteUrl)) {
      throw new Error("Arquivo inválido");
    }
    const atuais = insc.comprovantesPendentes ?? [];
    if (atuais.length >= 50) {
      throw new Error("Muitos comprovantes enviados. Fale com a secretaria.");
    }
    await ctx.db.patch(insc._id, {
      comprovantesPendentes: [
        ...atuais,
        {
          comprovanteUrl: args.comprovanteUrl,
          valorInformado: args.valorInformado,
          obs: args.obs?.trim() || undefined,
          enviadoEm: Date.now(),
        },
      ],
      atualizadoEm: Date.now(),
    });
    return { ok: true };
  },
});

// Valida o token do comprovante e devolve o id — usado pelo action de presigned
// (actions nao tem ctx.db). Espelha files/authz.checkUploadAccess.
export const validarComprovanteToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<Id<"inscricoesRetiro"> | null> => {
    if (!token) return null;
    const insc = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_comprovanteToken", (q) => q.eq("comprovanteToken", token))
      .first();
    if (!insc || insc.status === "CANCELADA") return null;
    return insc._id;
  },
});
