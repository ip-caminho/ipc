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
      "features/dashboard/components/BoletimCard.tsx",
      "features/dashboard/components/UltimoSermaoCard.tsx",
      "features/dashboard/components/ProfileCompletenessCard.tsx",
      "features/dashboard/components/TodaySection.tsx",
      "features/dashboard/components/BirthdayList.tsx",
      "features/dashboard/components/SectionLabel.tsx",
      "features/dashboard/components/AniversariantesCard.tsx",
      "features/dashboard/components/ComentariosRecentesCard.tsx",
      "features/gravacoes/components/AvisosWidget.tsx",
    ],
    queries: ["gravacoes.queries.listRecentesByTipo (tipo=SERMAO, limit=1)", "gravacoes.queries.getLatestAvisos", "gravacoes.comentarios.listGravacoesComComentariosRecentes (admin)", "boletim.queries.getLiveStatus", "membros.selfService.getMyProfile", "membros.queries.birthdaysThisMonth", "pequenosGrupos.queries.meusColegasDePg", "membros.cadastroVivo.getMyCompleteness"],
    mutations: ["membros.bootstrap.bootstrapAdmin"],
    componentes: ["BoletimCard", "UltimoSermaoCard", "ComentariosRecentesCard", "ProfileCompletenessCard", "TodaySection", "BirthdayList", "SectionLabel", "AvisosWidget (drawer)", "BootstrapForm"],
    notas: [
      "Hierarquia: saudacao → ProfileCompletenessCard (condicional, progress bar) → BoletimCard → ultimo sermao → Comentarios recentes (admin) → Hoje (avisos) → aniversariantes → MinhasInscricoesCard (discreto, no rodape; so aparece com retiro ativo; features/retiro)",
      "BoletimCard: atalho para /boletim (item saiu do sidebar). Estado 'ao vivo agora' na janela do culto, senao 'proximo culto'. So com can(escalas:read)",
      "UltimoSermaoCard: link para pregacao mais recente publicada",
      "ComentariosRecentesCard: admin-only. Gravacoes com comentario recente agrupadas (titulo + count + preview do ultimo), link p/ /gravacoes/[id]. Usa denormalizado gravacoes.ultimoComentarioEm (indice by_ultimo_comentario) — custo fixo, nao varre comentarios",
      "ProfileCompletenessCard: mostra % completude do perfil + campos faltantes. Desaparece se 100% e atualizado <6m",
      "TodaySection: card Avisos abre Drawer com AvisosWidget",
      "BirthdayList: scroll horizontal, avatares com tempo relativo. Colegas do meu PG (meusColegasDePg) vem primeiro, ganham dot ambar; anel ambar + label ambar quando aniversario nos proximos 7 dias. Detalhe mostra 'Do seu PG · [nome]'",
    ],
  },
  "/admin/acesso": {
    nome: "Acesso ao Sistema",
    pagina: "app/(ready)/admin/acesso/page.tsx",
    arquivos: [
      "app/(ready)/admin/acesso/page.tsx",
      "features/membros/components/AcessoPanel.tsx",
      "features/membros/components/AtividadeMembroDrawer.tsx",
      "features/gravacoes/components/LinkConvidadoCard.tsx",
      "features/gravacoes/components/RelatorioAcessosDialog.tsx",
    ],
    queries: [
      "membros.acesso.getAcessosOverview",
      "membros.acesso.getAtividadeMembro",
      "appConfig.queries.getConvidadoToken",
      "convidado.relatorioAcessos",
    ],
    mutations: [
      "membros.acesso.gerarLink",
      "membros.acesso.resetarAcesso",
      "appConfig.mutations.gerarTokenConvidado",
      "appConfig.mutations.revogarTokenConvidado",
    ],
    componentes: ["AcessoPanel", "AtividadeMembroDrawer", "LinkConvidadoCard", "RelatorioAcessosDialog", "PermissionGate"],
    notas: [
      "Permissao: acesso:manage (admin/pastor/secretaria), tambem exigida no BACKEND (convex/membros/acesso.ts). ModuloGuard modulo=membros. Pagina dedicada de acesso ao sistema (era a aba Acesso de /membros, agora removida)",
      "AcessoPanel: resumo (com acesso/pendente/sem/adesao) + gerar links de ativacao (individual e lote) + resetar + atividade + LinkConvidadoCard (so admin: /convidado/<codigo>)",
    ],
  },
  "/membros/novo": {
    nome: "Novo Membro",
    pagina: "app/(ready)/membros/novo/page.tsx",
    arquivos: [
      "app/(ready)/membros/novo/page.tsx",
      "features/membros/components/MembroForm.tsx",
      "features/membros/lib/validations.ts",
    ],
    mutations: ["membros.mutations.create"],
    componentes: ["MembroForm", "PermissionGate"],
    notas: ["Permissao: membros:create + ModuloGuard modulo=membros. MembroForm completo (pessoal + eclesiastico); dados pessoais via mapFormToEntidadeData (features/membros/lib/mappers.ts)"],
  },
  "/membros": {
    nome: "Rol de Membros",
    pagina: "app/(ready)/membros/page.tsx",
    arquivos: [
      "app/(ready)/membros/page.tsx",
      "features/secretarioExecutivo/components/SecretarioExecutivoTabela.tsx",
      "features/secretarioExecutivo/components/HistoricoEclesiasticoDrawer.tsx",
      "features/secretarioExecutivo/components/FamiliaDrawer.tsx",
      "features/secretarioExecutivo/components/RolExportView.tsx",
    ],
    queries: ["membros.eclesiastico.listParaSecretario (assinatura unica; busca e resumo derivam no cliente)", "membros.eclesiastico.getHistorico"],
    mutations: [
      "membros.eclesiastico.updateEclesiastico",
      "membros.eclesiastico.updateStatus",
      "membros.eclesiastico.tornarMembro",
      "membros.eclesiastico.vincularConjugeAdmin",
      "membros.eclesiastico.adicionarFilhoAdmin",
      "membros.eclesiastico.vincularFilhoExistenteAdmin",
      "membros.eclesiastico.removerFilhoAdmin",
    ],
    componentes: ["SecretarioExecutivoTabela", "HistoricoEclesiasticoDrawer", "FamiliaDrawer", "CargosDrawer", "RolExportView", "PermissionGate"],
    notas: [
      "Permissao: rol:read (ver pagina/tabela), rol:update (editar — sem ela a tabela fica somente-leitura)",
      "Roles: admin, pastor, secretaria, secretario_executivo",
      "Pagina UNICA de membros (rota renomeada de /secretario-executivo em 07/2026, com redirect). ModuloGuard modulo=membros. Botao 'Novo membro' (membros:create) -> /membros/novo",
      "Edicao tabular inline (auto-save no blur): cargo, rol, tipoRol, matricula, datas sacramentais",
      "Dashboard de cards clicaveis (getResumoSecretario): comungantes/nao-comungantes/ausentes/arquivo/total/familias/dependentes/pendencias + oficiais (pastores/presbiteros/diaconos) + alertas de mandatos vencidos e a vencer em 90 dias (cargosEclesiasticosHistorico ATIVO) — filtram a tabela",
      "Impressao A4 com assinatura para assembleia (RolExportView, window.print) respeitando o filtro atual — movida de /membros pra ca",
      "Botao Cargos/mandato (CargosDrawer) por linha = registra/encerra mandato (cargosEclesiasticosHistorico) sem sair da tela. Civ. capaz derivado da idade (>=18)",
      "Coluna Nome + header fixos (sticky). Botao 'Agrupar por familia': cabecalho por familia, chefe(homem)->conjuge->filhos(mais velho primeiro)",
      "listParaSecretario inclui filhos DEPENDENTES (entidade sem membro, via responsaveis); botao 'Tornar membro' (tornarMembro) cria o registro e habilita edicao",
      "Historico (FIELD_CHANGE) com reverter; drill-down no detalhe para admissao/demissao/atos/cargos",
    ],
  },
  "/membros/[id]": {
    nome: "Detalhe do Membro (Rol)",
    pagina: "app/(ready)/membros/[id]/page.tsx",
    arquivos: [
      "app/(ready)/membros/[id]/page.tsx",
      "features/secretarioExecutivo/components/DadosBasicosSection.tsx",
      "features/secretarioExecutivo/components/EclesiasticoForm.tsx",
      "features/membros/components/MembroForm.tsx",
      "features/membros/components/AcessoSection.tsx",
      "features/membros/components/AtosPastoraisSection.tsx",
      "features/membros/components/CargosHistoricoSection.tsx",
      "features/membros/components/FamiliaArvoreSection.tsx",
      "features/membros/components/ArvoreFamiliar.tsx",
      "features/secretarioExecutivo/components/FamiliaDrawer.tsx",
    ],
    queries: ["membros.queries.getById", "membros.eclesiastico.getFamily", "membros.familia.redeFamiliar", "membros.familia.buscarEntidadesFamilia", "membros.acesso.getStatusAcesso"],
    mutations: ["membros.mutations.update", "membros.eclesiastico.updateEclesiastico", "membros.eclesiastico.marcarCampoVerificado", "membros.eclesiastico.vincularConjugeAdmin", "membros.eclesiastico.desvincularConjugeAdmin", "membros.eclesiastico.adicionarFilhoAdmin", "membros.eclesiastico.vincularFilhoExistenteAdmin", "membros.eclesiastico.removerFilhoAdmin", "membros.eclesiastico.vincularParenteAdmin", "membros.acesso.gerarLink", "membros.acesso.resetarAcesso"],
    componentes: ["DadosBasicosSection", "EclesiasticoForm", "MembroForm", "AcessoSection", "AtosPastoraisSection", "CargosHistoricoSection", "FamiliaArvoreSection", "ArvoreFamiliar", "FamiliaDrawer", "PermissionGate"],
    notas: [
      "Detalhe UNICO do membro (fold de /membros/[id]). Gate externo: rol:read + ModuloGuard modulo=membros",
      "Arvore familiar (FamiliaArvoreSection -> ArvoreFamiliar, D3): rede derivada de membros.conjugeId + tabela responsaveis via redeFamiliar (BFS). So aparece com rede > 1 pessoa",
      "Edicao de vinculos a partir da arvore (rol:update|membros:update = PERM_FAMILIA): cada no-membro tem botao lapis -> abre FamiliaDrawer daquele no (conjuge/filho/pai-mae/irmao, so vincula existentes). Irmao = compartilha os pais. Todas as mutations auditam (VINCULO_*/DESVINCULO_*)",
      "Dados pessoais: DadosBasicosSection (somente leitura) + botao 'Editar dados pessoais' (membros:update) abre Drawer com MembroForm personalOnly (so entidadeData via mapFormToEntidadeData de features/membros/lib/mappers.ts; eclesiastico fica no EclesiasticoForm; vinculoIgreja/cbcm em secao propria do personalOnly)",
      "Eclesiastico (rol:update): EclesiasticoForm (auto-save) + AtosPastoraisSection + CargosHistoricoSection",
      "Acesso per-membro (acesso:manage): AcessoSection = status + gerar magic link + resetar + wa.me",
    ],
  },
  "/entidades": {
    nome: "Entidades (Fornecedores/Parceiros + Contatos)",
    pagina: "app/(ready)/entidades/page.tsx",
    doc: "docs/modules/entidades.md",
    arquivos: [
      "app/(ready)/entidades/page.tsx",
      "features/entidades/lib/constants.ts",
    ],
    queries: ["entidades.queries.list", "entidades.queries.listNaoMembros"],
    componentes: ["Tabs", "PermissionGate"],
    notas: [
      "Permissao: entidades:read",
      "Aba 1 Fornecedores e Parceiros: PJ (query list com tipo: PJ)",
      "Aba 2 Contatos e Visitantes: PF sem linha em membros (listNaoMembros)",
      "Membros (PF com linha em membros) ficam no rol (/membros)",
    ],
  },
  "/entidades/novo": {
    nome: "Novo Fornecedor ou Parceiro",
    pagina: "app/(ready)/entidades/novo/page.tsx",
    doc: "docs/modules/entidades.md",
    arquivos: ["app/(ready)/entidades/novo/page.tsx"],
    mutations: ["entidades.mutations.create"],
    notas: [
      "Permissao: entidades:create",
      "Cria sempre PJ (tipoEntidade fixo). Papeis: FORNECEDOR, IGREJA_PARCEIRA",
    ],
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
    nome: "Ouvir (lista unificada de audios)",
    pagina: "app/(ready)/gravacoes/page.tsx",
    doc: "docs/modules/gravacoes.md",
    arquivos: [
      "app/(ready)/gravacoes/page.tsx",
      "features/gravacoes/components/AudioFilterChips.tsx",
      "features/gravacoes/components/AudioList.tsx",
      "features/gravacoes/components/AudioListItem.tsx",
      "features/gravacoes/components/BibleBookFilter.tsx",
      "features/gravacoes/lib/categoryGradient.ts",
      "features/gravacoes/lib/bible.ts",
    ],
    queries: ["gravacoes.queries.list (status=PUBLICADO, tipo?, search?)"],
    componentes: [
      "AudioFilterChips (Tudo/Pregacoes/Estudos/Palestras/Outros)",
      "BibleBookFilter (heatmap por livro biblico via textoBase)",
      "AudioList (paginacao + empty state)",
      "AudioListItem (thumbnail 56px + metadata)",
    ],
    notas: [
      "Tela unica: header breadcrumb + busca + chips de categoria + filtro livro biblico + lista vertical",
      "Removido: tela-menu de categorias coloridas e UltimaGravacaoCard (redundante com a lista)",
      "Busca com debounce 300ms, filtra titulo/pregador/textoBase/tags no servidor",
      "Filtro livro biblico e client-side (parseia textoBase via extractBookName)",
      "Pagina de 20 itens com botao 'Carregar mais'",
      "Duracao derivada de fim-inicioConteudo (generico para todos os tipos), com fallback em fim-inicioSermao para registros legacy",
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
      "features/gravacoes/components/ShareGravacaoButton.tsx",
      "features/gravacoes/hooks/useEscutaTracker.ts",
    ],
    queries: ["gravacoes.queries.getById", "gravacoes.escutas.getMyProgress", "gravacoes.share.getShareInfo"],
    mutations: ["gravacoes.mutations.update", "gravacoes.mutations.publish", "gravacoes.mutations.remove", "gravacoes.escutas.heartbeat", "gravacoes.share.gerarShareLink", "gravacoes.share.revogarShareLink"],
    componentes: [
      "useAudioPlayer (player global)",
      "DadosEditor (inline)",
      "AvisosEditor (inline)",
      "IaResultadoDisplay",
      "SegmentEditor",
      "IaProcessarButton",
      "IaProgressPanel",
      "IaStatusBadge",
      "ShareGravacaoButton",
    ],
    notas: [
      "Header com controles: status IA, processar, publicar/despublicar, excluir",
      "Tabs: Dados, Avisos, Resultado IA, Segmentos, Audio completo",
      "Edicao inline com permissao gravacoes:update ou gravacoes:process_ai",
      "Audio via player global persistente (botao Ouvir sermao / Audio completo)",
      "Botao Compartilhar (ShareGravacaoButton): so com gravacoes:share e gravacao PUBLICADO; gera link publico /g/<codigo> (revogavel)",
    ],
  },
  "/g/[token]": {
    nome: "Gravacao compartilhada (publico)",
    pagina: "app/(public)/g/[token]/page.tsx",
    arquivos: [
      "app/(public)/g/[token]/page.tsx",
      "convex/gravacoes/share.ts",
      "shared/files/components/SecureAudioPlayer.tsx",
    ],
    queries: ["gravacoes.share.getCompartilhada"],
    componentes: ["SecureAudioPlayer"],
    notas: [
      "Rota PUBLICA (sem login) — listada em isPublicRoute no middleware.ts",
      "Mostra UMA gravacao por shareToken; so PUBLICADO; revogada/rascunho -> 'Link indisponivel'",
      "Permissao de gerar/revogar: gravacoes:share (nenhum papel concede; admin via wildcard; demais via matriz)",
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
  "/admin/cadastro-vivo": {
    nome: "Cadastro Vivo",
    pagina: "app/(ready)/admin/cadastro-vivo/page.tsx",
    arquivos: [
      "app/(ready)/admin/cadastro-vivo/page.tsx",
      "features/cadastroVivo/components/VitalityStats.tsx",
      "features/cadastroVivo/components/MembrosTable.tsx",
      "convex/membros/cadastroVivo.ts",
      "convex/membros/completeness.ts",
    ],
    queries: ["membros.cadastroVivo.getRegistryVitality"],
    componentes: ["VitalityStats", "MembrosTable"],
    notas: [
      "Acesso: admin ou secretaria (membros:read)",
      "Stats: total membros, % completos, % atualizados 6m, completude media",
      "Tabela: filtro incompletos/desatualizados/todos + busca por nome",
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
  "/ausencias": {
    nome: "Ausencias",
    pagina: "app/(ready)/ausencias/page.tsx",
    arquivos: [
      "app/(ready)/ausencias/page.tsx",
      "features/ausencias/components/AvisoAusenciaDialog.tsx",
      "features/ausencias/lib/validations.ts",
      "convex/ausencias/mutations.ts",
      "convex/ausencias/queries.ts",
    ],
    queries: ["ausencias.queries.listProximas", "ausencias.queries.listPorPeriodo"],
    mutations: ["ausencias.mutations.criarAusencia", "ausencias.mutations.removerAusencia"],
    componentes: ["AvisoAusenciaDialog", "PermissionGate", "AlertDialog"],
    notas: [
      "Lideranca ('obreiro para cima', via ausencias:read/manage) avisa ausencia num intervalo de datas",
      "So o proprio registra (ownership); push para a lideranca existe (sendPushToRoles) mas esta DESLIGADO por flag (PUSH_AUSENCIA_ENABLED em ausencias/mutations.ts)",
      "Travas bidirecionais: nao marca ausencia se ja escalado; upsertEscala bloqueia escalar quem esta ausente",
      "Unifica com indisponibilidades (domingos do intervalo) — gerador de escala ja respeita",
      "Reflete tambem como tarja ambar no /calendario (CalendarioMes, prop ausencias)",
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
      "Desktop (CultosTable): container overflow-auto max-h-[calc(100vh-10rem)] com thead sticky top-0; coluna Data sticky left-0",
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
      "Permissao: avisos:create (lancar) e avisos:manage (editar/excluir). Desacoplado de escalas: obreiro lanca avisos; pastor/secretaria gerenciam",
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
      "features/pequenosGrupos/components/PGGrid.tsx",
      "features/pequenosGrupos/components/PGCard.tsx",
      "features/pequenosGrupos/components/PGForm.tsx",
      "features/pequenosGrupos/components/PGDetalhe.tsx",
      "features/pequenosGrupos/components/PGRemanejamento.tsx",
    ],
    queries: ["pequenosGrupos.queries.list", "pequenosGrupos.queries.listAllWithMembros"],
    mutations: ["pequenosGrupos.mutations.create", "pequenosGrupos.mutations.moveMembro"],
    componentes: ["PGGrid", "PGCard", "PGForm", "PGDetalhe", "PGRemanejamento", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: pequenos_grupos:read, pequenos_grupos:create, pequenos_grupos:update",
      "2 views: grid de PGs e remanejamento de membros entre grupos",
      "Um membro pode estar em varios PGs. Pool 'disponiveis' = comungantes (getTipoRol via listAllWithMembros.comungantes)",
      "PGGrid (view grid): busca nos comungantes (ordem alfabetica) + drag-and-drop de um nome para cima de um card de PG (moveMembro). DnD so com pequenos_grupos:update",
      "PGDetalhe: dialog Adicionar membro usa busca + lista alfabetica (comungantes ainda nao neste PG)",
    ],
  },
  "/pedidos-oracao": {
    nome: "Orar (mural + meus pedidos)",
    pagina: "app/(ready)/pedidos-oracao/page.tsx",
    doc: "docs/modules/pedidos-oracao.md",
    arquivos: [
      "app/(ready)/pedidos-oracao/page.tsx",
      "features/pedidosOracao/components/MuralView.tsx",
      "features/pedidosOracao/components/MyRequestsView.tsx",
      "features/pedidosOracao/components/PrayerRequestCard.tsx",
      "features/pedidosOracao/components/PrayerAvatarStack.tsx",
      "features/pedidosOracao/components/PrayerActionButton.tsx",
      "features/pedidosOracao/components/NewRequestModal.tsx",
      "features/pedidosOracao/components/UpdateTimeline.tsx",
      "features/pedidosOracao/components/AddUpdateModal.tsx",
      "app/(ready)/pedidos-oracao/[id]/page.tsx (detalhe)",
      "app/(ready)/pedidos-oracao/guiada/page.tsx (oracao guiada)",
      "features/pedidosOracao/components/GuidedPrayerDeck.tsx",
      "features/pedidosOracao/components/GuidedPrayerCard.tsx",
      "features/pedidosOracao/components/GuidedPrayerComplete.tsx",
      "features/pedidosOracao/components/PedidoOracaoDetalhe.tsx (legado, nao importado)",
      "features/pedidosOracao/components/OrarExperiencia.tsx (legado, nao importado)",
    ],
    queries: [
      "pedidosOracao.queries.listMuralRequests (visibilidade granular)",
      "pedidosOracao.queries.listMyRequests",
      "pedidosOracao.queries.getRequestDetail",
      "pedidosOracao.queries.hasUserPrayed",
    ],
    mutations: [
      "pedidosOracao.mutations.createPrayerRequest",
      "pedidosOracao.mutations.togglePrayer",
      "pedidosOracao.mutations.addUpdate (autor-only; TESTEMUNHO=RESPONDIDO)",
      "pedidosOracao.mutations.archiveRequest",
    ],
    componentes: [
      "MuralView, MyRequestsView, PrayerRequestCard, PrayerAvatarStack, PrayerActionButton, NewRequestModal",
    ],
    notas: [
      "Aba Mural = feed com visibilidade por scope (private/pg/leaders/church)",
      "Aba Meus pedidos com chips Ativos/Respondidos/Arquivados",
      "Iniciar oracao guiada = rota /pedidos-oracao/guiada com Motion: drag horizontal, stack visual, progress bar segmentada, tela final de testemunho",
      "Detalhe do pedido = rota dedicada /pedidos-oracao/[id] com UpdateTimeline; autor pode adicionar atualizacao (ATUALIZACAO/REFORCO/TESTEMUNHO — TESTEMUNHO marca como RESPONDIDO) ou arquivar",
      "Schema tem compat com compartilhadoIgreja (true=church, false=private)",
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
      "features/educacional/components/EducacionalResumo.tsx",
      "features/educacional/components/TurmaFilterChips.tsx",
      "features/educacional/components/EscalaGrade.tsx",
      "features/educacional/components/EscalaDiaForm.tsx",
      "features/educacional/components/EscalaMesGenerator.tsx",
      "features/educacional/components/MinhaEscala.tsx",
      "features/educacional/components/EducacionalPaisWidget.tsx",
      "features/educacional/components/ProximosAniversarios.tsx",
      "features/educacional/components/OvelhinhasManager.tsx",
      "features/educacional/components/VoluntariosTab.tsx",
      "features/educacional/components/VoluntarioCard.tsx",
      "features/educacional/components/VoluntarioForm.tsx",
      "features/educacional/components/RelatorioDetalhe.tsx",
      "features/educacional/components/AgendaTab.tsx",
      "features/educacional/lib/idade.ts",
      "features/educacional/lib/escala.ts",
      "features/educacional/lib/relatorioWhatsApp.ts",
    ],
    queries: [
      "educacional.queries.listCriancas",
      "educacional.queries.getCrianca",
      "educacional.queries.listRelatorios",
      "educacional.queries.listEscalas",
      "educacional.queries.dashboardPais",
      "educacional.queries.proximosAniversarios",
      "educacional.queries.listOvelhinhasAptas",
      "educacional.queries.listMembrosParaOvelhinha",
      "educacional.queries.listVoluntarios",
      "educacional.queries.listMembrosParaVoluntario",
      "educacional.queries.listAgendaEducacional",
      "educacional.queries.getRelatorio",
      "educacional.queries.sugestaoVoluntariosRelatorio",
      "educacional.queries.minhaEscala",
      "educacional.queries.voluntariosParaEscala",
    ],
    mutations: [
      "educacional.mutations.createCrianca",
      "educacional.mutations.updateCrianca",
      "educacional.mutations.removeCrianca",
      "educacional.mutations.addResponsavel",
      "educacional.mutations.removeResponsavel",
      "educacional.mutations.createRelatorio",
      "educacional.mutations.removeRelatorio",
      "educacional.mutations.createEscala",
      "educacional.mutations.upsertEscalaDia",
      "educacional.mutations.gerarEscalaMes",
      "educacional.mutations.removeEscala",
      "educacional.mutations.removeEscalaDia",
      "educacional.mutations.addOvelhinhaApta",
      "educacional.mutations.removeOvelhinhaApta",
      "educacional.mutations.createVoluntario",
      "educacional.mutations.updateVoluntario",
      "educacional.mutations.removeVoluntario",
    ],
    componentes: [
      "CriancaCard", "CriancaForm", "CriancaDetalhe",
      "RelatorioForm", "EducacionalResumo", "TurmaFilterChips",
      "EscalaGrade", "EscalaDiaForm",
      "EscalaMesGenerator", "MinhaEscala", "EducacionalPaisWidget",
      "ProximosAniversarios", "OvelhinhasManager",
      "VoluntariosTab", "VoluntarioCard", "VoluntarioForm",
      "PermissionGate", "ModuloGuard",
    ],
    notas: [
      "Permissoes (granulares por persona): criancas:read/manage/medical, educacional:read (guarda-chuva de leitura), escala_edu:manage, relatorio_edu:write (relatorio+presenca), relatorio_edu:delete, voluntarios_edu:read/manage. educacional:write DEPRECADO (migrado). Conjuntos: 'Coordenador Educacional' (tudo) e 'Professor Educacional' (criancas:read + educacional:read + relatorio_edu:write). AUTOMATICO: voluntario (eduVoluntarios) com papelEdu PROFESSOR/AUXILIAR HERDA o conjunto Professor via permissao derivada (_shared/eduVoluntarioPerms.ts, uniao no read em getUserPermissionContext + requirePermission + getAuthContext) — adicionar/remover voluntario reflete na hora, sem gravar em membro.permissions[]. APOIO nao herda",
      "7 tabs: Resumo (default), Turmas, Aniversarios, Voluntarios, Agenda, Escala, Relatorios",
      "Resumo (EducacionalResumo): tiles clicaveis (criancas+por turma, proximo domingo/lacunas via lib/escala, aniversariantes 7d, voluntarios+CAC a vencer) — tudo derivado no client de queries ja buscadas; cada tile navega p/ a aba (Tabs controladas via activeTab)",
      "Turmas: TurmaFilterChips (chips com contagem, substitui Select) + agrupamento por turma na visao 'Todas'. listCriancas busca todas; filtro/contagem no client",
      "Agenda: eventos do ministerio Educacional (proximos/historico), desacoplada de calendario:read; link p/ calendario geral",
      "Voluntarios: papel (Prof/Aux/Apoio), turmas habilitadas, CBCM, validade+certificado CAC (upload B2). Voluntario = membro",
      "Relatorio = registro de licao: numero, tema, textos-base, passagem p/ memorizar, historia, aplicacao, licao de casa, visitantes + voluntarios que serviram (do cadastro, agrupados por papel; botao 'Preencher pela escala' via sugestaoVoluntariosRelatorio). Presenca fica na tela dedicada. createRelatorio e upsert por turma+data (presenca e RelatorioForm gravam sem colidir). Clique no card abre RelatorioDetalhe. Editar (RelatorioForm pre-preenchido, turma+data travadas — sao a identidade do upsert) (relatorio_edu:write) e Excluir (removeRelatorio, cascade em eduPresencas, AlertDialog; relatorio_edu:delete) no detalhe. Compartilhar no WhatsApp (lib/relatorioWhatsApp.ts): botao no detalhe + atalho no card montam a mensagem (titulo 'Licao N — tema', data, professores, texto base, historia, aplicacao, licao de casa) e usam share nativo/wa.me. NAO inclui presenca (LGPD), obs internas nem visitantes",
      "Filtro por turma, grid de CriancaCards",
      "Click no card abre CriancaDetalhe inline",
      "Obs medicas: leitura gated por criancas:medical (LGPD) no getCrianca/listCriancas; campo no CriancaForm so aparece com criancas:medical. criancas:manage segue para cadastro/foto/ovelhinhas",
      "Escala: grade por domingo × turma (EscalaGrade + lib/escala.ts). Lacuna = turma sem professor; conflito = mesma pessoa em 2+ turmas no dia; split Próximos × Anteriores. EscalaDiaForm grava o domingo inteiro (upsertEscalaDia, uma linha por turma) só com voluntários habilitados (voluntariosParaEscala) + aviso CAC vencido (não bloqueia). EscalaMesGenerator cria domingos vazios (gerarEscalaMes). MinhaEscala mostra as próprias datas (minhaEscala). Papel normalizado PROFESSOR/AUXILIAR/APOIO (normalizePapel, tolera rows antigas). Exclusão via AlertDialog (removeEscalaDia)",
      "Dashboard widget para pais: dashboardPais()",
      "Transicao de turma derivada da idade (lib/idade.ts) — card/detalhe mostram 'muda p/ X'; nao move automatico",
      "Uso de imagem PENDENTE = 'Nao assinado' (rotulo)",
      "Ovelhinha (mentor da crianca): aptos em tabela eduOvelhinhas, geridos no OvelhinhasManager; select no CriancaForm",
    ],
  },
  "/calendario": {
    nome: "Calendario",
    pagina: "app/(ready)/calendario/page.tsx",
    doc: "docs/modules/calendario.md",
    arquivos: [
      "app/(ready)/calendario/page.tsx",
      "features/calendario/components/EventoForm.tsx",
      "shared/components/ui/date-picker-br.tsx",
      "features/calendario/components/CalendarioMes.tsx",
      "features/calendario/components/CalendarioSemana.tsx",
      "features/calendario/components/CalendarioLista.tsx",
      "features/calendario/components/CalendarioAno.tsx",
      "features/calendario/lib/feriados.ts",
      "features/calendario/lib/types.ts",
    ],
    queries: ["calendario.queries.list", "ministerios.queries.list"],
    mutations: ["calendario.mutations.create", "calendario.mutations.update", "calendario.mutations.remove"],
    componentes: ["CalendarioMes/Semana/Lista/Ano", "EventoForm", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: calendario:read/create/update/delete",
      "4 visoes: Mes (grade 7 col c/ dias da semana), Semana, Lista, Ano (12 mini-meses). Estado na URL via nuqs (?view=)",
      "Ano: clicar num mes ou dia abre a visao Mes daquele periodo (abrirMes/abrirDiaNoMes)",
      "Legenda de cores por tipo (Evento/PG/Reuniao) acima do calendario; cores em lib/types TIPO_EVENTO_COR",
      "Navegacao por mes (mes/lista), semana (semana) ou ano (ano); botao Hoje. Filtro por ministerio",
      "Feriados nacionais+SP calculados localmente (lib/feriados.ts, sem dependencia) e destacados nas 3 visoes",
      "Click num dia cria evento com a data preenchida; click num evento abre edicao",
      "EventoForm separa 'Dados do evento' de 'Publicar no site' (toggle publicadoNoSite OPT-IN, default OFF)",
      "Janela de exibicao no site (exibirNoSiteDe/exibirNoSiteAte): controla quando o evento aparece/some na agenda publica",
      "Datas em dd/mm/yyyy (DatePickerBR); botao Excluir dentro do form de edicao",
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
  "/convidado/[codigo]": {
    nome: "Convidado (publico) — Pregacoes",
    pagina: "app/(public)/convidado/[codigo]/page.tsx",
    arquivos: [
      "app/(public)/convidado/[codigo]/page.tsx",
      "app/api/convidado-acesso/route.ts",
      "convex/gravacoes/publico.ts",
      "convex/convidado.ts",
      "shared/files/components/SecureAudioPlayer.tsx",
    ],
    queries: ["gravacoes.publico.listConvidado"],
    mutations: ["convidado.registrarAcesso (via route handler /api/convidado-acesso)"],
    componentes: ["SecureAudioPlayer"],
    notas: [
      "Rota PUBLICA (sem login) — listada em isPublicRoute no middleware.ts",
      "Valida <codigo> contra configApp.convidadoToken; invalido/revogado → tela 'Link indisponivel'",
      "Lista so gravacoes PUBLICADO tipo SERMAO; player inline restrito ao trecho do sermao",
      "No carregamento, registra acesso via /api/convidado-acesso (captura IP server-side) → tabela convidadoAcessos",
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
    arquivos: [
      "app/(ready)/meu-perfil/page.tsx",
      "features/membros/components/FamiliaSection.tsx",
      "convex/membros/selfService.ts",
      "convex/membros/solicitacoes.ts",
    ],
    queries: [
      "membros.selfService.getMyProfile",
      "membros.selfService.getMyFamily",
      "membros.solicitacoes.getMinhasSolicitacoes",
    ],
    mutations: [
      "membros.selfService.updateMyProfile",
      "membros.selfService.updateMembresiaDatas",
      "membros.selfService.vincularConjuge",
      "membros.selfService.vincularFilhoExistente",
      "membros.solicitacoes.solicitarCadastroFamiliar",
    ],
    componentes: ["FamiliaSection (busca-e-vincula + solicitar cadastro)", "SectionEditButton/EditBar (edicao por secao)"],
    notas: [
      "Self-service: membro edita seus proprios dados (edicao autocontida por secao)",
      "Familia: vincula cadastrado ou solicita cadastro a secretaria (fila em /admin/solicitacoes-familia)",
    ],
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
    queries: ["turmas.queries.listTurmas", "cursos.queries.listAtivos"],
    mutations: ["turmas.mutations.create"],
    componentes: ["TurmaCard", "TurmaFormDialog", "PermissionGate", "ModuloGuard"],
    notas: [
      "Permissao: turmas:read/create",
      "Filtro por status via tabs",
      "Turma nova pode ser vinculada a um curso (gera aulas e copia frequencia minima)",
    ],
  },
  "/minhas-turmas": {
    nome: "Minhas Turmas (instrutor)",
    pagina: "app/(ready)/minhas-turmas/page.tsx",
    arquivos: [
      "app/(ready)/minhas-turmas/page.tsx",
      "features/turmas/components/MinhasTurmasCard.tsx",
    ],
    queries: ["turmas.instrutor.minhasTurmas"],
    mutations: [],
    notas: [
      "Consulta do instrutor: sem edicao, sem PermissionGate — acesso vem de ser instrutor da turma",
      "Vazia para quem nao da aula; o card do dashboard se esconde do mesmo jeito",
    ],
  },
  "/minhas-turmas/[id]": {
    nome: "Consulta da Turma (instrutor)",
    pagina: "app/(ready)/minhas-turmas/[id]/page.tsx",
    arquivos: [
      "app/(ready)/minhas-turmas/[id]/page.tsx",
      "features/turmas/components/RespostasChart.tsx",
      "convex/turmas/instrutor.ts",
    ],
    queries: ["turmas.instrutor.painel"],
    mutations: [],
    componentes: ["RespostasChart"],
    notas: [
      "Gate: instrutor da turma OU turmas:read",
      "Indicadores + contagem por opcao das perguntas de escolha + lista de inscritos",
      "Botao de WhatsApp por inscrito; respostas em Collapsible",
      "Inscricao cancelada nao aparece",
    ],
  },
  "/cursos": {
    nome: "Cursos",
    pagina: "app/(ready)/cursos/page.tsx",
    arquivos: [
      "app/(ready)/cursos/page.tsx",
      "features/turmas/components/CursoFormDialog.tsx",
      "features/turmas/lib/validations.ts",
    ],
    queries: ["cursos.queries.list"],
    mutations: ["cursos.mutations.create", "cursos.mutations.update", "cursos.mutations.setStatus"],
    componentes: ["CursoFormDialog", "PermissionGate", "ModuloGuard"],
    notas: [
      "Catalogo: ementa, carga horaria, totalAulas e frequenciaMinima (padrao 75)",
      "Permissao: turmas:read/create/update",
      "frequenciaMinima e copiada para a turma na criacao — editar o curso nao altera turma em andamento",
      "Curso INATIVO sai do select de turmas novas, historico permanece",
    ],
  },
  "/turmas/[id]": {
    nome: "Detalhe da Turma",
    pagina: "app/(ready)/turmas/[id]/page.tsx",
    arquivos: [
      "app/(ready)/turmas/[id]/page.tsx",
      "features/turmas/components/CertificadosTab.tsx",
    ],
    queries: [
      "turmas.queries.getById",
      "turmas.queries.listInscricoes",
      "turmas.queries.listEncontros",
      "turmas.queries.getPresencas",
      "turmas.certificados.painel",
    ],
    mutations: [
      "turmas.mutations.updateStatus",
      "turmas.mutations.update",
      "turmas.mutations.gerarAulas",
      "turmas.mutations.cancelarInscricao",
      "turmas.mutations.createEncontro",
      "turmas.mutations.removeEncontro",
      "turmas.mutations.salvarPresencas",
      "turmas.mutations.setFrequenciaMinima",
      "turmas.certificados.emitir",
      "turmas.certificados.emitirAptos",
      "turmas.certificados.revogar",
      "turmas.certificados.setObservacoesInstrutor",
    ],
    componentes: ["CertificadosTab", "TurmaFormDialog"],
    notas: [
      "Tabs: Inscricoes, Presenca, Certificados (esta so com turmas:manage_inscricoes)",
      "Link de inscricao copiavel; janela de inscricao (inscricoesDe/Ate) exibida",
      "Chamada pre-marcada como presente — desmarcar quem faltou",
      "Frequencia: aula sem chamada e aula anterior a inscricao ficam fora do denominador",
      "Certificado e snapshot; um ativo por inscricao (revogar para reemitir)",
      "Editar turma reusa o TurmaFormDialog (sem curso e sem campos do formulario)",
      "Turma sem aula tem botao de gerar aulas semanais em lote",
    ],
  },
  "/turmas/[id]/certificados/imprimir": {
    nome: "Impressao de Certificados",
    pagina: "app/(ready)/turmas/[id]/certificados/imprimir/page.tsx",
    arquivos: ["app/(ready)/turmas/[id]/certificados/imprimir/page.tsx"],
    queries: ["turmas.certificados.listParaImpressao"],
    mutations: [],
    notas: [
      "Impressao em lote: um certificado por pagina A4 paisagem (page-break-after)",
      "Sem PDF no backend e sem arquivo no B2 — o navegador imprime; entrega presencial",
      "Permissao: turmas:manage_inscricoes",
    ],
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
    arquivos: ["app/(auth)/signin/page.tsx", "shared/lib/acesso.ts"],
    mutations: ["audit.mutations.logLogin", "membros.acesso.verificarAcessoDireto"],
    notas: [
      "Abas: Entrar (telefone+senha) e Primeiro acesso (telefone + 5 digitos do CPF)",
      "Login por senha (provider Password); bypass em dev via NEXT_PUBLIC_AUTH_BYPASS_MODE",
      "Identificador de login derivado do telefone (loginIdFromPhone)",
    ],
  },
  "/ativar/[token]": {
    nome: "Ativar acesso (criar senha)",
    pagina: "app/(auth)/ativar/[token]/page.tsx",
    arquivos: ["app/(auth)/ativar/[token]/page.tsx"],
    queries: ["membros.acesso.getAtivacaoByToken"],
    mutations: ["membros.acesso.concluirAtivacao", "audit.mutations.logLogin"],
    notas: [
      "Destino do magic link e do primeiro acesso direto",
      "Cria senha (signUp password) e vincula userId ao membro existente",
      "Forca onboardingCompleto=false -> wizard /bem-vindo confirma dados",
    ],
  },
  "/comunidade": {
    nome: "Comunidade (hub de consumo)",
    pagina: "app/(ready)/comunidade/page.tsx",
    arquivos: [
      "app/(ready)/comunidade/page.tsx",
      "features/comunidade/components/ContinueListeningCard.tsx",
      "features/comunidade/components/RecentByTipo.tsx",
      "features/gravacoes/components/AudioListItem.tsx",
    ],
    queries: [
      "gravacoes.escutas.continuarOuvindo",
      "gravacoes.queries.listRecentesByTipo (tipo, limit) — enxuta, indice by_tipo",
    ],
    componentes: [
      "PageHeader",
      "ContinueListeningCard",
      "RecentByTipo (Pregacoes / Estudos / Palestras) + AudioListItem",
      "SectionLabel (reuso do dashboard)",
    ],
    notas: [
      "Hub de consumo: 3 secoes de gravacoes recentes por tipo (SERMAO, ESTUDO_BIBLICO, PALESTRA)",
      "Continuar ouvindo so aparece com progresso entre 5% e 95%",
      "listRecentesByTipo limita e enriquece no servidor (so pregador) p/ evitar N+1 da list generica",
      "Cada RecentByTipo so renderiza com permissao gravacoes:read e se houver itens",
    ],
  },
  "/educacional/turma/[id]": {
    nome: "Turma do Professor (Educacional)",
    pagina: "app/(ready)/educacional/turma/[id]/page.tsx",
    arquivos: [
      "app/(ready)/educacional/turma/[id]/page.tsx",
      "features/educacional/hooks/useProfessorTurmas.ts",
    ],
    queries: ["educacional.queries.listCriancas", "ministerios.queries.list", "educacional.queries.listEscalas"],
    mutations: ["educacional.mutations.createRelatorio"],
    componentes: ["useProfessorTurmas hook"],
    notas: [
      "View do professor para marcar presenca da sua turma",
      "Tap unico alterna Presente → Ausente → Pendente",
      "Botao 'Enviar relatorio' aparece fixo no bottom quando todas marcadas",
      "Acesso: professor escalado (ministerioEscalas com papel=Professor) OU relatorio_edu:write",
      "Requer relatorio_edu:write para enviar o relatorio",
    ],
  },
  "/admin/auditoria": {
    nome: "Auditoria (Admin)",
    pagina: "app/(ready)/admin/auditoria/page.tsx",
    arquivos: [
      "app/(ready)/admin/auditoria/page.tsx",
      "convex/audit/queries.ts",
    ],
    queries: ["audit.queries.listFiltered", "audit.queries.listTabelas"],
    componentes: ["PermissionGate (audit:read)", "Sheet de detalhe"],
    notas: [
      "Permissao: audit:read (admin, secretaria, pastor)",
      "Filtros via nuqs URL state: tabela, acao, de, ate",
      "Paginacao por 'Carregar mais' (limit incremental)",
      "Click na linha abre Sheet com payload completo de from/to",
      "CPF/RG ja mascarados pelo auditHelpers do _shared",
    ],
  },
  // ===== Site Publico (rotas sem auth) =====
  "/": {
    nome: "Home / Hub (publico)",
    pagina: "app/(public)/(site)/page.tsx",
    arquivos: [
      "app/(public)/(site)/page.tsx",
      "features/site-publico/components/AvisoCard.tsx",
      "features/site-publico/components/EventoLinha.tsx",
      "features/site-publico/components/InscricaoCard.tsx",
      "features/site-publico/lib/data.ts",
      "app/(public)/opengraph-image.tsx",
      "features/site-publico/lib/seo.ts",
    ],
    queries: [
      "public.avisos.listUltimoCulto (Esta semana = avisos do ultimo culto, via gravacoes.iaAvisos)",
      "public.agenda.list (Proximos eventos, slice 4 via getAgendaPublic)",
      "public.inscricoesEvento.listAtivas (Inscricoes abertas, top 3)",
      "preferencias.queries.getTextosSite (hero titulo/sub, via getTextosSitePublic + fallback)",
    ],
    notas: [
      "Hub pratico. Usa o chrome (site) compartilhado (SiteHeader/SiteFooter, identidade landing)",
      "Esta semana = avisos REALMENTE dados no culto de domingo (IA do audio), nao a tabela avisos manual. Contato/WhatsApp omitidos (LGPD)",
      "Blocos somem quando vazios. Hero (+proximo culto) + Esta semana + Atalhos",
      "Conteudo editorial antigo migrou p/ /quem-somos. JSON-LD via (public)/layout.tsx",
    ],
  },
  "/quem-somos": {
    nome: "Quem somos — editorial (publico)",
    pagina: "app/(public)/(site)/quem-somos/page.tsx",
    arquivos: [
      "app/(public)/(site)/quem-somos/page.tsx",
      "app/(public)/landing.css",
      "app/(public)/HeroFX.tsx",
      "app/(public)/RiseObserver.tsx",
      "features/site-publico/components/SiteHeader.tsx",
      "features/site-publico/components/SiteFooter.tsx",
    ],
    notas: [
      "One-pager editorial imersivo (site-v2) AGORA no chrome compartilhado (site)",
      "Estatico (revalidate 3600). Secoes: Hero/Eixos/Contraste/Cremos/Vivemos/Mundo/Educacional/Visite",
    ],
  },
  "/trajetoria": {
    nome: "Trajetoria (publico)",
    pagina: "app/(public)/(site)/trajetoria/page.tsx",
    arquivos: ["app/(public)/(site)/trajetoria/page.tsx", "content/trajetoria.mdx"],
    notas: ["MDX estatica (placeholder). Sem auth"],
  },
  "/agenda": {
    nome: "Agenda (publico)",
    pagina: "app/(public)/(site)/agenda/page.tsx",
    arquivos: [
      "app/(public)/(site)/agenda/page.tsx",
      "features/site-publico/components/AgendaClient.tsx",
      "features/site-publico/components/EventoLinha.tsx",
      "features/site-publico/lib/data.ts",
      "convex/public/agenda.ts",
    ],
    queries: ["public.agenda.list (cultos PUBLICADO + calendarioEventos futuros)"],
    notas: [
      "ISR 900s via getAgendaPublic (unstable_cache + ConvexHttpClient)",
      "Filtro por tipo via nuqs (?tipo=). Payload sem escalas/fotos",
    ],
  },
  "/visite": {
    nome: "Visite (publico)",
    pagina: "app/(public)/(site)/visite/page.tsx",
    arquivos: [
      "app/(public)/(site)/visite/page.tsx",
      "content/visite.mdx",
      "features/site-publico/components/CeiaQuote.tsx",
      "features/site-publico/lib/data.ts",
    ],
    queries: ["preferencias.queries.getIgrejaInfo (via getIgrejaInfoPublic)"],
    notas: ["MDX + dados da igreja (endereco/horario). Sem auth"],
  },
  "/privacidade": {
    nome: "Privacidade (publico)",
    pagina: "app/(public)/(site)/privacidade/page.tsx",
    arquivos: ["app/(public)/(site)/privacidade/page.tsx", "content/privacidade.mdx"],
    notas: ["Texto LGPD. Linkada pelo checkbox do form de inscricao"],
  },
  "/inscricoes": {
    nome: "Inscricoes (publico, hub)",
    pagina: "app/(public)/(site)/inscricoes/page.tsx",
    arquivos: [
      "app/(public)/(site)/inscricoes/page.tsx",
      "features/site-publico/components/InscricaoCard.tsx",
      "features/site-publico/components/RetiroCard.tsx",
      "features/site-publico/lib/data.ts",
      "convex/public/inscricoesEvento.ts",
      "convex/public/retiro.ts",
    ],
    queries: [
      "public.inscricoesEvento.listAtivas (via getInscricoesAtivas, ISR 300s)",
      "public.retiro.listAtivos (via getRetirosAtivos, ISR 300s)",
    ],
    notas: [
      "Grid combinado: RetiroCard (-> /retiro/[slug]) + InscricaoCard (-> /inscricoes/[slug]). Retiro e sistema separado (tabela retiros), listado junto das inscricoes genericas.",
    ],
  },
  "/admin/retiro": {
    nome: "Secretaria - Retiro",
    pagina: "app/(ready)/admin/retiro/page.tsx",
    arquivos: [
      "app/(ready)/admin/retiro/page.tsx",
      "features/retiro/components/RetiroConfigDialog.tsx",
      "convex/retiro/mutations.ts",
      "convex/retiro/queries.ts",
    ],
    queries: ["retiro.queries.listar", "retiro.queries.getById"],
    mutations: ["retiro.mutations.criar", "retiro.mutations.atualizar"],
    componentes: ["RetiroConfigDialog (preco por tipo de quarto + refeicoes dos extras + faixas de idade + estoque)"],
    notas: ["Permissao: inscricoes:manage. Valores em centavos no backend, R$ na UI"],
  },
  "/admin/retiro/[id]": {
    nome: "Secretaria - Inscricoes do retiro",
    pagina: "app/(ready)/admin/retiro/[id]/page.tsx",
    arquivos: [
      "app/(ready)/admin/retiro/[id]/page.tsx",
      "features/retiro/components/InscricaoDetalheDrawer.tsx",
      "convex/retiro/queries.ts",
      "convex/retiro/mutations.ts",
    ],
    queries: [
      "retiro.queries.listarInscricoes (resumo financeiro por linha)",
      "retiro.queries.getInscricao",
      "retiro.queries.sugerirMembros (matching manual)",
    ],
    mutations: [
      "retiro.mutations.confirmarMatching",
      "retiro.mutations.cancelarInscricao (devolve quartos)",
      "retiro.mutations.promoverListaEspera",
      "retiro.mutations.recalcularValor (tabela vigente, explicito)",
      "retiro.mutations.editarInscricao (recalcula com snapshot)",
      "retiro.mutations.removerComprovantePendente (apos conferir)",
    ],
    componentes: [
      "Tabela desktop -> cards mobile (regra mobile-ux)",
      "InscricaoDetalheDrawer (matching, financeiro resumido, acoes, 'Copiar link do comprovante', secao 'Divergencias de cadastro' quando o membro informou dado diferente do cadastro no submit publico)",
    ],
    notas: ["Permissao: inscricoes:manage. Financeiro: FinanceiroSection no drawer (comprovantes 'a conferir' enviados pelo pagante -> registrar/descartar, recebimentos c/ comprovante, descontos c/ saldo do fundo, sobra -> fundo, plano editavel) + FundoEventoCard (consolidado + aporte avulso)"],
  },
  "/admin/retiro/[id]/quartos": {
    nome: "Secretaria - Quartos do retiro",
    pagina: "app/(ready)/admin/retiro/[id]/quartos/page.tsx",
    arquivos: [
      "app/(ready)/admin/retiro/[id]/quartos/page.tsx",
      "features/retiro/components/QuartosBoard.tsx",
      "convex/retiro/quartos.ts",
    ],
    queries: ["retiro.quartos.listarQuartos (quartos + sem-quarto c/ preferencias)"],
    mutations: [
      "retiro.quartos.gerarQuartosDoPedido (auto a partir das inscricoes)",
      "retiro.quartos.moverOcupante (DnD; capacidade +1 de cama extra)",
      "retiro.quartos.criarQuarto / renomearQuarto / removerQuarto",
    ],
    componentes: ["QuartosBoard (dnd-kit, padrao PGGrid; coluna Sem quarto tambem e alvo de drop)"],
    notas: ["Permissao: inscricoes:manage"],
  },
  "/retiro/[slug]": {
    nome: "Retiro - inscricao publica",
    pagina: "app/(public)/retiro/[slug]/page.tsx",
    arquivos: [
      "app/(public)/retiro/[slug]/page.tsx",
      "app/(public)/retiro/layout.tsx",
      "features/retiro/components/RetiroForm.tsx",
      "features/retiro/lib/data.ts",
      "convex/public/retiro.ts",
      "convex/retiro/calculoHelpers.ts",
      "app/api/retiro/responder/route.ts",
    ],
    queries: [
      "public.retiro.getBySlug (ISR 60s via unstable_cache)",
      "public.retiro.minhaFamilia (logado: pre-preenchimento)",
    ],
    mutations: ["public.retiro.responder (via /api/retiro/responder, ipHash)"],
    componentes: [
      "RetiroForm (grupo: participantes dinamicos + resumo do valor ao vivo)",
      "CampoNumero (stepper mobile-first)",
      "LoginModalInline (reuso do site publico)",
    ],
    notas: [
      "Rota fora do grupo (site) — layout proprio (app/(public)/retiro/layout.tsx) sem SiteHeader/SiteFooter, so fontes + landing.css (mesmo padrao de /comprovante, /culto). Cobre inscricao e confirmacao (mesma rota, estado local em RetiroPagina)",
      "Inscricao POR GRUPO com calculo ao vivo (calculoHelpers compartilhado com o backend)",
      "Sem limite de vagas por estoque de quartos (sempre ATIVA); dedupe por whatsapp; honeypot + LGPD + rate-limit",
      "CPF do pagante obrigatorio (isValidCPF no form; cpfValido inline na mutation)",
      "Membro logado: minhaFamilia traz membroId por familiar; auto-vincula os participantes no responder (revalida a familia no servidor, anti-forja). Editar o nome quebra o vinculo",
      "Write-back de cadastro (so membro logado, entidades da propria familia): WhatsApp do responsavel e dataNascimento dos participantes vinculados. Campo vazio no cadastro -> preenche + audita (createFieldAuditLogs). Divergente -> nao sobrescreve, grava em inscricoesRetiro.divergenciasCadastro p/ a secretaria revisar",
      "Sucesso mostra link individual de comprovante (LinkComprovante) — /comprovante/<codigo>",
    ],
  },
  "/comprovante/[codigo]": {
    nome: "Retiro - envio de comprovante (publico)",
    pagina: "app/(public)/comprovante/[codigo]/page.tsx",
    arquivos: [
      "app/(public)/comprovante/[codigo]/page.tsx",
      "features/retiro/components/ComprovanteForm.tsx",
      "convex/public/retiro.ts",
      "convex/files/upload.ts",
    ],
    queries: ["public.retiro.getComprovanteInfo (resumo por token)"],
    mutations: [
      "public.retiro.enviarComprovante (anexa 'a conferir')",
      "files.upload.getPublicComprovanteUploadUrl (presigned, token-gated, image/pdf)",
    ],
    componentes: ["ComprovanteForm (upload sem login, suporta parcelado; recebe codigo por path)"],
    notas: [
      "Path curto /comprovante/<codigo> (token base64url ~11 chars gerado no route handler), sem login — membro ou visitante. So ANEXA; a secretaria confere o valor e registra o recebimento no drawer. Cancelada/token invalido -> null",
    ],
  },
  "/minhas-inscricoes": {
    nome: "Minhas inscricoes (membro logado)",
    pagina: "app/(ready)/minhas-inscricoes/page.tsx",
    arquivos: [
      "app/(ready)/minhas-inscricoes/page.tsx",
      "features/retiro/components/EnviarComprovanteDialog.tsx",
      "features/retiro/components/MinhasInscricoesCard.tsx",
      "convex/public/retiro.ts",
    ],
    queries: [
      "public.retiro.minhasInscricoes (retiros; traz o token do dono)",
      "public.inscricoesEvento.minhasRespostas (inscricoes genericas; index by_membro)",
      "turmas.queries.minhasInscricoes (turmas matriculadas; index by_membro)",
    ],
    mutations: [
      "public.retiro.enviarComprovante (via token da propria inscricao)",
      "files.upload.getPublicComprovanteUploadUrl (token-gated)",
    ],
    componentes: [
      "Hub de 3 secoes: Retiros (c/ comprovante), Inscricoes, Turmas",
      "EnviarComprovanteDialog (upload pelo membro sem URL — usa o token por baixo)",
      "MinhasInscricoesCard (atalho no dashboard, so aparece com retiro ativo)",
    ],
    notas: [
      "Membro comum acessa (nao exige inscricoes:manage). Retiro: via publica por token (index by_responsavel_membro). Inscricoes genericas e turmas: so leitura por membroId. Entrada no menu (MoreSheet + UserMenu) + card no dashboard",
    ],
  },
  "/inscricoes/[slug]": {
    nome: "Inscricao - formulario publico",
    pagina: "app/(public)/(site)/inscricoes/[slug]/page.tsx",
    arquivos: [
      "app/(public)/(site)/inscricoes/[slug]/page.tsx",
      "features/site-publico/components/InscricaoForm.tsx",
      "features/site-publico/components/LoginModalInline.tsx",
      "features/site-publico/lib/data.ts",
      "convex/public/inscricoesEvento.ts",
      "app/api/inscricoes/responder/route.ts",
    ],
    queries: [
      "public.inscricoesEvento.getBySlug (via getInscricaoBySlug, ISR 60s)",
      "membros.selfService.getMyProfile (se logado, pre-preenche)",
    ],
    mutations: ["public.inscricoesEvento.responder (via route handler /api/inscricoes/responder)"],
    componentes: ["InscricaoForm (RHF+Zod dinamico)", "LoginModalInline (telefone+senha)"],
    notas: [
      "Auth opcional: membro logado tem campos de sistema read-only (vazio vira editavel)",
      "Honeypot 'website' + rate limit por ipHash (5/h) + LGPD obrigatorio",
      "Submit via fetch POST /api/inscricoes/responder (captura IP -> ipHash)",
      "Sucesso inline: CONFIRMADA ou LISTA_ESPERA",
    ],
  },
  "/admin/site-publico": {
    nome: "Site publico - hub de manutencao",
    pagina: "app/(ready)/admin/site-publico/page.tsx",
    arquivos: [
      "app/(ready)/admin/site-publico/page.tsx",
      "features/site-publico/components/paineis/InformacoesPanel.tsx",
      "features/site-publico/components/paineis/AgendaPanel.tsx",
      "features/site-publico/components/paineis/AvisosPanel.tsx",
      "features/site-publico/components/paineis/TextosPanel.tsx",
    ],
    queries: [],
    mutations: [],
    componentes: [
      "Tabs (abas): Informacoes, Agenda, Avisos, Textos + 'Ver o site'",
      "Cada aba = um Panel self-fetching (Radix desmonta aba inativa = query so quando aberta)",
    ],
    notas: [
      "Permissao: site_publico:manage (admin/pastor/sec.exec por padrao; liga por membro na pagina de permissoes)",
      "Pagina unica com abas; aba ativa na URL via nuqs (?secao=). Sem navegar entre paginas",
      "As sub-rotas /informacoes|/agenda|/avisos|/textos REDIRECIONAM p/ ?secao=",
      "Inscricoes saiu do hub e virou item de Secretaria (/admin/inscricoes)",
    ],
  },
  "/admin/site-publico/informacoes": {
    nome: "Site publico - Informacoes da igreja",
    pagina: "app/(ready)/admin/site-publico/informacoes/page.tsx",
    arquivos: [
      "app/(ready)/admin/site-publico/informacoes/page.tsx",
      "features/site-publico/components/InformacoesSiteForm.tsx",
      "features/site-publico/lib/validations.ts",
      "features/site-publico/lib/igreja.ts",
      "convex/preferencias/mutations.ts",
    ],
    queries: ["preferencias.queries.getIgrejaInfo"],
    mutations: ["preferencias.mutations.updateIgrejaInfo (site_publico:manage, audita)"],
    componentes: ["InformacoesSiteForm (RHF: identidade/contato/horarios/financeiro), via InformacoesPanel"],
    notas: [
      "Rota REDIRECIONA p/ o hub (/admin/site-publico?secao=informacoes); UI real em InformacoesPanel",
      "Fonte unica das infos (igreja.* em preferencias). SiteFooter e /visite leem do banco",
      "Fallback IGREJA_DEFAULTS (features/site-publico/lib/igreja.ts) se banco vazio",
    ],
  },
  "/admin/site-publico/agenda": {
    nome: "Site publico - Agenda",
    pagina: "app/(ready)/admin/site-publico/agenda/page.tsx",
    arquivos: [
      "app/(ready)/admin/site-publico/agenda/page.tsx",
      "features/calendario/components/EventoForm.tsx",
      "shared/components/ui/date-picker-br.tsx",
      "convex/site/queries.ts",
      "convex/calendario/mutations.ts",
    ],
    queries: ["site.queries.getAgendaAdmin (cultos PUBLICADO leitura + eventos futuros editaveis)"],
    mutations: [
      "calendario.mutations.create (novo evento)",
      "calendario.mutations.update (editar evento inline)",
    ],
    componentes: ["EventoForm (reuso do modulo calendario, abre inline p/ criar e editar), via AgendaPanel"],
    notas: [
      "Rota REDIRECIONA p/ o hub (/admin/site-publico?secao=agenda); UI real em AgendaPanel",
      "Lista consolidada. Cultos sao leitura (atalho /cultos); eventos criados/editados aqui inline (calendario:create/update)",
      "Editar abre o EventoForm na propria pagina (nao redireciona p/ /calendario)",
      "EventoForm em 2 secoes: 'Dados do evento' + 'Publicar no site' (toggle publicadoNoSite OPT-IN, default OFF)",
      "Publicar OFF = evento so no calendario interno; ON = titulo+descricao vao p/ agenda publica; badge 'Oculto no site'",
      "Janela de exibicao: exibirNoSiteDe/exibirNoSiteAte (YYYY-MM-DD) controlam quando aparece no site; badge Agendado/Expirado. Filtro em public/agenda.ts",
      "Datas em dd/mm/yyyy via DatePickerBR (nao input date nativo). Botao Excluir no form (onDelete, calendario:delete)",
      "Culto de domingo 10h gerado automaticamente pelo agendador de cultos",
    ],
  },
  "/admin/site-publico/avisos": {
    nome: "Site publico - Avisos (curadoria)",
    pagina: "app/(ready)/admin/site-publico/avisos/page.tsx",
    arquivos: [
      "app/(ready)/admin/site-publico/avisos/page.tsx",
      "features/site-publico/components/AvisosCuradoria.tsx",
      "convex/site/queries.ts",
      "convex/gravacoes/mutations.ts",
    ],
    queries: ["site.queries.getGravacaoDoSite (gravacao que alimenta 'Esta semana')"],
    mutations: ["gravacoes.mutations.corrigirAvisosCulto (escopada a iaAvisos, site_publico:manage)"],
    componentes: ["AvisosCuradoria (edita titulo/descricao/quando/onde; preserva contato), via AvisosPanel"],
    notas: [
      "Rota REDIRECIONA p/ o hub (/admin/site-publico?secao=avisos); UI real em AvisosPanel",
      "Avisos do site = iaAvisos do ultimo culto (IA). Curadoria so corrige a transcricao",
      "Tabela 'avisos' (/avisos) e pauta interna, NAO alimenta o site",
    ],
  },
  "/admin/site-publico/textos": {
    nome: "Site publico - Textos",
    pagina: "app/(ready)/admin/site-publico/textos/page.tsx",
    arquivos: [
      "app/(ready)/admin/site-publico/textos/page.tsx",
      "features/site-publico/components/TextosSiteForm.tsx",
      "convex/preferencias/mutations.ts",
      "convex/preferencias/queries.ts",
    ],
    queries: ["preferencias.queries.getTextosSite (chaves site.*)"],
    mutations: ["preferencias.mutations.updateTextosSite (site_publico:manage, audita)"],
    componentes: ["TextosSiteForm (heroTitulo, heroSub), via TextosPanel"],
    notas: [
      "Rota REDIRECIONA p/ o hub (/admin/site-publico?secao=textos); UI real em TextosPanel",
      "Textos do hero da home (site.*). Home le com fallback SITE_TEXTOS_DEFAULTS",
      "Editorial denso (quem-somos) fica em MDX, nao aqui",
    ],
  },
  "/admin/solicitacoes-familia": {
    nome: "Secretaria - Solicitacoes de cadastro",
    pagina: "app/(ready)/admin/solicitacoes-familia/page.tsx",
    arquivos: [
      "app/(ready)/admin/solicitacoes-familia/page.tsx",
      "features/membros/components/SolicitacoesPanel.tsx",
      "convex/membros/solicitacoes.ts",
      "convex/membros/familiaHelpers.ts",
    ],
    queries: ["membros.solicitacoes.listSolicitacoes"],
    mutations: [
      "membros.solicitacoes.aprovarSolicitacao",
      "membros.solicitacoes.rejeitarSolicitacao",
    ],
    componentes: ["SolicitacoesPanel (tabela + AlertDialog rejeitar)"],
    notas: [
      "Fila de solicitacoes de familiar (filho/conjuge) vindas do self-service (/meu-perfil)",
      "Aprovar = criar entidade + vinculo (criarFilhoParaResponsavel/criarConjugeParaMembro). Permissao: membros:create. Auditado",
      "Substitui a criacao direta (adicionarFilho removido)",
    ],
  },
  "/admin/inscricoes": {
    nome: "Secretaria - Inscricoes",
    pagina: "app/(ready)/admin/inscricoes/page.tsx",
    arquivos: [
      "app/(ready)/admin/inscricoes/page.tsx",
      "features/site-publico/components/paineis/InscricoesPanel.tsx",
      "features/site-publico/components/InscricaoBuilder.tsx",
      "convex/inscricoesEvento/mutations.ts",
      "convex/inscricoesEvento/queries.ts",
    ],
    queries: ["inscricoesEvento.queries.listarTodas", "inscricoesEvento.queries.getById"],
    mutations: [
      "inscricoesEvento.mutations.criar",
      "inscricoesEvento.mutations.atualizar",
      "inscricoesEvento.mutations.encerrar",
    ],
    componentes: ["InscricoesPanel (lista + builder + AlertDialog encerrar)", "InscricaoBuilder (seletor camposSistema + editor camposCustom)"],
    notas: [
      "Item de Secretaria (saiu do hub do site). Permissao: inscricoes:manage. Auditado",
      "/admin/site-publico/inscricoes redireciona p/ ca (bookmarks antigos)",
      "Respostas de cada inscricao em /admin/inscricoes/[id]/respostas",
    ],
  },
  "/admin/inscricoes/[id]/respostas": {
    nome: "Secretaria - Respostas de inscricao",
    pagina: "app/(ready)/admin/inscricoes/[id]/respostas/page.tsx",
    arquivos: [
      "app/(ready)/admin/inscricoes/[id]/respostas/page.tsx",
      "convex/inscricoesEvento/queries.ts",
      "convex/inscricoesEvento/mutations.ts",
    ],
    queries: ["inscricoesEvento.queries.getById", "inscricoesEvento.queries.listarRespostas"],
    mutations: [
      "inscricoesEvento.mutations.moverStatusResposta (CONFIRMADA<->LISTA_ESPERA, ajusta vagasOcupadas)",
      "inscricoesEvento.mutations.excluirResposta (libera vaga se era CONFIRMADA)",
    ],
    componentes: [
      "Tabela de respostas + resumo (total/confirmadas/espera)",
      "Filtro por status + busca por nome/contato",
      "Acoes por linha (promover/rebaixar/excluir) via DropdownMenu + AlertDialog",
      "Export CSV client-side (respeita o filtro atual)",
    ],
    notas: ["Permissao: inscricoes:manage. Colunas dinamicas (camposSistema + camposCustom)"],
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
  // /membros/novo e /membros/[id] resolvem via exact match + regex abaixo
  // /ativar/[token]
  if (/^\/ativar\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/ativar/[token]"];
  // /membros/[id]
  if (/^\/membros\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/membros/[id]"];
  // /biblioteca/[id]
  if (/^\/biblioteca\/[^/]+$/.test(pathname) && pathname !== "/biblioteca/novo") return CONTEXT_MAP["/biblioteca/[id]"];
  // /minhas-turmas/[id]
  if (/^\/minhas-turmas\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/minhas-turmas/[id]"];
  // /turmas/[id]/certificados/imprimir
  if (/^\/turmas\/[^/]+\/certificados\/imprimir$/.test(pathname))
    return CONTEXT_MAP["/turmas/[id]/certificados/imprimir"];
  // /turmas/[id]
  if (/^\/turmas\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/turmas/[id]"];
  // /tarefas/[id]
  if (/^\/tarefas\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/tarefas/[id]"];
  // /convite/[token]
  if (/^\/convite\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/signin"];
  // /convidado/[codigo]
  if (/^\/convidado\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/convidado/[codigo]"];
  // /g/[token] (gravacao compartilhada)
  if (/^\/g\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/g/[token]"];
  // /educacional/turma/[id]
  if (/^\/educacional\/turma\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/educacional/turma/[id]"];
  // /inscricoes/[slug] (formulario publico)
  // /admin/retiro/[id]/quartos
  if (/^\/admin\/retiro\/[^/]+\/quartos$/.test(pathname)) return CONTEXT_MAP["/admin/retiro/[id]/quartos"];
  // /admin/retiro/[id]
  if (/^\/admin\/retiro\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/admin/retiro/[id]"];
  // /comprovante/[codigo] (envio publico de comprovante)
  if (/^\/comprovante\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/comprovante/[codigo]"];
  // /retiro/[slug]
  if (/^\/retiro\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/retiro/[slug]"];
  if (/^\/inscricoes\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/inscricoes/[slug]"];
  // /admin/inscricoes/[id]/respostas
  if (/^\/admin\/inscricoes\/[^/]+\/respostas$/.test(pathname)) {
    return CONTEXT_MAP["/admin/inscricoes/[id]/respostas"];
  }

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
