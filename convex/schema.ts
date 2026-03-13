import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  entidades: defineTable({
    tipoEntidade: v.union(v.literal("PF"), v.literal("PJ")),
    papeis: v.array(v.union(
      v.literal("MEMBRO"),
      v.literal("VISITANTE"),
      v.literal("CONTATO"),
      v.literal("FORNECEDOR"),
      v.literal("IGREJA_PARCEIRA")
    )),
    status: v.union(
      v.literal("ATIVO"),
      v.literal("INATIVO"),
      v.literal("TRANSFERIDO"),
      v.literal("FALECIDO"),
      v.literal("DESLIGADO")
    ),

    // PF fields
    nomeCompleto: v.optional(v.string()),
    cpf: v.optional(v.string()),
    rg: v.optional(v.string()),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
    estadoCivil: v.optional(v.union(
      v.literal("SOLTEIRO"),
      v.literal("CASADO"),
      v.literal("DIVORCIADO"),
      v.literal("VIUVO"),
      v.literal("UNIAO_ESTAVEL")
    )),
    nacionalidade: v.optional(v.string()),
    naturalidade: v.optional(v.object({
      cidade: v.string(),
      estado: v.string(),
      pais: v.string(),
    })),
    pai: v.optional(v.string()),
    mae: v.optional(v.string()),
    profissao: v.optional(v.string()),
    formacao: v.optional(v.union(
      v.literal("FUNDAMENTAL"),
      v.literal("MEDIO"),
      v.literal("SUPERIOR"),
      v.literal("POS_GRADUACAO"),
      v.literal("MESTRADO"),
      v.literal("DOUTORADO")
    )),
    foto: v.optional(v.string()),

    // PJ fields
    nomeRazaoSocial: v.optional(v.string()),
    nomeFantasia: v.optional(v.string()),
    cnpj: v.optional(v.string()),
    inscricaoEstadual: v.optional(v.string()),
    responsavelNome: v.optional(v.string()),

    // Shared fields
    whatsapp: v.optional(v.string()),
    telefone: v.optional(v.string()),
    email: v.optional(v.string()),
    endereco: v.optional(v.object({
      logradouro: v.string(),
      numero: v.string(),
      complemento: v.optional(v.string()),
      bairro: v.string(),
      cidade: v.string(),
      estado: v.string(),
      cep: v.string(),
    })),
  })
    .index("by_tipo", ["tipoEntidade"])
    .index("by_status", ["status"])
    .index("by_whatsapp", ["whatsapp"])
    .index("by_cpf", ["cpf"])
    .index("by_cnpj", ["cnpj"]),

  membros: defineTable({
    entidadeId: v.id("entidades"),
    userId: v.optional(v.id("users")),
    role: v.string(),
    permissions: v.optional(v.array(v.string())),

    // Church-specific fields
    rol: v.optional(v.string()),
    dataMembresia: v.optional(v.string()),
    formaAdmissao: v.optional(v.union(
      v.literal("BATISMO"),
      v.literal("PROFISSAO_FE"),
      v.literal("TRANSFERENCIA"),
      v.literal("JURISDICAO")
    )),
    cargoEclesiastico: v.optional(v.union(
      v.literal("MEMBRO_COMUNGANTE"),
      v.literal("MEMBRO_NAO_COMUNGANTE"),
      v.literal("DIACONO"),
      v.literal("PRESBITERO"),
      v.literal("PASTOR")
    )),
    dataConversao: v.optional(v.string()),
    dataBatismo: v.optional(v.string()),
    igrejaProcedencia: v.optional(v.string()),

    // Family relations
    conjugeId: v.optional(v.id("entidades")),
    filhos: v.optional(v.array(v.object({
      nome: v.string(),
      dataNascimento: v.optional(v.string()),
    }))),
  })
    .index("by_entidade", ["entidadeId"])
    .index("by_user_id", ["userId"])
    .index("by_role", ["role"]),

  serieGravacoes: defineTable({
    nome: v.string(),
    descricao: v.optional(v.string()),
  }),

  gravacoes: defineTable({
    titulo: v.string(),
    tipo: v.union(
      v.literal("SERMAO"),
      v.literal("ESTUDO_BIBLICO"),
      v.literal("PALESTRA"),
      v.literal("TESTEMUNHO")
    ),
    serieId: v.optional(v.id("serieGravacoes")),
    pregadorId: v.optional(v.id("membros")),
    pregadorNome: v.optional(v.string()),
    data: v.string(),
    descricao: v.optional(v.string()),
    resumo: v.optional(v.string()),
    textoBase: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    materiaisComplementares: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    status: v.union(v.literal("RASCUNHO"), v.literal("PUBLICADO")),
    // IA Processing fields
    iaStatus: v.optional(v.union(
      v.literal("PENDENTE"),
      v.literal("BAIXANDO"),
      v.literal("TRANSCREVENDO"),
      v.literal("ANALISANDO"),
      v.literal("CONCLUIDO"),
      v.literal("ERRO")
    )),
    iaErro: v.optional(v.string()),
    iaTranscricao: v.optional(v.string()),
    iaResultado: v.optional(v.any()),
    iaProcessadoEm: v.optional(v.number()),
    iaProcessadoPor: v.optional(v.id("membros")),
    // Sermon boundaries (seconds) — detected by IA
    inicioSermao: v.optional(v.number()),
    fimSermao: v.optional(v.number()),
    // Announcements boundaries (seconds) — detected by IA
    inicioAvisos: v.optional(v.number()),
    fimAvisos: v.optional(v.number()),
    iaAvisos: v.optional(v.array(v.object({
      titulo: v.string(),
      descricao: v.string(),
    }))),
  })
    .index("by_tipo", ["tipo"])
    .index("by_status", ["status"])
    .index("by_data", ["data"])
    .index("by_pregador", ["pregadorId"])
    .index("by_serie", ["serieId"]),

  comentariosGravacao: defineTable({
    gravacaoId: v.id("gravacoes"),
    membroId: v.id("membros"),
    texto: v.string(),
    parentId: v.optional(v.id("comentariosGravacao")),
    createdAt: v.number(),
  })
    .index("by_gravacao", ["gravacaoId", "createdAt"])
    .index("by_parent", ["parentId"]),

  reacoesGravacao: defineTable({
    gravacaoId: v.id("gravacoes"),
    membroId: v.id("membros"),
    tipo: v.string(), // "❤️" | "🙏" | "🔥" | "👏" | "💡"
    createdAt: v.number(),
  })
    .index("by_gravacao", ["gravacaoId"])
    .index("by_gravacao_membro", ["gravacaoId", "membroId"]),

  escutasGravacao: defineTable({
    gravacaoId: v.id("gravacoes"),
    membroId: v.id("membros"),
    ultimoSegundo: v.number(),
    duracaoTotal: v.number(),
    progresso: v.number(), // 0-100
    completou: v.boolean(),
    iniciadoEm: v.number(),
    atualizadoEm: v.number(),
  })
    .index("by_gravacao", ["gravacaoId"])
    .index("by_membro", ["membroId"])
    .index("by_gravacao_membro", ["gravacaoId", "membroId"]),

  membroConvites: defineTable({
    token: v.string(),
    status: v.union(
      v.literal("PENDENTE"),
      v.literal("ACEITO"),
      v.literal("EXPIRADO")
    ),
    dadosPreenchidos: v.optional(v.any()),
    criadoPor: v.optional(v.id("membros")),
    expiraEm: v.number(),
    role: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_status", ["status"]),

  auditLogs: defineTable({
    action: v.string(),
    referenciaTabela: v.string(),
    referenciaId: v.string(),
    userId: v.optional(v.id("users")),
    membroId: v.optional(v.id("membros")),
    field: v.optional(v.string()),
    from: v.optional(v.any()),
    to: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_referencia", ["referenciaTabela", "referenciaId"])
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),

  rolePermissions: defineTable({
    role: v.string(),
    permissions: v.array(v.string()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_role", ["role"]),

  preferencias: defineTable({
    chave: v.string(),
    valor: v.any(),
    atualizadoPor: v.optional(v.id("membros")),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_chave", ["chave"]),

  sysNotifications: defineTable({
    titulo: v.string(),
    mensagem: v.string(),
    tipo: v.union(
      v.literal("INFO"),
      v.literal("ALERTA"),
      v.literal("ERRO"),
      v.literal("SUCESSO")
    ),
    destinatarioId: v.optional(v.id("membros")),
    global: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_destinatario", ["destinatarioId"])
    .index("by_created_at", ["createdAt"]),

  sysNotificationReads: defineTable({
    notificationId: v.id("sysNotifications"),
    membroId: v.id("membros"),
    readAt: v.number(),
  })
    .index("by_membro", ["membroId"])
    .index("by_notification", ["notificationId"]),
});
