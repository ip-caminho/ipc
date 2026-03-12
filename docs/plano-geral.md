# IPC - Sistema de Gestão para Igreja Presbiteriana (ChMS)

## Contexto

Projeto **IPC** — Church Management System para a Igreja Presbiteriana. Reutiliza a stack do `tiago-valente-crm` (Next.js 15, Convex, shadcn/ui) adaptada para o domínio eclesiástico.

### Decisões tomadas
- **Hierarquia**: Sem hierarquia de roles — permissões independentes por role
- **Mobile (Expo)**: Web-first. Mobile após Fase 4+
- **WhatsApp API**: Interface abstrata (provider pattern). Bypass mode no início
- **Escopo inicial**: Fase 1 (MVP) primeiro
- **Entidade base**: Polimórfico PF/PJ com `papeis[]` (padrão CRM)
- **Atividades**: Tabela unificada eventos + cursos, diferenciados por tipo
- **Liturgia**: Momentos configuráveis pela igreja

### Decisões técnicas pós-revisão crítica
- **RBAC progressivo**: Fase 1 com 3 roles (`admin`, `membro`, `secretaria`). Demais roles adicionados com as features
- **Infra simplificada**: Convex file storage nativo (sem Backblaze queue). Convex `filter()` (sem Typesense). Adicionar quando escala exigir
- **Criação atômica**: Entidade + membro em uma única mutation
- **Bypass mode seguro**: Hardcoded `NODE_ENV !== 'production'`
- **Audit de dados sensíveis**: CPF/RG mascarados nos logs
- **Verificação de status**: Membro TRANSFERIDO/DESLIGADO/INATIVO bloqueado no login

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend Web | Next.js 15 (App Router), React 19, TypeScript |
| UI | shadcn/ui, Radix UI, Tailwind CSS 4, Lucide icons |
| Forms | React Hook Form + Zod 4 |
| State | nuqs (URL), useState (local) |
| Tabelas | TanStack Table v8 |
| Backend | Convex (real-time serverless) |
| Auth | Convex Auth + WhatsApp OTP |
| Files | Convex file storage (nativo) — migrar para Backblaze B2 se necessário |
| Search | Convex `filter()` nativo — adicionar Typesense quando escala exigir |
| Mobile | Expo (React Native) — **futuro, após Fase 4+** |
| Testes | Vitest |
| Deploy | Vercel (web) + Convex Cloud (backend) |

---

## FASE 1 — MVP (Fundação)

**Objetivo**: Auth + Membros + RBAC + Self-service + Diretório + Gravações

### 1.1 Setup do Projeto
Next.js 15, Convex, shadcn/ui, Tailwind 4, path aliases, CLAUDE.md

### 1.2 Autenticação com Provider Abstrato
- Interface abstrata `IMessagingProvider` + `BypassProvider` (dev) + placeholder `WhatsAppProvider`
- Bypass mode: **hardcoded** `NODE_ENV !== 'production'`
- Middleware: session timeouts (30min desktop, 12h mobile) + verifica `membro.status === ATIVO`

### 1.3 Schema Core

```
entidades        — Polimórfica PF/PJ com papeis[] (MEMBRO, VISITANTE, CONTATO, FORNECEDOR, IGREJA_PARCEIRA)
                   PF: nomeCompleto, cpf, rg, dataNascimento, sexo, estadoCivil, nacionalidade,
                       naturalidade{cidade,estado,pais}, pai, mae, profissao, formacao, foto
                   PJ: nomeRazaoSocial, nomeFantasia, cnpj, inscricaoEstadual, responsavelNome
                   Compartilhado: whatsapp (principal/auth), telefone (secundário), email, endereco{}
                   Status: ATIVO, INATIVO, TRANSFERIDO, FALECIDO, DESLIGADO

membros          — Extensão auth (entidadeId, userId, role, permissions[])
                   rol, dataMembresia, formaAdmissao, cargoEclesiastico
                   dataConversao, dataBatismo, igrejaProcedencia
                   conjugeId, filhos[]

gravacoes        — titulo, tipo, pregadorId/Nome, data, resumo, textoBase
                   audioUrl, videoUrl, materiaisComplementares[], tags[], status

membroConvites, auditLogs, rolePermissions, preferencias, sysNotifications
```

