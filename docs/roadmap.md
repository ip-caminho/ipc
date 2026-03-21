# Roadmap IPC — Church Management System

Atualizado em: 2026-03-15

---

## O que ja existe (Fase 1 — Concluida)

| Modulo | Status |
|--------|--------|
| Acesso via numero de celular (WhatsApp OTP) | Feito |
| Cadastro e gestao de membros | Feito |
| Diretorio de contatos (apelido, foto, ficha, WhatsApp) | Feito |
| Entidades (PF/PJ) | Feito |
| Gravacoes (audio, IA, transcricao, frases, avisos) | Feito |
| Pedidos de oracao (criar, compartilhar, intercessores) | Feito |
| Boletim dominical | Feito |
| Escalas e equipes (dinamicas, geracao automatica) | Feito |
| Cultos (liturgia, escala, avisos) | Feito |
| Pequenos grupos (membros, remanejamento) | Feito |
| Pastoreio (visitas, anotacoes, perfil pastoral) | Feito |
| Area do membro (Meu Perfil, self-service) | Feito |
| Aniversariantes (semana/mes, WhatsApp direto) | Feito |
| Auditoria (logs de alteracoes) | Feito |
| RBAC basico (admin, secretaria, membro) | Feito |
| Toggle de modulos (ligar/desligar sem deploy) | Feito |
| Avisos da semana (widget no dashboard) | Feito |
| Palavra do dia (frases dos sermoes) | Feito |

---

## Fase 2 — Preparacao para Producao

### 2.1 Build e Testes
- [ ] `npm run build` passando sem erros
- [ ] `npm test` passando (vitest)
- [ ] Corrigir erros TS pre-existentes (GerarEscalaDialog, useAudioCompressor)

### 2.2 WhatsApp OTP em Producao
- [ ] Configurar provider real (Twilio SMS ou WhatsApp Business API)
- [ ] A abstracao ja existe em `convex/messaging/` — so precisa de credenciais
- [ ] Testar fluxo completo de login com OTP real

### 2.3 Deploy
- [ ] Convex: criar deployment de producao (`npx convex deploy`)
- [ ] Convex: configurar env vars (Twilio, Deepgram, Anthropic, B2)
- [ ] Convex: rodar seeds (RBAC, modulos, funcoes)
- [ ] Vercel: conectar repo, configurar env vars
- [ ] Dominio custom (ex: `app.ipc.org.br`)

### 2.4 Liberacao Gradual
- [ ] Semana 1: so admin — validar com dados reais
- [ ] Semana 2: ligar modulos core (Diretorio) — convidar secretaria
- [ ] Semana 3+: ligar modulos um por um

---

## Fase 3 — RBAC e Formularios

### 3.1 Revisao Geral de RBAC
- [ ] Revisar todas as permissoes e garantir consistencia backend/frontend
- [ ] Criacao de papeis customizados (alem de admin/secretaria/membro)
- [ ] Tela admin para criar e editar papeis com permissoes
- [ ] Permissoes por modulo (vincular permissoes ao toggle de modulos)

### 3.2 Formularios e Inscricoes
- [ ] Criador de formularios dinamicos (tipo Google Forms)
- [ ] Inscricoes para eventos (formulario + lista de inscritos)
- [ ] Inscricoes facilitadas (link publico, QR code)
- [ ] Formulario de visitante (primeiro contato)

---

## Fase 4 — Ministerios (fundacao compartilhada)

Infra que serve qualquer ministerio (Educacional, Louvor, Jovens, Casais, etc.).
PRD detalhado: `docs/implementations/not-started/educacional-ipc-infantil.md`

### 4.1 Schema e Backend
- [ ] Tabela `ministerios` (nome, descricao, papeis configuraveis, subgrupos, status)
- [ ] Tabela `ministerioMembros` (vinculo N:N membro ↔ ministerio, papel, subgrupo)
- [ ] Tabela `calendarioEventos` (eventos por ministerio ou gerais)
- [ ] Permissoes RBAC: ministerios:read/manage, calendario:read/manage
- [ ] Seeds: criar ministerios iniciais (Educacional Infantil, Louvor, Som, Hospitalidade, Multimidia)

