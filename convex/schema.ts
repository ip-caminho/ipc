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
      v.literal("IGREJA_PARCEIRA"),
      v.literal("DEPENDENTE")
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
    tipoDocumento: v.optional(v.union(v.literal("RG"), v.literal("RNE"), v.literal("RNM"))),
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
    apelido: v.optional(v.string()),

    // PJ fields
    nomeRazaoSocial: v.optional(v.string()),
    nomeFantasia: v.optional(v.string()),
    cnpj: v.optional(v.string()),
    inscricaoEstadual: v.optional(v.string()),
    responsavelNome: v.optional(v.string()),

    // Compliance (CBCM)
    cbcm: v.optional(v.union(
      v.literal("NAO_INICIADO"),
      v.literal("CURSANDO"),
      v.literal("CONCLUIDO")
    )),
    atestadoAntecedentes: v.optional(v.string()),

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
    onboardingCompleto: v.optional(v.boolean()),

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
      v.literal("OUTRO")
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
      dataEvento: v.optional(v.union(v.string(), v.null())),
      quando: v.optional(v.union(v.string(), v.null())),
      onde: v.optional(v.union(v.string(), v.null())),
      contatoNome: v.optional(v.union(v.string(), v.null())),
      contatoWhatsapp: v.optional(v.union(v.string(), v.null())),
    }))),
  })
    .index("by_tipo", ["tipo"])
    .index("by_status", ["status"])
    .index("by_data", ["data"])
    .index("by_pregador", ["pregadorId"])
    .index("by_serie", ["serieId"]),

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

  // ===== Escalas / Liturgia =====
  cultos: defineTable({
    data: v.string(), // YYYY-MM-DD
    tipo: v.union(
      v.literal("DOMINICAL"),
      v.literal("ESPECIAL")
    ),
    titulo: v.optional(v.string()),
    horario: v.optional(v.string()), // "09:00"
    observacoes: v.optional(v.string()),
    louvores: v.optional(v.array(v.string())), // Liturgia: titulos das musicas em ordem
    temCeia: v.optional(v.boolean()),         // Se tem ceia neste culto (default: true)
    status: v.union(v.literal("RASCUNHO"), v.literal("PUBLICADO")),
  })
    .index("by_data", ["data"])
    .index("by_status_data", ["status", "data"]),

  cultoLouvores: defineTable({
    cultoId: v.id("cultos"),
    louvorId: v.optional(v.id("louvores")),
    tituloLegado: v.optional(v.string()),
    ordem: v.number(),
    tom: v.optional(v.string()),
    secao: v.optional(v.string()),
  })
    .index("by_culto", ["cultoId"])
    .index("by_louvor", ["louvorId"]),

  cultoEscalas: defineTable({
    cultoId: v.id("cultos"),
    funcao: v.string(),
    membroId: v.optional(v.id("membros")),
    nomeCustom: v.optional(v.string()), // Para pregadores externos
    passagemBiblica: v.optional(v.string()), // Liturgia: texto biblico
  })
    .index("by_culto", ["cultoId"])
    .index("by_membro", ["membroId"])
    .index("by_culto_funcao", ["cultoId", "funcao"]),

  // ===== Equipes de Escalas =====
  equipeMembros: defineTable({
    funcao: v.string(),             // "LOUVOR", "SOM", "HOSPITALIDADE", etc.
    membroId: v.id("membros"),
    ativo: v.boolean(),
    condutor: v.optional(v.boolean()), // Para LOUVOR: true = conduz o louvor
    instrumentos: v.optional(v.array(v.string())), // Para LOUVOR: ["teclado", "voz"]
    criadoEm: v.number(),
  })
    .index("by_funcao", ["funcao"])
    .index("by_membro", ["membroId"])
    .index("by_funcao_membro", ["funcao", "membroId"]),

  indisponibilidades: defineTable({
    membroId: v.id("membros"),
    data: v.string(),               // YYYY-MM-DD
    motivo: v.optional(v.string()),
    criadoEm: v.number(),
  })
    .index("by_membro", ["membroId"])
    .index("by_data", ["data"])
    .index("by_membro_data", ["membroId", "data"]),

  // ===== Avisos (boletim) =====
  avisos: defineTable({
    titulo: v.string(),
    descricao: v.optional(v.string()),
    dataInicio: v.string(), // YYYY-MM-DD
    dataFim: v.optional(v.string()), // YYYY-MM-DD — se omitido, vale só dataInicio
    criadoPor: v.optional(v.id("membros")),
    criadoEm: v.number(),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_dataInicio", ["dataInicio"]),

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

  // ===== Push Subscriptions =====
  pushSubscriptions: defineTable({
    membroId: v.id("membros"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    criadoEm: v.number(),
  })
    .index("by_membro", ["membroId"])
    .index("by_endpoint", ["endpoint"]),

  // ===== Pequenos Grupos =====
  pequenosGrupos: defineTable({
    nome: v.string(),
    descricao: v.optional(v.string()),
    liderId: v.id("membros"),
    coliderId: v.optional(v.id("membros")),
    diaSemana: v.optional(v.string()), // "SEGUNDA", "TERCA", etc.
    horario: v.optional(v.string()),   // "19:30"
    local: v.optional(v.string()),
    status: v.union(v.literal("ATIVO"), v.literal("INATIVO")),
  })
    .index("by_lider", ["liderId"])
    .index("by_status", ["status"]),

  pgMembros: defineTable({
    pgId: v.id("pequenosGrupos"),
    membroId: v.id("membros"),
  })
    .index("by_pg", ["pgId"])
    .index("by_membro", ["membroId"]),

  pgEncontros: defineTable({
    pgId: v.id("pequenosGrupos"),
    data: v.string(), // YYYY-MM-DD
    tema: v.optional(v.string()),
    observacoes: v.optional(v.string()),
    criadoEm: v.number(),
  })
    .index("by_pg", ["pgId"])
    .index("by_pg_data", ["pgId", "data"]),

  pgPresencas: defineTable({
    encontroId: v.id("pgEncontros"),
    membroId: v.id("membros"),
  })
    .index("by_encontro", ["encontroId"])
    .index("by_membro", ["membroId"]),

  // ===== Pastoreio =====
  visitasPastorais: defineTable({
    membroId: v.id("membros"),
    visitanteId: v.id("membros"),
    data: v.string(), // YYYY-MM-DD
    tipo: v.union(
      v.literal("DOMICILIAR"),
      v.literal("HOSPITALAR"),
      v.literal("ACOLHIMENTO"),
      v.literal("OUTRO"),
    ),
    observacoes: v.optional(v.string()),
    criadoEm: v.number(),
  })
    .index("by_membro", ["membroId"])
    .index("by_visitante", ["visitanteId"])
    .index("by_data", ["data"]),

  pedidosOracao: defineTable({
    membroId: v.id("membros"),
    descricao: v.string(),
    status: v.union(
      v.literal("ATIVO"),
      v.literal("RESPONDIDO"),
      v.literal("ARQUIVADO"),
    ),
    compartilhadoIgreja: v.optional(v.boolean()),
    criadoEm: v.number(),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_membro", ["membroId"])
    .index("by_status", ["status"])
    .index("by_criadoEm", ["criadoEm"]),

  pedidoOracaoIntercessores: defineTable({
    pedidoId: v.id("pedidosOracao"),
    membroId: v.id("membros"), // quem esta orando
    criadoEm: v.number(),
  })
    .index("by_pedido", ["pedidoId"])
    .index("by_pedido_membro", ["pedidoId", "membroId"]),

  // ===== Funcoes (equipes e liturgia) =====
  funcoes: defineTable({
    slug: v.string(),
    label: v.string(),
    multiplo: v.boolean(),
    temEquipe: v.boolean(),
    temPassagem: v.boolean(),
    views: v.array(v.string()),
    qtdPorCulto: v.optional(v.number()),
    ordem: v.number(),
    ativo: v.boolean(),
  })
    .index("by_slug", ["slug"]),

  // ===== Modulos (toggle de funcionalidades) =====
  modulos: defineTable({
    slug: v.string(),
    label: v.string(),
    descricao: v.string(),
    ativo: v.boolean(),
    ordem: v.number(),
  })
    .index("by_slug", ["slug"]),

  anotacoesPastorais: defineTable({
    membroId: v.id("membros"),
    autorId: v.id("membros"),
    texto: v.string(),
    criadoEm: v.number(),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_membro", ["membroId"])
    .index("by_autor", ["autorId"]),

  // ===== Ministerios =====
  ministerios: defineTable({
    nome: v.string(),
    descricao: v.optional(v.string()),
    icone: v.optional(v.string()),
    cor: v.optional(v.string()),
    papeis: v.array(v.string()),
    subgrupos: v.optional(v.array(v.string())),
    status: v.union(v.literal("ATIVO"), v.literal("INATIVO")),
    criadoEm: v.number(),
  })
    .index("by_status", ["status"]),

  ministerioMembros: defineTable({
    ministerioId: v.id("ministerios"),
    membroId: v.id("membros"),
    papel: v.string(),
    subgrupos: v.optional(v.array(v.string())),
    status: v.union(v.literal("ATIVO"), v.literal("INATIVO")),
    criadoEm: v.number(),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_ministerio", ["ministerioId"])
    .index("by_membro", ["membroId"])
    .index("by_ministerio_membro", ["ministerioId", "membroId"]),

  // ===== Educacional Infantil =====
  criancaPerfil: defineTable({
    entidadeId: v.id("entidades"),
    turma: v.string(), // "0-2", "3-4", "5-6", "7-8", "9-10"
    usoImagem: v.union(
      v.literal("AUTORIZADO"),
      v.literal("NAO_AUTORIZADO"),
      v.literal("PENDENTE")
    ),
    observacoesMedicas: v.optional(v.string()),
    observacoesFamilia: v.optional(v.string()),
    ovelhinhaId: v.optional(v.id("membros")),
    criadoEm: v.number(),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_entidade", ["entidadeId"])
    .index("by_turma", ["turma"]),

  responsaveis: defineTable({
    criancaEntidadeId: v.id("entidades"),
    responsavelEntidadeId: v.id("entidades"),
    tipo: v.union(
      v.literal("MAE"), v.literal("PAI"),
      v.literal("AVO"), v.literal("TUTOR"),
      v.literal("RESPONSAVEL")
    ),
    principal: v.boolean(),
    criadoEm: v.number(),
  })
    .index("by_crianca", ["criancaEntidadeId"])
    .index("by_responsavel", ["responsavelEntidadeId"]),

  eduRelatorios: defineTable({
    turma: v.string(),
    data: v.string(), // YYYY-MM-DD
    professores: v.string(), // texto livre: "Ana, Bruno"
    observacoes: v.optional(v.string()),
    criadoEm: v.number(),
  })
    .index("by_turma", ["turma"])
    .index("by_data", ["data"])
    .index("by_turma_data", ["turma", "data"]),

  eduPresencas: defineTable({
    relatorioId: v.id("eduRelatorios"),
    criancaEntidadeId: v.id("entidades"),
  })
    .index("by_relatorio", ["relatorioId"])
    .index("by_crianca", ["criancaEntidadeId"]),

  ministerioEscalas: defineTable({
    ministerioId: v.id("ministerios"),
    data: v.string(), // YYYY-MM-DD
    subgrupo: v.optional(v.string()), // turma: "3-4"
    membros: v.array(v.object({
      membroId: v.id("membros"),
      papel: v.optional(v.string()), // "Professor", "Auxiliar"
    })),
    observacoes: v.optional(v.string()),
    criadoEm: v.number(),
  })
    .index("by_ministerio", ["ministerioId"])
    .index("by_data", ["data"])
    .index("by_ministerio_data", ["ministerioId", "data"]),

  // ===== Louvor =====
  louvores: defineTable({
    titulo: v.string(),
    artista: v.optional(v.string()),
    tom: v.optional(v.string()),
    tomHomem: v.optional(v.string()),
    tomMulher: v.optional(v.string()),
    bpm: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    conteudo: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    observacoes: v.optional(v.string()),
    estrutura: v.optional(v.string()),   // Ordem de secoes: "i v1 v2 pc r p r"
    status: v.union(v.literal("ATIVO"), v.literal("INATIVO")),
    criadoEm: v.number(),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_titulo", ["titulo"])
    .searchIndex("search_louvores", {
      searchField: "titulo",
      filterFields: ["status"],
    }),

  // ===== Calendario =====
  calendarioEventos: defineTable({
    titulo: v.string(),
    data: v.string(), // YYYY-MM-DD
    dataFim: v.optional(v.string()),
    ministerioId: v.optional(v.id("ministerios")),
    descricao: v.optional(v.string()),
    origem: v.optional(v.string()), // "aviso-ia" = criado automaticamente a partir de aviso
    criadoEm: v.number(),
  })
    .index("by_data", ["data"])
    .index("by_ministerio", ["ministerioId"]),

  // ===== Salas =====
  salas: defineTable({
    nome: v.string(),
    descricao: v.optional(v.string()),
    status: v.union(v.literal("ATIVO"), v.literal("INATIVO")),
    criadoEm: v.number(),
  })
    .index("by_status", ["status"]),

  reservas: defineTable({
    salaId: v.id("salas"),
    data: v.string(),
    horaInicio: v.string(),
    horaFim: v.string(),
    membroId: v.id("membros"),
    motivo: v.string(),
    status: v.union(v.literal("ATIVA"), v.literal("CANCELADA")),
    criadoEm: v.number(),
  })
    .index("by_sala_data", ["salaId", "data"])
    .index("by_membro", ["membroId"])
    .index("by_data", ["data"]),

  // ===== Tarefas =====
  tarefas: defineTable({
    titulo: v.string(),
    descricao: v.optional(v.string()),
    status: v.union(
      v.literal("ABERTA"),
      v.literal("EM_ANDAMENTO"),
      v.literal("CONCLUIDA"),
      v.literal("CANCELADA")
    ),
    prioridade: v.union(
      v.literal("BAIXA"),
      v.literal("MEDIA"),
      v.literal("ALTA"),
      v.literal("URGENTE")
    ),
    criadoPor: v.id("membros"),
    responsavelId: v.id("membros"),
    dataVencimento: v.optional(v.string()), // YYYY-MM-DD
    // Referencia polimorfica a outro modulo
    moduloRelacionado: v.optional(v.union(
      v.literal("ministerios"),
      v.literal("escalas"),
      v.literal("calendario"),
      v.literal("pequenos-grupos"),
      v.literal("pastoreio"),
      v.literal("gravacoes"),
      v.literal("pedidos-oracao")
    )),
    referenciaId: v.optional(v.string()),
    referenciaTitulo: v.optional(v.string()),
    // Conclusao
    concluidaEm: v.optional(v.number()),
    concluidaPor: v.optional(v.id("membros")),
    // Timestamps
    criadoEm: v.number(),
    atualizadoEm: v.optional(v.number()),
  })
    .index("by_responsavel", ["responsavelId"])
    .index("by_criador", ["criadoPor"])
    .index("by_status", ["status"])
    .index("by_vencimento", ["dataVencimento"])
    .index("by_modulo", ["moduloRelacionado", "referenciaId"]),

  // ===== Comentarios Unificados =====
  comentarios: defineTable({
    entidadeTipo: v.union(
      v.literal("tarefas"),
      v.literal("gravacoes"),
      v.literal("pedidos-oracao")
    ),
    entidadeId: v.string(),
    membroId: v.id("membros"),
    texto: v.string(),
    parentId: v.optional(v.id("comentarios")),
    tipo: v.optional(v.union(
      v.literal("COMENTARIO"),
      v.literal("ATUALIZACAO")
    )),
    criadoEm: v.number(),
  })
    .index("by_entidade", ["entidadeTipo", "entidadeId", "criadoEm"])
    .index("by_parent", ["parentId"])
    .index("by_membro", ["membroId"]),

  // ===== Turmas =====
  turmas: defineTable({
    nome: v.string(),
    instrutorId: v.optional(v.id("membros")),
    instrutorNome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    dataInicio: v.string(), // YYYY-MM-DD
    dataFim: v.optional(v.string()),
    diaSemana: v.optional(v.string()),
    horario: v.optional(v.string()),
    local: v.optional(v.string()),
    vagas: v.optional(v.number()), // null = ilimitado
    vagasOcupadas: v.number(), // contador atomico
    status: v.union(
      v.literal("ABERTA"),
      v.literal("EM_ANDAMENTO"),
      v.literal("ENCERRADA"),
      v.literal("CANCELADA")
    ),
    // Formulario
    camposSistema: v.array(v.string()),
    perguntasExtras: v.optional(v.array(v.object({
      id: v.string(),
      label: v.string(),
      obrigatorio: v.boolean(),
    }))),
    token: v.optional(v.string()),
    criadoPor: v.optional(v.id("membros")),
    criadoEm: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_token", ["token"]),

  inscricoes: defineTable({
    turmaId: v.id("turmas"),
    membroId: v.optional(v.id("membros")),
    dadosSistema: v.object({
      nomeCompleto: v.string(),
      whatsapp: v.optional(v.string()),
      email: v.optional(v.string()),
      dataNascimento: v.optional(v.string()),
      sexo: v.optional(v.string()),
    }),
    respostasExtras: v.optional(v.array(v.object({
      perguntaId: v.string(),
      valor: v.string(),
    }))),
    status: v.union(
      v.literal("CONFIRMADA"),
      v.literal("CANCELADA"),
      v.literal("LISTA_ESPERA")
    ),
    lgpdConsentimento: v.boolean(),
    criadoEm: v.number(),
    canceladoEm: v.optional(v.number()),
  })
    .index("by_turma", ["turmaId"])
    .index("by_membro", ["membroId"])
    .index("by_turma_status", ["turmaId", "status"]),

  turmaEncontros: defineTable({
    turmaId: v.id("turmas"),
    data: v.string(), // YYYY-MM-DD
    titulo: v.optional(v.string()),
    observacoes: v.optional(v.string()),
    criadoPor: v.optional(v.id("membros")),
    criadoEm: v.number(),
  })
    .index("by_turma", ["turmaId"]),

  // ===== Biblioteca =====
  livros: defineTable({
    titulo: v.string(),
    autores: v.array(v.string()),
    editora: v.optional(v.string()),
    isbn: v.optional(v.string()),
    ano: v.optional(v.number()),
    categorias: v.array(v.string()),
    edicao: v.optional(v.string()),
    idioma: v.optional(v.string()),
    capaUrl: v.optional(v.string()),
    descricao: v.optional(v.string()),
    paginas: v.optional(v.number()),
    observacoes: v.optional(v.string()),
    criadoEm: v.number(),
  })
    .index("by_isbn", ["isbn"])
    .searchIndex("search_livros", {
      searchField: "titulo",
    }),

  exemplares: defineTable({
    livroId: v.id("livros"),
    codigo: v.string(), // BIB-0001
    condicao: v.union(
      v.literal("NOVO"),
      v.literal("BOM"),
      v.literal("REGULAR"),
      v.literal("RUIM")
    ),
    status: v.union(
      v.literal("DISPONIVEL"),
      v.literal("EMPRESTADO"),
      v.literal("PERDIDO"),
      v.literal("DANIFICADO")
    ),
    dataAquisicao: v.string(), // YYYY-MM-DD
    doadorId: v.optional(v.id("entidades")),
    doadorNome: v.optional(v.string()),
    observacoes: v.optional(v.string()),
  })
    .index("by_livro", ["livroId"])
    .index("by_status", ["status"])
    .index("by_codigo", ["codigo"]),

  emprestimos: defineTable({
    exemplarId: v.id("exemplares"),
    livroId: v.id("livros"), // denormalizado
    membroId: v.id("membros"),
    dataEmprestimo: v.string(), // YYYY-MM-DD
    dataPrevistaDevolucao: v.string(), // YYYY-MM-DD
    dataDevolucao: v.optional(v.string()),
    status: v.union(v.literal("ATIVO"), v.literal("DEVOLVIDO")),
    selfService: v.optional(v.boolean()),
    observacoes: v.optional(v.string()),
    registradoPor: v.optional(v.id("membros")),
  })
    .index("by_exemplar", ["exemplarId"])
    .index("by_livro", ["livroId"])
    .index("by_membro", ["membroId"])
    .index("by_status", ["status"]),

  livroEventos: defineTable({
    exemplarId: v.id("exemplares"),
    livroId: v.id("livros"), // denormalizado
    tipo: v.string(), // CADASTRO, EMPRESTIMO, DEVOLUCAO, CONDICAO, PERDA, DOACAO, OBSERVACAO
    data: v.string(), // YYYY-MM-DD
    descricao: v.string(),
    membroId: v.optional(v.id("membros")),
    registradoPor: v.optional(v.id("membros")),
  })
    .index("by_exemplar", ["exemplarId"])
    .index("by_livro", ["livroId"]),

  turmaPresencas: defineTable({
    encontroId: v.id("turmaEncontros"),
    inscricaoId: v.id("inscricoes"),
    presente: v.boolean(),
    observacoes: v.optional(v.string()),
    registradoPor: v.optional(v.id("membros")),
  })
    .index("by_encontro", ["encontroId"])
    .index("by_inscricao", ["inscricaoId"]),

  // ===== Multimidia =====
  multimidiaArquivos: defineTable({
    cultoId: v.id("cultos"),
    enviadoPor: v.id("membros"),
    tipo: v.union(
      v.literal("APRESENTACAO"),
      v.literal("VIDEO"),
      v.literal("IMAGEM"),
      v.literal("OUTRO")
    ),
    nomeArquivo: v.string(),
    url: v.string(),
    mimeType: v.string(),
    descricao: v.optional(v.string()),
    status: v.union(
      v.literal("RECEBIDO"),
      v.literal("REVISADO"),
      v.literal("APROVADO")
    ),
    revisadoPor: v.optional(v.id("membros")),
  })
    .index("by_culto", ["cultoId"])
    .index("by_enviadoPor", ["enviadoPor"])
    .index("by_status", ["status"]),

  multimidiaChecklist: defineTable({
    cultoId: v.id("cultos"),
    item: v.string(),
    ordem: v.number(),
    concluido: v.boolean(),
    concluidoPor: v.optional(v.id("membros")),
    concluidoEm: v.optional(v.number()),
  })
    .index("by_culto", ["cultoId"]),

  multimidiaNotas: defineTable({
    cultoId: v.id("cultos"),
    membroId: v.id("membros"),
    texto: v.string(),
    criadoEm: v.number(),
  })
    .index("by_culto", ["cultoId"]),

  multimidiaChecklistTemplate: defineTable({
    item: v.string(),
    ordem: v.number(),
    ativo: v.boolean(),
  }),
});