### 1.4 RBAC (progressivo)

**Fase 1** (3 roles):
| Role | Escopo |
|------|--------|
| `membro` | Self-service, diretório, gravações (leitura) |
| `secretaria` | Cadastro membros/entidades, gravações (escrita) |
| `admin` | Tudo (`*`) |

**Roles futuros**: `lider` (Fase 3), `pastor` (Fase 2), `diacono`/`presbitero` (Fase 6), `tesoureiro` (Fase 7)

Sem herança. Role ≠ cargo eclesiástico (`cargoEclesiastico` é campo separado).

### 1.5 Cadastro de Entidades & Membros
- Criação **atômica** (entidade PF + membro na mesma mutation)
- Self-service com **ownership check** no backend (`membro.userId === ctx.auth.userId`)
- Formulário dinâmico por papel

### 1.6 Diretório & Aniversariantes
### 1.7 Auditoria (com mascaramento CPF/RG)
### 1.8 Layout Base (Sidebar, Header, Providers)
### 1.9 Sistema de Convites
### 1.10 Gravações (lista, formulário, player áudio/vídeo)

---

## FASE 2 — Comunicação, Cultos & Conteúdo

1. **Cultos/Liturgia**: momentos configuráveis, responsáveis, passagens bíblicas, boletim dominical automático
2. **Pedidos de oração**: público/privado
3. **Publicações**: notícias, devocionais
4. **Músicas**: banco com letras/cifras
5. **Avisos**: com expiração

```
cultoMomentosTipo  — Tipos configuráveis (campos: temResponsavel, temPassagemBiblica, temMusicas...)
cultos             — data, tipo, status, gravacaoId
cultoMomentos      — cultoId, momentoTipoId, ordem, responsável(is), passagem, tema, músicas
cultoAvisos        — cultoId, texto, ordem
pedidosOracao, publicacoes, musicas
```

Boletim = view dinâmica (web + PDF)

---

## FASE 3 — Grupos & Ministérios
Ministérios, PGs (PEQUENO_GRUPO com dia/horário/endereço), departamentos. Dashboard do líder.
Tabelas: `grupos`, `grupoMembros`

## FASE 4 — Escalas & Agendamento
Engine genérico, disponibilidade, sugestão inteligente, confirmação WhatsApp.
Tabelas: `escalas`, `escalaItens`, `disponibilidades`

## FASE 5 — Atividades (Eventos + Cursos) & Educação
Tabela unificada `atividades` por tipo. Inscrições, anotações pastorais (cursos), materiais.
Tabelas: `atividades`, `atividadeParticipantes`

## FASE 6 — Pastoreio
Follow-up, comentários privados, timeline, alertas.
Tabelas: `pastoreio`, `comentariosMembro`

## FASE 7 — Financeiro & Documentos
Dízimos/ofertas, contas, relatórios, documentos, workspace interno.
Tabelas: `finContasIgreja`, `finLancamentos`, `documentosIgreja`

## FASE 8 — Mobile (Expo) — futuro

---

## Verificação (Fase 1)

- [ ] Login via WhatsApp OTP funciona
- [ ] Bypass mode funciona em dev e **não funciona** em production
- [ ] Membro TRANSFERIDO/DESLIGADO não consegue logar
- [ ] Criar membro completo (criação atômica entidade+membro)
- [ ] Self-service: edita **apenas** seus próprios dados (ownership check backend)
- [ ] Self-service: **não consegue** editar outro membro via mutation direta
- [ ] Diretório pesquisável + aniversariantes do mês
- [ ] RBAC: membro ≠ secretaria ≠ admin
- [ ] PermissionGate funcional
- [ ] Audit logs com CPF/RG mascarados
- [ ] Convite: link → preenche → OTP → membro criado
- [ ] Layout responsivo com sidebar
- [ ] Gravações: criar, listar, filtrar, player
- [ ] `npm run build` sem erros
- [ ] Testes Vitest passam
