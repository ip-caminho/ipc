# Acesso via Magic Link (ativação de membros existentes)

## Escopo
Liberar acesso de login sem WhatsApp. Admin escolhe um membro **já cadastrado** e gera um magic link; a pessoa abre o link, confirma os dados, define uma senha e passa a acessar. Re-login por senha (ou novo magic link sob demanda).

## Modelo de acesso (decisões fechadas)
- **Não** é auto-cadastro anônimo: membros já existem na base, falta dar acesso.
- Admin **inicia** (escolhe membro → gera link). Controle total do admin = a "aprovação" é o próprio ato de gerar o link.
- Magic link é a **porta de entrada**; a pessoa cria uma **senha** para acessos futuros.
- **Sem dependência de WhatsApp.** Entrega do link: admin copia e repassa (igual ao convite atual). Envio automático por e-mail fica fora do escopo inicial.

## Fluxo
1. **Admin** (lista de membros): botão "Gerar acesso" em um membro → cria token vinculado ao `membroId` → mostra link copiável (`/ativar/<token>`).
2. **Pessoa** abre `/ativar/<token>`:
   - Valida token (válido / expirado / já usado).
   - Mostra dados atuais do membro pré-preenchidos para **confirmar/editar**.
   - Pede **identificador de login** (e-mail; se não houver, CPF) + **senha** + confirmação.
   - Submit: `signIn("password", { flow: "signUp", email, password })` (client) → cria `user` → mutation `linkExistingMembro({ token })` vincula `userId` ao membro existente, atualiza `entidade` com dados confirmados e marca convite `ACEITO`.
3. **Re-login** (`/signin`): nova aba "Entrar com senha" (e-mail/CPF + senha) ao lado do WhatsApp atual. Magic link novo só sob demanda (admin regenera).

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `membroConvites` | Adicionar `membroId: v.optional(v.id("membros"))` — vincular a membro existente em vez de criar novo |
| `entidades` | Sem mudança de schema (apenas patch de dados na ativação) |
| `membros` | Sem mudança de schema (apenas patch de `userId`) |

## Permissões
- **Gerar link**: admin / secretaria (`membros:write` ou equivalente). Confirmar permissão exata em `convex/preferencias/rbac.ts`.
- **Abrir `/ativar/<token>`**: público (não autenticado), protegido pelo token.
- **Ver UI do botão**: PermissionGate na lista de membros.

## Impacto em Shared
- [x] `convex/schema.ts` — **SENSÍVEL** (todos os módulos). Mudança aditiva (campo opcional), baixo risco.
- [x] `convex/auth/auth.ts` — leitura apenas; `Password` provider já registrado (linha 10). **Sem mudança.**
- [ ] `shared/components/layout/DevContext.tsx` — atualizar com a nova página `/ativar`.

## Riscos
- **Identificador único do Password provider**: precisa de e-mail único por conta. Membro sem e-mail → usar `{cpf}@membro.ipc` (ou telefone) como identificador interno. Definir convenção e checar colisão.
- **Auto-link existente** (`convex/membros/autoLink.ts`) é por telefone (fluxo WhatsApp). Aqui o vínculo é explícito (token → membroId), não conflita, mas revisar para não duplicar `userId`.
- **Validade do token**: hoje 24h. Como é porta de entrada, avaliar validade maior (ex: 7 dias) e/ou regeneração fácil pelo admin.
- **Status do membro**: bloquear ativação se `entidade.status !== "ATIVO"` (TRANSFERIDO/DESLIGADO/FALECIDO).
- **Reuso do token**: uso único (marcar `ACEITO` ao concluir).
- **Segurança da senha**: política mínima (tamanho) no Zod; sem regra de senha previsível.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | `membroConvites.membroId` opcional + índice `by_membro` se necessário |
| `convex/membros/convites.ts` | Modificar | `generateInvite` aceita `membroId` (membro existente); novo `linkExistingMembro({ token })` que vincula `userId` + atualiza entidade + marca ACEITO; `getByToken` retorna dados do membro para pré-preencher |
| `app/(auth)/ativar/[token]/page.tsx` | Criar | Página pública: valida token, confirma dados, define senha, dispara signUp + linkExistingMembro |
| `features/membros/components/*` | Modificar | Botão "Gerar acesso" na lista/detalhe do membro + dialog com link copiável |
| `app/(auth)/signin/page.tsx` | Modificar | Aba/opção "Entrar com senha" (e-mail/CPF + senha) além do WhatsApp |
| `convex/audit/mutations.ts` | Modificar | `logLogin({ method: "password" })` e log de geração de acesso |
| `shared/components/layout/DevContext.tsx` | Modificar | Registrar página `/ativar/[token]` |

## Ordem de Implementação
1. `schema.ts`: campo `membroId` em `membroConvites` (sensível — fazer isolado primeiro).
2. Backend convites: `generateInvite(membroId)`, `getByToken` (com dados do membro), `linkExistingMembro`.
3. Página `/ativar/[token]` (confirmar dados + senha + signUp + link).
4. UI admin: botão "Gerar acesso" + dialog de link.
5. Signin: opção "Entrar com senha".
6. Audit + DevContext.
7. Testes (Vitest) para `linkExistingMembro` e validação de token.

## Decisões fechadas (implementadas)
1. **Identificador de login**: derivado do **telefone** (`loginIdFromPhone` → `<digitos>@membro.local`). O CPF (5 primeiros dígitos) é usado só como senha de verificação no primeiro acesso direto.
2. **Validade do token**: 7 dias (link admin); 30 min (primeiro acesso direto).
3. **"Esqueci a senha"**: fora do MVP — admin gera novo link.
4. **Entrega do link**: copiar/colar + botão `wa.me` (sem e-mail automático).
5. **Login direto em paralelo**: telefone + 5 primeiros dígitos do CPF → gera token → mesma página `/ativar`. Libera qualquer membro ATIVO existente (sem aprovação prévia); 1º acesso força criar senha + confirmar dados (wizard).

## Fase 2 (solicitado, fazer depois)
Painel de status/acompanhamento de acesso por membro:
- Status por membro: já acessou? trocou senha? entrou via link mágico vs direto?
- Histórico de acesso e atividade na plataforma (o que fez).
- Envio do link via `wa.me` com mensagem pré-formatada (parcial: já implementado no dialog de gerar link).
- Relatório básico dessa visão (quantos ativaram, pendentes, etc).
- Sugestão de schema: campos em `membros` (`ativadoEm`, `metodoAtivacao`, `ultimoAcessoEm`) gravados em `concluirAtivacao` e no login — habilita o relatório sem migração retroativa.
