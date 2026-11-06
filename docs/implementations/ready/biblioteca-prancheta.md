# Biblioteca: prancheta no celular

## Escopo
A biblioteca é uma estante na igreja, cuidada no domingo entre o culto e o café, com controle em prancheta. Esta entrega leva a prancheta para o celular: ver quem está com qual livro, emprestar em dois campos e registrar a devolução com um toque. Fica de fora tudo que uma biblioteca completa teria (inventário, relatórios, reservas, renovação, doações).

## Decisões
- Prazo único de 4 semanas, sem escolha na hora de emprestar. Empréstimos já abertos mantêm o prazo que tinham.
- Quem não tem cadastro pode pegar livro: nome digitado e WhatsApp, os dois obrigatórios. O limite de 3 livros vale só para membros.
- O telefone digitado só aparece para quem empresta e é apagado na devolução; o nome fica no histórico do livro.
- Quem pode emprestar também pode marcar que o livro saiu da estante, e desfazer.
- A marcação encerra o empréstimo aberto daquele exemplar e tira o exemplar da consulta pública. O catálogo público fica em cache por até 1h.
- A tela de atrasados sai: a prancheta já mostra os atrasados, com lembrete pelo WhatsApp.
- Sem leitor de QR dentro do app, porque não há biblioteca instalada para isso: o campo de livro aceita o código da etiqueta digitado.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `emprestimos` | `membroId` passa a ser opcional; novos `pessoaNome` e `pessoaWhatsapp` opcionais. Sem migração |
| `exemplares` | Sem mudança no schema; passa a usar o status `PERDIDO` |
| `livroEventos` | Sem mudança no schema; novos eventos de saída e retorno à estante |

## Permissões
- Prancheta, emprestar, devolver e saída da estante: `biblioteca:emprestar`.
- Editar livro: `biblioteca:update`.
- Quem só tem `biblioteca:read` continua vendo a lista de livros em `/biblioteca`.

## Impacto em Shared
- [x] Toca arquivos sensíveis: `convex/schema.ts`, `shared/components/layout/DevContext.tsx`.
- [x] Regressão a conferir: consulta pública do acervo (`convex/public/acervo.ts`).

## Riscos
- A mudança de `emprestar` deixa o formulário antigo incompatível: publicar o backend e o site em sequência, fora do domingo.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | Campos de pessoa sem cadastro |
| `convex/biblioteca/prazo.ts` | Criar | Prazo e cálculo da data, sem dependência do servidor |
| `convex/biblioteca/mutations.ts` | Modificar | Emprestar por nome, prazo, data em São Paulo, saída e retorno à estante |
| `convex/biblioteca/queries.ts` | Modificar | `listAtivos`, `buscarLivrosParaEmprestar`, `buscarPessoas`; remove consultas de atrasados |
| `convex/public/acervo.ts` | Modificar | Ignora exemplares fora da estante |
| `features/biblioteca/lib/prancheta.ts` | Criar | Tempo fora e link do lembrete |
| `features/biblioteca/components/Prancheta.tsx` | Criar | Tela da prancheta |
| `features/biblioteca/components/EmprestarForm.tsx` | Criar | Formulário de empréstimo |
| `features/biblioteca/components/LivroEditDialog.tsx` | Criar | Edição do livro |
| `app/(ready)/biblioteca/page.tsx` | Modificar | Prancheta para quem empresta; lista de livros em `?ver=livros` |
| `app/(ready)/biblioteca/emprestar/page.tsx` | Criar | Rota do formulário |
| `app/(ready)/biblioteca/[id]/page.tsx` | Modificar | Editar e saída da estante |
| `app/(ready)/biblioteca/atrasados/page.tsx` | Remover | Substituída pela prancheta |
| `features/biblioteca/components/EmprestimoForm.tsx` | Remover | Substituído por `EmprestarForm` |

## Ordem de Implementação
1. Schema, prazo e mutations, com testes.
2. Queries, com testes.
3. Telas e DevContext.
