import { query, mutation } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Inscrições de evento — endpoints PÚBLICOS (sem auth obrigatória).
// A mutation `responder` recebe `ipHash` de um route handler Next
// (/api/inscricoes/responder), pois mutations Convex não veem o IP do browser.

type InscricaoDoc = Doc<"inscricoesEvento">;

export type InscricaoEventoPublica = {
  _id: string;
  slug: string;
  titulo: string;
  descricao: string;
  dataLimite?: number;
  vagas?: number;
  vagasOcupadas: number;
  camposSistema: InscricaoDoc["camposSistema"];
  camposCustom: InscricaoDoc["camposCustom"];
};

function publicShape(i: InscricaoDoc): InscricaoEventoPublica {
  return {
    _id: i._id,
    slug: i.slug,
    titulo: i.titulo,
    descricao: i.descricao,
    dataLimite: i.dataLimite,
    vagas: i.vagas,
    vagasOcupadas: i.vagasOcupadas,
    camposSistema: i.camposSistema,
    camposCustom: i.camposCustom,
  };
}

function estaAberta(i: InscricaoDoc, agora: number): boolean {
  if (!i.ativa) return false;
  if (i.dataAbertura != null && i.dataAbertura > agora) return false;
  if (i.dataLimite != null && i.dataLimite < agora) return false;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lista inscrições ativas e dentro da janela. Ordenadas por dataLimite (mais
// próxima primeiro). Usada em /inscricoes e na home.
export const listAtivas = query({
  args: {},
  handler: async (ctx) => {
    const agora = Date.now();
    const docs = await ctx.db
      .query("inscricoesEvento")
      .withIndex("by_ativa_dataAbertura", (q) => q.eq("ativa", true))
      .collect();
    return docs
      .filter((i) => estaAberta(i, agora))
      .sort((a, b) => (a.dataLimite ?? Infinity) - (b.dataLimite ?? Infinity))
      .map(publicShape);
  },
});

// Detalhe de uma inscrição pelo slug (para o formulário público).
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const insc = await ctx.db
      .query("inscricoesEvento")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!insc || !insc.ativa) return null;
    return publicShape(insc);
  },
});

const dadosSistemaValidator = v.object({
  nomeCompleto: v.optional(v.string()),
  whatsapp: v.optional(v.string()),
  email: v.optional(v.string()),
  telefone: v.optional(v.string()),
  dataNascimento: v.optional(v.string()),
  sexo: v.optional(v.string()),
});

// Submissão pública. Validada contra `camposSistema` + `camposCustom`.
export const responder = mutation({
  args: {
    slug: v.string(),
    dadosSistema: v.optional(dadosSistemaValidator),
    dadosCustom: v.any(),
    lgpdConsentimento: v.boolean(),
    website: v.optional(v.string()), // honeypot — deve vir vazio
    ipHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Honeypot: bot preencheu campo oculto → finge sucesso, não grava.
    if (args.website && args.website.trim() !== "") {
      return { status: "CONFIRMADA" as const };
    }
    if (!args.lgpdConsentimento) throw new Error("Consentimento LGPD obrigatório");

    const insc = await ctx.db
      .query("inscricoesEvento")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    const agora = Date.now();
    if (!insc || !estaAberta(insc, agora)) {
      throw new Error("Inscrição não encontrada ou encerrada");
    }

    // Rate limit: 5 submissões/hora por ipHash.
    const umaHoraAtras = agora - 60 * 60 * 1000;
    const recentes = await ctx.db
      .query("respostasInscricaoEvento")
      .withIndex("by_ipHash_criadoEm", (q) =>
        q.eq("ipHash", args.ipHash).gte("criadoEm", umaHoraAtras),
      )
      .collect();
    if (recentes.length >= 5) {
      throw new Error("Muitas inscrições recentes. Tente novamente mais tarde.");
    }

    // Auth opcional: resolve membroId no servidor (não confia em id do client).
    let membroId: InscricaoDoc["criadoPor"] | undefined = undefined;
    let entidade: Record<string, unknown> | null = null;
    const userId = await getAuthUserId(ctx);
    if (userId) {
      const membro = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      if (membro) {
        membroId = membro._id;
        entidade = (await ctx.db.get(membro.entidadeId)) as Record<string, unknown> | null;
      }
    }

    // Monta dadosSistema só com os campos solicitados. Para membro logado, o
    // valor do perfil é autoritativo; se ausente no perfil (campo vazio), aceita
    // o que o inscrito digitou. Anônimo: usa só o que veio do client.
    const entrada = (args.dadosSistema ?? {}) as Record<string, string | undefined>;
    const dadosSistema: Record<string, string> = {};
    for (const campo of insc.camposSistema) {
      const doPerfil = entidade?.[campo];
      const valor =
        typeof doPerfil === "string" && doPerfil.trim() !== ""
          ? doPerfil.trim()
          : (entrada[campo] ?? "").trim();
      if (valor) dadosSistema[campo] = valor;
    }

    // Validação dos campos de sistema solicitados (presença + formato de email).
    for (const campo of insc.camposSistema) {
      const valor = dadosSistema[campo];
      if (!valor) {
        throw new Error(`Campo obrigatório não preenchido: ${campo}`);
      }
      if (campo === "email" && !EMAIL_RE.test(valor)) {
        throw new Error("E-mail inválido");
      }
    }

    // Validação dos campos customizados.
    const dadosCustom = (args.dadosCustom ?? {}) as Record<string, unknown>;
    for (const campo of insc.camposCustom) {
      const valor = dadosCustom[campo.id];
      const vazio =
        valor == null || (typeof valor === "string" && valor.trim() === "") || valor === false;
      if (campo.obrigatorio && vazio) {
        throw new Error(`Campo obrigatório não preenchido: ${campo.label}`);
      }
      if (vazio) continue;
      if (campo.tipo === "email" && typeof valor === "string" && !EMAIL_RE.test(valor)) {
        throw new Error(`E-mail inválido: ${campo.label}`);
      }
      if (campo.tipo === "select" && campo.opcoes && typeof valor === "string") {
        if (!campo.opcoes.includes(valor)) {
          throw new Error(`Opção inválida em: ${campo.label}`);
        }
      }
    }

    // Dedup: por membroId (logado) ou por whatsapp/email (anônimo).
    const jaInscritas = await ctx.db
      .query("respostasInscricaoEvento")
      .withIndex("by_inscricao", (q) => q.eq("inscricaoId", insc._id))
      .collect();
    if (membroId && jaInscritas.some((r) => r.membroId === membroId)) {
      throw new Error("Você já está inscrito.");
    }
    if (!membroId) {
      const contato = dadosSistema.whatsapp ?? dadosSistema.email;
      if (
        contato &&
        jaInscritas.some(
          (r) => r.dadosSistema?.whatsapp === contato || r.dadosSistema?.email === contato,
        )
      ) {
        throw new Error("Já existe uma inscrição com este contato.");
      }
    }

    // Vagas: contador denormalizado (padrão turmas).
    let status: "CONFIRMADA" | "LISTA_ESPERA" = "CONFIRMADA";
    if (insc.vagas != null && insc.vagasOcupadas >= insc.vagas) {
      status = "LISTA_ESPERA";
    } else {
      await ctx.db.patch(insc._id, { vagasOcupadas: insc.vagasOcupadas + 1 });
    }

    await ctx.db.insert("respostasInscricaoEvento", {
      inscricaoId: insc._id,
      membroId,
      dadosSistema,
      dadosCustom,
      status,
      lgpdConsentimento: true,
      ipHash: args.ipHash,
      criadoEm: agora,
    });

    return { status };
  },
});
