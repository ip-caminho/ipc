# Esqueci minha senha

## Escopo
Permitir que o membro defina uma nova senha pela tela de login, sem depender da secretaria e sem perder a conta, o vínculo com o membro ou o cadastro. Issue #330.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `recuperacoesSenha` | Nova — pedidos de recuperação em andamento |
| `recuperacaoTentativas` | Nova — controle de tentativas |
| `auditLogs` | Sem mudança de schema — registra a troca de senha |

## Permissões
- Página pública, protegida pela verificação de dados do cadastro.
- Disponível só para contas sem permissões além do papel `membro`. As demais seguem pelo painel de acesso.

## Impacto em Shared
- [x] `convex/schema.ts`: apenas tabelas novas.
- [x] `shared/components/layout/DevContext.tsx`: nova página.
- [ ] `convex/auth/*`: sem mudança.
- [ ] `convex/membros/acesso.ts`: sem mudança; o fluxo de ativação não é afetado.

## Riscos
- A verificação usa dados do cadastro, escolha consciente por não haver canal automático de envio.
- Quem não tem os dados no cadastro continua dependendo da secretaria.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | Tabelas novas |
| `convex/membros/recuperarSenha.ts` | Criar | Verificação e troca de senha |
| `convex/membros/__tests__/recuperarSenha.integration.test.ts` | Criar | Testes |
| `app/(auth)/esqueci-senha/page.tsx` | Criar | Tela em duas etapas |
| `app/(auth)/signin/page.tsx` | Modificar | Link para a nova tela |
| `middleware.ts` | Modificar | Rota pública |
| `shared/components/layout/DevContext.tsx` | Modificar | Registrar a página |

## Ordem de Implementação
1. Schema
2. Backend e testes
3. Tela, link e rota pública
4. DevContext
