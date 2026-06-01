# Acesso — Painel de Acompanhamento (Fase 2)

## Escopo
Painel para acompanhar o acesso dos membros: quem já ativou, por qual método (link mágico vs telefone+CPF), último acesso, histórico de atividade (logins + ações principais) e um relatório-resumo. Continuação da Fase 1 (acesso via magic link, já no main).

## Decisões fechadas
- **Atividade registrada**: acessos (logins) + **ações principais** (eventos de escrita já em `auditLogs`). Sem rastreamento de navegação/cliques (sem nova infra client-side).
- **Local**: nova aba na lista de membros (switch de view "Cadastro" / "Acesso" no topo de `/membros`).

## Dados já disponíveis (Fase 1)
- `membros.userId` presente = acesso ativado.
- `membros.onboardingCompleto` = confirmou dados.
- `membroConvites.origem` ("link" | "direto") = método de ativação.
- `auditLogs` com `action:"LOGIN"`, `to: method`, `membroId`, `createdAt` = histórico de login.
- `getStatusAcesso({membroId})` (criado na Fase 1) já devolve ativado/onboarding/temLinkPendente.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `auditLogs` | **Adicionar índice `by_membro` (["membroId", "createdAt"])** — hoje não há índice por membro; necessário para histórico eficiente por pessoa |
| `membros` | (opcional) nenhum campo novo — status derivado de `userId`/`auditLogs`/`membroConvites`. Evita migração retroativa |

## Permissões
- Painel/relatório: `membros:read` (ver) + `membros:update` (gerar/enviar link).
- Histórico de atividade: `audit:read` (já existe) ou `membros:read` — definir (ver perguntas).

## Impacto em Shared
- [x] `convex/schema.ts` — **SENSÍVEL**. Apenas índice novo em `auditLogs` (aditivo, baixo risco).
- [ ] `shared/components/layout/DevContext.tsx` — atualizar entrada de `/membros` (nova view + queries).

## Funcionalidades
1. **Tabela de status de acesso** (aba "Acesso"): por membro — nome, status (ativado / sem acesso / link pendente), método de ativação, último acesso. Filtros: ativados / pendentes / sem link.
2. **Resumo (relatório básico)**: cards no topo — total de membros, ativados, pendentes (com link válido), sem acesso. Percentual de adesão.
3. **Histórico de atividade por membro**: drawer/dialog a partir da linha → últimos N eventos (`auditLogs` do membro): logins (com método) + ações de escrita relevantes (editou perfil, criou gravação, etc).
4. **Envio via wa.me**: reusar Fase 1 por linha (gerar link + enviar). Ação em lote: gerar links para os pendentes selecionados e listar mensagens copiáveis (sem abrir N abas).

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | índice `by_membro` em `auditLogs` |
| `convex/membros/acesso.ts` | Modificar | `getAcessosOverview` (lista status + contagens) e `getAtividadeMembro({membroId})` (histórico) |
| `convex/audit/queries.ts` | (talvez) Modificar | helper de leitura por membro reusando `by_membro` |
| `app/(ready)/membros/page.tsx` | Modificar | switch de view Cadastro/Acesso |
| `features/membros/components/AcessoPanel.tsx` | Criar | tabela de status + cards de resumo + ações |
| `features/membros/components/AtividadeMembroDrawer.tsx` | Criar | histórico de atividade do membro |
| `shared/components/layout/DevContext.tsx` | Modificar | atualizar `/membros` |

## Ordem de Implementação
1. `schema.ts`: índice `by_membro` em `auditLogs`.
2. Backend: `getAcessosOverview` + `getAtividadeMembro`.
3. Frontend: switch de view + `AcessoPanel` (tabela + resumo).
4. `AtividadeMembroDrawer` (histórico).
5. Envio em lote wa.me.
6. DevContext + testes (Vitest) para as novas queries.

## Riscos
- `auditLogs.list` atual faz `collect()` de tudo e filtra em memória — não escala. As novas queries devem usar o índice `by_membro`; o overview deve evitar varredura total (paginar ou agregar com cuidado).
- "Trocou senha" não tem evento próprio (Fase 1 cria senha na ativação; "esqueci senha" ficou fora). Por ora, "ativou" ≈ "criou senha". Se quiser distinguir trocas futuras, exige evento dedicado.
- Mapear quais `action` dos `auditLogs` contam como "ação principal" (evitar ruído de logs internos).

## Perguntas em aberto
1. **Permissão do histórico**: `audit:read` (mais restrito) ou `membros:read`?
2. **"Ações principais"**: quais `action` incluir no histórico (LOGIN + create/update de membro/gravação)? Definir allowlist.
3. **Envio em lote**: lista de mensagens copiáveis é suficiente, ou precisa integração real de disparo (fora do escopo por exigir API de WhatsApp)?
