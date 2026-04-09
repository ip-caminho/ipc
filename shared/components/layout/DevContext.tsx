"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";

interface PageContext {
  nome: string;
  pagina: string;
  arquivos: string[];
  queries?: string[];
  mutations?: string[];
  componentes?: string[];
  notas?: string[];
  doc?: string;
}

const CONTEXT_MAP: Record<string, PageContext> = {
  "/dashboard": {
    nome: "Dashboard",
    pagina: "app/(ready)/dashboard/page.tsx",
    doc: "docs/modules/dashboard.md",
    arquivos: [
      "app/(ready)/dashboard/page.tsx",
      "features/gravacoes/components/AvisosWidget.tsx",
      "features/gravacoes/components/FrasesCarrossel.tsx",
      "features/escalas/components/MinhaEscalaWidget.tsx",
    ],
    queries: ["gravacoes.queries.getLatestAvisos", "membros.queries.birthdaysThisMonth", "pastoreio.queries.listPedidosOracao", "escalas.queries.minhasEscalas"],
    mutations: ["membros.bootstrap.bootstrapAdmin"],
    componentes: ["AvisosWidget (usa player global)", "FrasesCarrossel", "MinhaEscalaWidget", "BootstrapForm"],
    notas: [
      "Layout: AvisosWidget e Aniversariantes do mes lado a lado (grid lg:grid-cols-2)",
      "Aniversariantes usam apelido + icone WhatsApp",
      "Pedidos de oracao ativos (se tem permissao)",
      "AvisosWidget: botao 'Ouvir avisos' usa player global persistente",
      "MinhaEscalaWidget: proximas escalas do membro (oculto se nao tem escalas)",
    ],
  },
  "/membros": {
    nome: "Lista de Membros",
    pagina: "app/(ready)/membros/page.tsx",
    doc: "docs/modules/membros.md",
    arquivos: [
      "app/(ready)/membros/page.tsx",
      "features/membros/components/MembroTable.tsx",
    ],
    queries: ["membros.queries.list"],
    componentes: ["MembroTable", "PermissionGate"],
    notas: ["Permissao: membros:read"],
  },
  "/membros/novo": {
    nome: "Novo Membro",
    pagina: "app/(ready)/membros/novo/page.tsx",
    doc: "docs/modules/membros.md",
    arquivos: [
      "app/(ready)/membros/novo/page.tsx",
      "features/membros/components/MembroForm.tsx",
      "features/membros/lib/validations.ts",
    ],
    mutations: ["membros.mutations.create"],
    componentes: ["MembroForm"],
    notas: ["Permissao: membros:create"],
  },
  "/membros/[id]": {
    nome: "Detalhe do Membro",
    pagina: "app/(ready)/membros/[id]/page.tsx",
    doc: "docs/modules/membros.md",
    arquivos: [
      "app/(ready)/membros/[id]/page.tsx",
      "features/membros/components/MembroForm.tsx",
    ],
    queries: ["membros.queries.getById"],
    mutations: ["membros.mutations.update"],
    componentes: ["MembroForm"],
    notas: ["Permissao: membros:read, membros:update"],
  },
  "/entidades": {
    nome: "Lista de Entidades",
    pagina: "app/(ready)/entidades/page.tsx",
    doc: "docs/modules/entidades.md",
    arquivos: [
      "app/(ready)/entidades/page.tsx",
      "features/entidades/lib/constants.ts",
    ],
    queries: ["entidades.queries.list"],
    componentes: ["PermissionGate"],
    notas: ["Permissao: entidades:read. Exibe PF e PJ com papeis"],
  },
  "/entidades/novo": {
    nome: "Nova Entidade",
    pagina: "app/(ready)/entidades/novo/page.tsx",
    doc: "docs/modules/entidades.md",
    arquivos: ["app/(ready)/entidades/novo/page.tsx"],
    mutations: ["entidades.mutations.create"],
    notas: ["Permissao: entidades:create"],
  },
  "/diretorio": {
    nome: "Diretorio de Membros e Criancas",
    pagina: "app/(ready)/diretorio/page.tsx",
    doc: "docs/modules/diretorio.md",
    arquivos: ["app/(ready)/diretorio/page.tsx"],
    queries: [
      "membros.queries.list",
      "membros.queries.getPublicProfile",
      "educacional.queries.listCriancasForDiretorio",
      "educacional.queries.listCriancasByResponsavel",
      "educacional.queries.getCrianca",
    ],
    componentes: ["MembroFicha (inline)", "CriancaFicha (inline)", "CriancasGrid (inline)", "ModuloGuard"],
    notas: [
      "Permissao: diretorio:read",
      "Filtros: Todos, Membros, Obreiros, Pastores e Presbiteros, Criancas",
      "Aba Criancas: lista criancas do educacional com filtro por turma",
      "Cards com apelido, foto, cargo. Sem WhatsApp no card",
      "Contagem de membros/criancas no header, ordenacao alfabetica",
      "Ficha membro (Sheet): foto, WhatsApp, aniversario, profissao, bairro, conjuge, filhos reais (via responsaveis), PG",
      "Ficha crianca (Sheet): foto, idade, turma, responsaveis, ovelhinha",
      "getPublicProfile retorna entidadeId para buscar filhos via listCriancasByResponsavel",
    ],
  },
  "/gravacoes": {
    nome: "Lista de Gravacoes (visao membro)",
    pagina: "app/(ready)/gravacoes/page.tsx",
    doc: "docs/modules/gravacoes.md",
    arquivos: [
      "app/(ready)/gravacoes/page.tsx",
      "features/gravacoes/components/BibleBookFilter.tsx",
      "features/gravacoes/lib/bible.ts",
    ],
    queries: ["gravacoes.queries.list", "gravacoes.queries.listTags"],
    componentes: ["BibleBookFilter"],
    notas: [
      "Apenas visao para membros — sem criar/editar/excluir",
      "Mostra apenas gravacoes PUBLICADO",
      "Filtros: tag, livro da biblia, busca texto",
      "Agrupamento: por data ou por pregador",
      "Criacao/edicao feita em /admin/gravacoes",
    ],
  },
  "/gravacoes/nova": {
    nome: "Nova Gravacao",
    pagina: "app/(ready)/gravacoes/nova/page.tsx",
    doc: "docs/modules/gravacoes.md",
    arquivos: [
      "app/(ready)/gravacoes/nova/page.tsx",
      "features/gravacoes/components/GravacaoForm.tsx",
      "shared/files/components/FileUpload.tsx",
      "shared/files/hooks/useAudioCompressor.ts",
      "shared/bible/components/BiblePassageInput.tsx",
      "shared/bible/hooks/useBibleLookup.ts",
    ],
    mutations: ["gravacoes.ai.createFromAudio"],
    componentes: ["GravacaoForm", "FileUpload", "BiblePassageInput"],
    notas: [
      "Permissao: gravacoes:create",
      "Data padrao: ultimo domingo",
      "Audio comprimido client-side (FFmpeg.wasm → 64kbps MP3)",
      "Upload via presigned URL para B2",
      "Pipeline IA extrai dataEvento dos avisos e cria eventos no calendario automaticamente (origem: aviso-ia)",
    ],
  },
  "/gravacoes/[id]": {
    nome: "Detalhe da Gravacao",
    pagina: "app/(ready)/gravacoes/[id]/page.tsx",
    doc: "docs/modules/gravacoes.md",
    arquivos: [
      "app/(ready)/gravacoes/[id]/page.tsx",
      "shared/audio/AudioPlayerProvider.tsx",
      "shared/audio/useAudioPlayer.ts",
      "features/gravacoes/components/IaResultadoDisplay.tsx",
      "features/gravacoes/components/SegmentEditor.tsx",
      "features/gravacoes/components/IaProcessarButton.tsx",
      "features/gravacoes/components/IaProgressPanel.tsx",
      "features/gravacoes/components/IaStatusBadge.tsx",
      "features/gravacoes/hooks/useEscutaTracker.ts",
    ],
    queries: ["gravacoes.queries.getById", "gravacoes.escutas.getMyProgress"],
    mutations: ["gravacoes.mutations.update", "gravacoes.mutations.publish", "gravacoes.mutations.remove", "gravacoes.escutas.heartbeat"],
    componentes: [
      "useAudioPlayer (player global)",
      "DadosEditor (inline)",
      "AvisosEditor (inline)",
      "IaResultadoDisplay",
      "SegmentEditor",
      "IaProcessarButton",
      "IaProgressPanel",
      "IaStatusBadge",
    ],
    notas: [
      "Header com controles: status IA, processar, publicar/despublicar, excluir",
      "Tabs: Dados, Avisos, Resultado IA, Segmentos, Audio completo",
      "Edicao inline com permissao gravacoes:update ou gravacoes:process_ai",
      "Audio via player global persistente (botao Ouvir sermao / Audio completo)",
    ],
  },
  "/gravacoes/[id]/admin": {
    nome: "Admin da Gravacao",
    pagina: "app/(ready)/gravacoes/[id]/admin/page.tsx",
    doc: "docs/modules/gravacoes.md",
    arquivos: [
      "app/(ready)/gravacoes/[id]/admin/page.tsx",
      "shared/audio/useAudioPlayer.ts",
      "features/gravacoes/components/IaResultadoDisplay.tsx",
      "features/gravacoes/components/SegmentEditor.tsx",
      "features/gravacoes/components/IaProcessarButton.tsx",
      "features/gravacoes/components/IaProgressPanel.tsx",
    ],
    queries: ["gravacoes.queries.getById"],
    mutations: ["gravacoes.mutations.update"],
    componentes: [
      "AvisosEditor (inline)",
      "IaResultadoDisplay",
      "SegmentEditor",
      "useAudioPlayer (player global)",
    ],
    notas: [
      "Permissao: gravacoes:update ou gravacoes:process_ai",
      "Tabs: Avisos, Resultado IA, Segmentos, Audio completo",
      "AvisosEditor: editar titulo/descricao de cada aviso",
      "SegmentEditor: ajustar inicioSermao/fimSermao/inicioAvisos/fimAvisos",
      "Audio completo via player global (botao play)",
    ],
  },
  "/admin/permissoes": {
    nome: "Permissoes e Convites",
    pagina: "app/(ready)/admin/permissoes/page.tsx",
    doc: "docs/modules/admin-permissoes.md",
    arquivos: [
      "app/(ready)/admin/permissoes/page.tsx",
      "features/preferencias/components/PermissionMatrix.tsx",
      "convex/preferencias/rbac.ts",
      "types/auth.ts",
    ],
    mutations: ["membros.convites.generateInvite"],
    componentes: ["PermissionMatrix", "AdminGate"],
    notas: [
      "Somente admin",
      "Tabs: Roles e Permissoes, Convites",
      "Gera links de convite com role (membro/secretaria)",
    ],
  },
  "/escalas": {
    nome: "Equipes e Escalas",
    pagina: "app/(ready)/escalas/page.tsx",
    doc: "docs/modules/escalas.md",
    arquivos: [
      "app/(ready)/escalas/page.tsx",
      "features/escalas/components/EquipesTab.tsx",
      "features/escalas/components/DisponibilidadeTab.tsx",
      "features/escalas/components/MinhasEquipesTab.tsx",
      "features/escalas/components/GerarEscalasTab.tsx",
    ],
    mutations: ["escalas.mutations.garantirCultosFuturos", "escalas.funcoes.create"],
    componentes: ["EquipesTab", "DisponibilidadeTab", "MinhasEquipesTab", "GerarEscalasTab", "NovaEquipeDialog", "ModuloGuard"],
    notas: [
      "Tabs: Minha Escala, Disponibilidade, Gerar Escalas (escalas:create), Equipes (escalas:update)",
      "Garante cultos futuros (3 meses) ao abrir a pagina",
      "Aba Equipes: card '+Nova equipe' com dialog para criar (admin/escalas:update)",
    ],
  },
  "/cultos": {
    nome: "Escala de Cultos",
    pagina: "app/(ready)/cultos/page.tsx",
    doc: "docs/modules/cultos.md",
    arquivos: [
      "app/(ready)/cultos/page.tsx",
      "features/escalas/components/MembroCombobox.tsx",
      "shared/bible/components/BiblePassageInput.tsx",
    ],
    queries: ["escalas.queries.listCultos", "membros.queries.list"],
    mutations: [
      "escalas.mutations.upsertEscala",
      "escalas.mutations.removeEscala",
      "escalas.mutations.addEscala",
      "escalas.mutations.updatePassagem",
      "escalas.mutations.updateLouvores",
      "escalas.mutations.createCulto",
      "escalas.mutations.deleteCulto",
    ],
    componentes: ["MembroCombobox", "ModuloGuard", "BiblePassageInput"],
    notas: [
      "Permissao: escalas:read, escalas:update, escalas:create, escalas:delete",
      "Escala unificada com liturgia (membro + passagem biblica ou membro simples)",
      "Preview de passagens biblicas inline (NAA) via BiblePassageInput",
    ],
  },
  "/avisos": {
    nome: "Avisos",
    pagina: "app/(ready)/avisos/page.tsx",
    arquivos: [
      "app/(ready)/avisos/page.tsx",
      "features/avisos/components/AvisosSection.tsx",
    ],
    queries: ["avisos.queries.list"],
    mutations: ["avisos.mutations.create", "avisos.mutations.update", "avisos.mutations.remove"],
    componentes: ["AvisosSection", "ModuloGuard"],
    notas: [
      "Permissao: escalas:read, escalas:create, escalas:update, escalas:delete",
      "Avisos ativos e expirados",
      "Criacao e edicao inline",
    ],
  },
  "/proximo-domingo": {
    nome: "Proximo Domingo",
    pagina: "app/(ready)/proximo-domingo/page.tsx",
    arquivos: [
      "app/(ready)/proximo-domingo/page.tsx",
      "shared/bible/components/BibleVersePreview.tsx",
      "shared/bible/hooks/useBibleLookup.ts",
    ],
    queries: ["escalas.queries.getProximoDomingo"],
    componentes: ["BibleVersePreview", "ModuloGuard"],
    notas: [
      "Permissao: escalas:read",
      "Seletor de domingo no topo com navegacao",
      "Liturgia com texto biblico completo (NAA)",
      "Louvor, equipe, avisos e indisponibilidades",
    ],
  },
  "/boletim": {
    nome: "Boletim Dominical",
    pagina: "app/(ready)/boletim/page.tsx",
    doc: "docs/modules/boletim.md",
    arquivos: ["app/(ready)/boletim/page.tsx"],
    queries: ["escalas.queries.getBoletim"],
    componentes: ["ModuloGuard"],
    notas: [
      "Somente leitura — exibe boletim formatado para impressao",
      "Navegacao entre cultos anteriores/proximos",
      "Mostra liturgia, equipe e avisos",
    ],
  },
  "/pequenos-grupos": {
    nome: "Pequenos Grupos",
    pagina: "app/(ready)/pequenos-grupos/page.tsx",
    doc: "docs/modules/pequenos-grupos.md",
    arquivos: [
      "app/(ready)/pequenos-grupos/page.tsx",
      "features/pequenosGrupos/components/PGCard.tsx",
      "features/pequenosGrupos/components/PGForm.tsx",
      "features/pequenosGrupos/components/PGDetalhe.tsx",
      "features/pequenosGrupos/components/PGRemanejamento.tsx",
    ],
    queries: ["pequenosGrupos.queries.list", "pequenosGrupos.queries.listAllWithMembros"],
    mutations: ["pequenosGrupos.mutations.create"],
    componentes: ["PGCard", "PGForm", "PGDetalhe", "PGRemanejamento", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: pequenos_grupos:read, pequenos_grupos:create, pequenos_grupos:update",
      "2 views: grid de PGs e remanejamento de membros entre grupos",
      "Mostra membros sem grupo na parte inferior",
    ],
  },
  "/pedidos-oracao": {
    nome: "Pedidos de Oracao",
    pagina: "app/(ready)/pedidos-oracao/page.tsx",
    doc: "docs/modules/pedidos-oracao.md",
    arquivos: [
      "app/(ready)/pedidos-oracao/page.tsx",
      "features/pedidosOracao/components/PedidoOracaoListCard.tsx",
      "features/pedidosOracao/components/PedidoOracaoDetalhe.tsx",
    ],
    queries: ["pedidosOracao.queries.listPublicos"],
    mutations: ["pedidosOracao.mutations.create"],
    componentes: ["PedidoOracaoListCard", "PedidoOracaoDetalhe", "ModuloGuard"],
    notas: [
      "3 tabs: Meus pedidos, Meu PG, Todos",
      "Opcao de compartilhar com a igreja para anuncio no culto",
    ],
  },
  "/pastoreio": {
    nome: "Pastoreio",
    pagina: "app/(ready)/pastoreio/page.tsx",
    doc: "docs/modules/pastoreio.md",
    arquivos: [
      "app/(ready)/pastoreio/page.tsx",
      "features/pastoreio/components/VisitaForm.tsx",
      "features/pastoreio/components/VisitaCard.tsx",
      "features/pastoreio/components/PedidoOracaoForm.tsx",
      "features/pastoreio/components/PedidoOracaoCard.tsx",
      "features/pastoreio/components/AnotacaoForm.tsx",
      "features/pastoreio/components/AnotacaoCard.tsx",
      "features/pastoreio/components/MembroPerfilPastoral.tsx",
    ],
    queries: [
      "pastoreio.queries.listMembrosResumo",
      "pastoreio.queries.listVisitas",
      "pastoreio.queries.listPedidosOracao",
      "pastoreio.queries.listAnotacoes",
      "pastoreio.queries.dashboardStats",
    ],
    mutations: [
      "pastoreio.mutations.createVisita",
      "pastoreio.mutations.removeVisita",
      "pastoreio.mutations.createPedidoOracao",
      "pastoreio.mutations.updatePedidoOracao",
      "pastoreio.mutations.arquivarPedidoOracao",
      "pastoreio.mutations.createAnotacao",
      "pastoreio.mutations.removeAnotacao",
    ],
    componentes: [
      "VisitaForm", "VisitaCard", "PedidoOracaoForm", "PedidoOracaoCard",
      "AnotacaoForm", "AnotacaoCard", "MembroPerfilPastoral",
      "PermissionGate", "ModuloGuard",
    ],
    notas: [
      "Permissao: pastoreio:read/create/update/delete, pedidos_oracao:read",
      "4 tabs: Membros, Visitas, Pedidos de Oracao, Anotacoes",
      "Dashboard com stats (visitas no mes, pedidos ativos, anotacoes recentes)",
      "Perfil pastoral por membro com historico completo",
    ],
  },
  "/ministerios": {
    nome: "Ministerios",
    pagina: "app/(ready)/ministerios/page.tsx",
    doc: "docs/modules/ministerios.md",
    arquivos: [
      "app/(ready)/ministerios/page.tsx",
      "features/ministerios/components/MinisterioCard.tsx",
      "features/ministerios/components/MinisterioForm.tsx",
      "features/ministerios/components/MinisterioDetalhe.tsx",
    ],
    queries: ["ministerios.queries.list"],
    mutations: ["ministerios.mutations.create"],
    componentes: ["MinisterioCard", "MinisterioForm", "MinisterioDetalhe", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: ministerios:read/create/update/delete",
      "Grid de cards com nome, descricao, badge de membros",
      "Click no card abre detalhe com lista de membros, papeis, subgrupos",
      "Badge CBCM nos membros do ministerio (amarelo se pendente)",
    ],
  },
  "/ministerios/[id]": {
    nome: "Detalhe do Ministerio",
    pagina: "app/(ready)/ministerios/[id]/page.tsx",
    doc: "docs/modules/ministerios.md",
    arquivos: [
      "app/(ready)/ministerios/[id]/page.tsx",
      "features/ministerios/components/MinisterioDetalhe.tsx",
    ],
    queries: ["ministerios.queries.getById"],
    mutations: ["ministerios.mutations.update", "ministerios.mutations.addMembro", "ministerios.mutations.removeMembro"],
    componentes: ["MinisterioDetalhe", "MinisterioForm", "ModuloGuard"],
    notas: [
      "Permissao: ministerios:read/update/delete",
      "Adicionar/remover membros com papel e subgrupo",
    ],
  },
  "/educacional": {
    nome: "Educacional Infantil",
    pagina: "app/(ready)/educacional/page.tsx",
    doc: "docs/modules/educacional.md",
    arquivos: [
      "app/(ready)/educacional/page.tsx",
      "features/educacional/components/CriancaCard.tsx",
      "features/educacional/components/CriancaForm.tsx",
      "features/educacional/components/CriancaDetalhe.tsx",
      "features/educacional/components/RelatorioForm.tsx",
      "features/educacional/components/EscalaForm.tsx",
      "features/educacional/components/EducacionalPaisWidget.tsx",
    ],
    queries: [
      "educacional.queries.listCriancas",
      "educacional.queries.getCrianca",
      "educacional.queries.listRelatorios",
      "educacional.queries.listEscalas",
      "educacional.queries.dashboardPais",
    ],
    mutations: [
      "educacional.mutations.createCrianca",
      "educacional.mutations.updateCrianca",
      "educacional.mutations.removeCrianca",
      "educacional.mutations.addResponsavel",
      "educacional.mutations.removeResponsavel",
      "educacional.mutations.createRelatorio",
      "educacional.mutations.createEscala",
      "educacional.mutations.removeEscala",
    ],
    componentes: [
      "CriancaCard", "CriancaForm", "CriancaDetalhe",
      "RelatorioForm", "EscalaForm", "EducacionalPaisWidget",
      "PermissionGate", "ModuloGuard",
    ],
    notas: [
      "Permissao: criancas:read/manage, educacional:read/write",
      "3 tabs: Turmas (default), Escala, Relatorios",
      "Filtro por turma, grid de CriancaCards",
      "Click no card abre CriancaDetalhe inline",
      "Obs medicas so visivel com criancas:manage (LGPD)",
      "Escala usa ministerioEscalas (ministerio 'Educacional')",
      "Dashboard widget para pais: dashboardPais()",
    ],
  },
  "/calendario": {
    nome: "Calendario",
    pagina: "app/(ready)/calendario/page.tsx",
    doc: "docs/modules/calendario.md",
    arquivos: [
      "app/(ready)/calendario/page.tsx",
      "features/calendario/components/EventoForm.tsx",
      "features/calendario/components/EventoCard.tsx",
    ],
    queries: ["calendario.queries.list", "ministerios.queries.list"],
    mutations: ["calendario.mutations.create", "calendario.mutations.update", "calendario.mutations.remove"],
    componentes: ["EventoForm", "EventoCard", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: calendario:read/create/update/delete",
      "Navegacao por mes com setas",
      "Filtro por ministerio",
      "Click no evento abre dialog de edicao",
    ],
  },
  "/louvor": {
    nome: "Repertorio de Louvor",
    pagina: "app/(ready)/louvor/page.tsx",
    arquivos: [
      "app/(ready)/louvor/page.tsx",
      "features/louvor/components/LouvorCard.tsx",
      "features/louvor/components/LouvorForm.tsx",
      "features/louvor/lib/constants.ts",
      "features/louvor/lib/validations.ts",
      "features/louvor/lib/chordpro.ts",
    ],
    queries: ["louvor.queries.list", "louvor.queries.listTags"],
    mutations: ["louvor.mutations.create"],
    componentes: ["LouvorCard", "LouvorForm", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: louvor:read, louvor:create",
      "Grid de cards com titulo, artista, tom, tags",
      "Filtros: busca texto, tag, tom",
      "Criacao via dialog com preview da cifra em tempo real",
      "Import via copy-paste do Cifra Club (converte para ChordPro)",
    ],
  },
  "/louvor/[id]": {
    nome: "Detalhe da Musica",
    pagina: "app/(ready)/louvor/[id]/page.tsx",
    arquivos: [
      "app/(ready)/louvor/[id]/page.tsx",
      "features/louvor/components/LouvorDetalhe.tsx",
      "features/louvor/components/ChordSheet.tsx",
      "features/louvor/components/YouTubeEmbed.tsx",
      "features/louvor/components/LouvorForm.tsx",
      "features/louvor/lib/chordpro.ts",
      "features/louvor/lib/constants.ts",
    ],
    queries: ["louvor.queries.getById"],
    mutations: ["louvor.mutations.update", "louvor.mutations.remove"],
    componentes: ["LouvorDetalhe", "ChordSheet", "YouTubeEmbed", "LouvorForm", "ModuloGuard"],
    notas: [
      "Permissao: louvor:read, louvor:update, louvor:delete",
      "Seletor de tom: Original / Homem / Mulher / Custom",
      "Toggle cifras on/off (Switch)",
      "Transposicao via ChordSheetJS",
      "YouTube embed se URL presente",
      "Observacoes visiveis para louvor:update",
    ],
  },
  "/admin/gravacoes": {
    nome: "Gerenciar Gravacoes (Admin)",
    pagina: "app/(ready)/admin/gravacoes/page.tsx",
    doc: "docs/modules/admin-gravacoes.md",
    arquivos: [
      "app/(ready)/admin/gravacoes/page.tsx",
      "features/gravacoes/components/IaStatusBadge.tsx",
    ],
    queries: ["gravacoes.queries.list"],
    componentes: ["GravacaoAdminCard (inline)", "AdminGate", "IaStatusBadge"],
    notas: [
      "Somente admin",
      "Lista todas as gravacoes com filtros de status e status IA",
      "Link Gerenciar → /gravacoes/[id]/admin",
    ],
  },
  "/admin/modulos": {
    nome: "Gerenciar Modulos",
    pagina: "app/(ready)/admin/modulos/page.tsx",
    doc: "docs/modules/admin-modulos.md",
    arquivos: [
      "app/(ready)/admin/modulos/page.tsx",
      "convex/modulos/queries.ts",
      "convex/modulos/mutations.ts",
    ],
    queries: ["modulos.queries.listModulos"],
    mutations: ["modulos.mutations.toggleModulo"],
    componentes: ["AdminGate"],
    notas: [
      "Somente admin",
      "Toggle on/off de modulos do sistema",
      "Seed: npx convex run modulos/mutations:seedModulos",
    ],
  },
  "/meu-perfil": {
    nome: "Meu Perfil",
    pagina: "app/(ready)/meu-perfil/page.tsx",
    arquivos: ["app/(ready)/meu-perfil/page.tsx"],
    queries: ["membros.selfService.getMyProfile"],
    mutations: ["membros.selfService.updateMyProfile"],
    notas: ["Self-service: membro edita seus proprios dados"],
  },
  "/multimidia": {
    nome: "Multimidia",
    pagina: "app/(ready)/multimidia/page.tsx",
    arquivos: ["app/(ready)/multimidia/page.tsx"],
    queries: ["multimidia.queries.getPainelCulto", "escalas.queries.listCultos"],
    mutations: ["multimidia.mutations.toggleChecklistItem", "multimidia.mutations.criarNota", "multimidia.mutations.initChecklist"],
    componentes: ["ModuloGuard"],
    notas: [
      "Permissao: multimidia:read/create/update",
      "Painel centrado no culto com navegacao por data",
      "Liturgia, arquivos, avisos, checklist, anotacoes",
    ],
  },
  "/biblioteca": {
    nome: "Biblioteca",
    pagina: "app/(ready)/biblioteca/page.tsx",
    arquivos: [
      "app/(ready)/biblioteca/page.tsx",
      "features/biblioteca/components/LivroCard.tsx",
    ],
    queries: ["biblioteca.queries.list", "biblioteca.queries.listCategorias"],
    componentes: ["LivroCard", "PermissionGate", "ModuloGuard"],
    notas: ["Permissao: biblioteca:read/create", "Busca com debounce, filtro por categoria"],
  },
  "/biblioteca/[id]": {
    nome: "Detalhe do Livro",
    pagina: "app/(ready)/biblioteca/[id]/page.tsx",
    arquivos: ["app/(ready)/biblioteca/[id]/page.tsx"],
    queries: ["biblioteca.queries.getById", "biblioteca.queries.listEmprestimos"],
    mutations: ["biblioteca.mutations.devolver", "biblioteca.mutations.addExemplar"],
    notas: ["Exemplares com status", "Emprestimos ativos com botao devolver"],
  },
  "/turmas": {
    nome: "Turmas",
    pagina: "app/(ready)/turmas/page.tsx",
    arquivos: [
      "app/(ready)/turmas/page.tsx",
      "features/turmas/components/TurmaCard.tsx",
      "features/turmas/components/TurmaFormDialog.tsx",
    ],
    queries: ["turmas.queries.listTurmas"],
    mutations: ["turmas.mutations.create"],
    componentes: ["TurmaCard", "TurmaFormDialog", "PermissionGate", "ModuloGuard"],
    notas: ["Permissao: turmas:read/create", "Filtro por status via tabs"],
  },
  "/turmas/[id]": {
    nome: "Detalhe da Turma",
    pagina: "app/(ready)/turmas/[id]/page.tsx",
    arquivos: ["app/(ready)/turmas/[id]/page.tsx"],
    queries: ["turmas.queries.getById", "turmas.queries.listInscricoes", "turmas.queries.listEncontros"],
    mutations: ["turmas.mutations.updateStatus", "turmas.mutations.cancelarInscricao"],
    notas: ["Tabs: Inscricoes, Presenca", "Link de inscricao copiavel"],
  },
  "/tarefas": {
    nome: "Tarefas",
    pagina: "app/(ready)/tarefas/page.tsx",
    arquivos: [
      "app/(ready)/tarefas/page.tsx",
      "features/tarefas/components/TarefaCard.tsx",
      "features/tarefas/components/TarefaForm.tsx",
    ],
    queries: ["tarefas.queries.list"],
    mutations: ["tarefas.mutations.create"],
    componentes: ["TarefaCard", "TarefaForm", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: tarefas:read/create/update/delete",
      "3 tabs: Minhas, Criadas por mim, Todas (se tarefas:read)",
      "Filtro por status",
    ],
  },
  "/tarefas/[id]": {
    nome: "Detalhe da Tarefa",
    pagina: "app/(ready)/tarefas/[id]/page.tsx",
    arquivos: [
      "app/(ready)/tarefas/[id]/page.tsx",
      "features/tarefas/components/TarefaForm.tsx",
      "shared/components/ComentariosThread.tsx",
    ],
    queries: ["tarefas.queries.getById"],
    mutations: ["tarefas.mutations.updateStatus", "tarefas.mutations.update", "tarefas.mutations.remove"],
    componentes: ["TarefaForm", "ComentariosThread", "ModuloGuard"],
    notas: [
      "Owner/responsavel pode mudar status",
      "Comentarios unificados com threading",
    ],
  },
  "/signin": {
    nome: "Login",
    pagina: "app/(auth)/signin/page.tsx",
    arquivos: ["app/(auth)/signin/page.tsx", "convex/auth/phoneOTP.ts"],
    mutations: ["audit.mutations.logLogin"],
    notas: ["WhatsApp OTP (bypass em dev)", "Valida status do membro no login"],
  },
};