### 4.2 Telas
- [ ] `/ministerios` — lista de ministerios com badge de membros
- [ ] `/ministerios/[id]` — detalhe com membros, papeis, subgrupos, status CBCM
- [ ] `/calendario` — calendario compartilhado com filtro por ministerio
- [ ] Lider de ministerio com acesso restrito ao seu grupo

### 4.3 Compliance (voluntarios)
- [ ] Campo CBCM na entidade (status do treinamento)
- [ ] Upload de atestado de antecedentes criminais (Backblaze B2)
- [ ] Alerta visual na lista de membros do ministerio se CBCM pendente

---

## Fase 5 — Educacional Infantil (primeiro consumidor de Ministerios)

Substitui o Notion do ministerio infantil. Depende da Fase 4.
Dados atuais no Notion: 56 criancas, 36 voluntarios, ~53 aulas/turma/ano, 18 eventos/ano.

### 5.1 Criancas
- [ ] Tabela `criancaPerfil` (satelite 1:1 com entidades)
  - Turma (0-2, 3-4, 5-6, 7-8, 9-10)
  - Pais vinculados (maeId, paiId → entidades)
  - Ovelhinhas/mentor (voluntario responsavel)
  - Autorizacao de uso de imagem (LGPD: autorizado/nao assinado/nao autorizado)
  - Observacoes medicas e familiares
  - Controle de mudanca de turma (semestral)
- [ ] Tela `/criancas` — lista com filtro por turma, badges de autorizacao
- [ ] Form: dados da entidade + perfil infantil (turma, pais via busca, ovelhinhas, obs)
- [ ] Permissoes: criancas:read, criancas:manage

### 5.2 Curriculo e Planejamento de Aulas
- [ ] Tabela `eduCurriculo` (planejamento semestral por turma)
  - Turma, licao, data, tema, texto biblico, atividade
  - Professor e auxiliar designados
  - Apoio/suporte
  - Status (planejada/concluida/nao realizada)
  - Observacoes
- [ ] Tela de planejamento: visao semestral por turma (~18 aulas/semestre)
- [ ] Vincular curriculo a revista (MQV Kids, MQV Junior, etc.)

### 5.3 Relatorios de Aula
- [ ] Tabela `eduRelatorios` (preenchido apos cada aula)
  - Turma, licao, data, tema, texto biblico
  - Criancas presentes (multi-select da turma)
  - Professores que deram aula
  - Historia, aplicacao, memorizacao, licao de casa
  - Observacoes e sugestoes
  - Visitantes
- [ ] Tela `/educacional/relatorios` — tabs por turma + form + view mode
- [ ] Permissoes: educacional:relatorios:read, educacional:relatorios:write

### 5.4 Escalas do Educacional
- [ ] Escala semanal por turma: professor + auxiliar + apoio
- [ ] Integrar com sistema de escalas existente ou usar escalas do ministerio (Fase 4)
- [ ] Disponibilidade de voluntarios

### 5.5 Checklist Operacional
- [ ] Tarefas recorrentes da coordenacao (LGPD, antecedentes, materiais, lembretes)
- [ ] Status (em andamento/concluido), responsavel
- [ ] Dashboard da coordenacao com pendencias

### 5.6 Migracao de Dados do Notion
- [ ] Script: importar 56 criancas como entidades + criancaPerfil
- [ ] Script: importar 36 voluntarios como ministerioMembros
- [ ] Script: importar calendario, relatorios, escalas
- [ ] Validar dados importados com coordenacao

---

## Fase 6 — Melhorias de UX

### 6.1 Dashboard
- [ ] Widget de proximos cultos (escala do proximo domingo)
- [ ] Notificacoes do sistema (avisos novos, convites pendentes)

### 6.2 Area do Membro
- [ ] Membro editar proprio apelido (self-service)
- [ ] Upload de foto pelo proprio membro
- [ ] Devocional diario (conteudo devocional para membros)