function resolveRoute(pathname: string): PageContext | null {
  // Exact match
  if (CONTEXT_MAP[pathname]) return CONTEXT_MAP[pathname];

  // /gravacoes/[id]/admin
  if (/^\/gravacoes\/[^/]+\/admin$/.test(pathname)) return CONTEXT_MAP["/gravacoes/[id]/admin"];
  // /gravacoes/[id]
  if (/^\/gravacoes\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/gravacoes/[id]"];
  // /louvor/[id]
  if (/^\/louvor\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/louvor/[id]"];
  // /ministerios/[id]
  if (/^\/ministerios\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/ministerios/[id]"];
  // /membros/[id]
  if (/^\/membros\/[^/]+$/.test(pathname) && pathname !== "/membros/novo") return CONTEXT_MAP["/membros/[id]"];
  // /biblioteca/[id]
  if (/^\/biblioteca\/[^/]+$/.test(pathname) && pathname !== "/biblioteca/novo") return CONTEXT_MAP["/biblioteca/[id]"];
  // /turmas/[id]
  if (/^\/turmas\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/turmas/[id]"];
  // /tarefas/[id]
  if (/^\/tarefas\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/tarefas/[id]"];
  // /convite/[token]
  if (/^\/convite\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/signin"];

  return null;
}

function buildMarkdown(pathname: string, ctx: PageContext): string {
  const lines: string[] = [
    `## Contexto: ${ctx.nome}`,
    "",
    `**Rota**: \`${pathname}\``,
    `**Pagina**: \`${ctx.pagina}\``,
    "",
  ];

  if (ctx.arquivos.length > 0) {
    lines.push("### Arquivos relacionados");
    for (const a of ctx.arquivos) lines.push(`- \`${a}\``);
    lines.push("");
  }

  if (ctx.queries && ctx.queries.length > 0) {
    lines.push("### Queries");
    for (const q of ctx.queries) lines.push(`- \`api.${q}\``);
    lines.push("");
  }

  if (ctx.mutations && ctx.mutations.length > 0) {
    lines.push("### Mutations");
    for (const m of ctx.mutations) lines.push(`- \`api.${m}\``);
    lines.push("");
  }

  if (ctx.componentes && ctx.componentes.length > 0) {
    lines.push("### Componentes");
    for (const c of ctx.componentes) lines.push(`- ${c}`);
    lines.push("");
  }

  if (ctx.notas && ctx.notas.length > 0) {
    lines.push("### Notas");
    for (const n of ctx.notas) lines.push(`- ${n}`);
    lines.push("");
  }

  if (ctx.doc) {
    lines.push("### Documentacao detalhada");
    lines.push(`- \`${ctx.doc}\``);
    lines.push("");
  }

  lines.push("### Arquivos globais uteis");
  lines.push("- `convex/schema.ts` — Schema completo");
  lines.push("- `convex/preferencias/rbac.ts` — RBAC e permissoes");
  lines.push("- `types/auth.ts` — Tipos de permissao");
  lines.push("- `shared/components/layout/AppSidebar.tsx` — Sidebar/navegacao");
  lines.push("- `CLAUDE.md` — Instrucoes do projeto");

  return lines.join("\n");
}

export function DevContext() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const ctx = resolveRoute(pathname);

  const markdown = ctx
    ? buildMarkdown(pathname, ctx)
    : `## Contexto\n\n**Rota**: \`${pathname}\`\n\nPagina sem mapeamento de contexto.`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  if (!isAdmin) return null;

  return (
    <>
      <div
        className="fixed bottom-3 right-3 w-4 h-4 z-50 cursor-pointer opacity-0 hover:opacity-10"
        onDoubleClick={() => setOpen(true)}
        title=""
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-medium">Contexto da Pagina</DialogTitle>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">
            {markdown}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