### 6.3 Diretorio
- [ ] Busca por bairro/cidade

### 6.4 Escalas
- [ ] Notificacao de escala (lembrete X dias antes do culto)
- [ ] Confirmacao de escala pelo membro
- [ ] Sugestao automatica baseada em disponibilidade + confirmacao

### 6.5 Responsividade e Mobile
- [ ] Testar todas as telas em mobile
- [ ] Otimizar boletim pra mobile
- [ ] PWA (instalar como app no celular)

---

## Fase 7 — Outros Modulos

### 7.1 Financeiro
- [ ] Dizimos e ofertas (registro por membro)
- [ ] Recibos para membros
- [ ] Dashboard financeiro (admin)
- [ ] Relatorios financeiros (mensal, anual)

### 7.2 Eventos e Agenda
- [ ] Inscricao em eventos (com formulario dinamico)
- [ ] Planejamento de retiros e eventos especiais (atividades por horario)
- [ ] Aniversario da igreja (datas comemorativas)

### 7.3 Comunicacao
- [ ] Envio de mensagens em massa via WhatsApp (avisos, convocacoes)
- [ ] Notificacoes push (PWA)
- [ ] Atualizacoes / mural de comunicados

### 7.4 Documentos da Igreja
- [ ] Repositorio de documentos (atas, regimentos, estatutos)
- [ ] Upload e organizacao por categoria
- [ ] Controle de acesso por documento

### 7.5 Operacao Interna
- [ ] Notas e tarefas internas (estilo Notion simplificado)
- [ ] Comentarios sobre membros (observacoes internas, diferente de pastoreio)
- [ ] Kanban de tarefas para lideranca

### 7.6 Louvores
- [ ] Banco de louvores (letra, cifra, tom)
- [ ] Vincular louvores a liturgia do culto
- [ ] Historico de louvores por culto

---

## Fase 8 — Relatorios e Exportacao

- [ ] Relatorio de membresia (entradas, saidas, transferencias)
- [ ] Relatorio de frequencia nos cultos
- [ ] Relatorio de pequenos grupos (presenca, crescimento)
- [ ] Relatorio pastoral (visitas, anotacoes)
- [ ] Relatorio educacional (presenca por turma, aulas realizadas)
- [ ] Exportacao para PDF/Excel
- [ ] Importacao de dados em massa (CSV/Excel)

---

## Fase 9 — Infra e Operacao

### 9.1 Monitoramento
- [ ] Health check do backend
- [ ] Alertas de erro (Sentry ou similar)
- [ ] Metricas de uso (analytics basico)

### 9.2 Seguranca
- [ ] Backup automatico dos dados
- [ ] Politica de retencao de audit logs
- [ ] Revisao de seguranca (OWASP top 10)

### 9.3 Performance
- [ ] Lazy loading de modulos pesados (FFmpeg.wasm)
- [ ] Otimizar queries (evitar collect() + filter client-side)
- [ ] Cache de imagens/fotos (CDN)

### 9.4 Integracao
- [ ] Google Calendar (cultos e eventos)
- [ ] Expo / app nativo (se necessario, alem do PWA)

---

## Notas

- Acesso pelo numero de celular (WhatsApp OTP em dev, provider real em prod)
- Ministerios/grupos/departamentos nao sao hierarquicos
- Toggle de modulos permite ligar features sem deploy
- Equipes dos cultos sao dinamicas (admin cria na aba Equipes)
- Educacional Infantil e o primeiro ministerio a ser migrado do Notion
- Crianca = entidade (membro nao comungante ou visitante) + criancaPerfil (satelite)
- CBCM e antecedentes sao atributos da pessoa, nao do ministerio
- PRD detalhado do educacional: `docs/implementations/not-started/educacional-ipc-infantil.md`
- Dados do Notion exportados em: `docs/notion-export/`
- DevContext deve ser atualizado ao criar/modificar paginas (regra no CLAUDE.md)
- Commits concisos em portugues
