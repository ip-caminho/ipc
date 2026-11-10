# Turmas: abas estouram a largura no celular

Issue: #342

## Escopo
Em `/turmas`, a 390px, as quatro abas de status empurram a página e criam rolagem horizontal. A barra de abas passa a rolar dentro de si mesma.

## Causa
`app/(ready)/turmas/page.tsx:40`: `<TabsList>` sem largura limitada nem `overflow`.

## Mudança
Aplicar no `TabsList` o padrão já usado em `features/pequenosGrupos/components/PGDetalhe.tsx:210`:
`className="w-full justify-start overflow-x-auto scrollbar-none"`.

Se com isso o desktop mudar de aparência (barra esticada), restringir ao mobile com prefixos `md:` para manter o desktop como está.

## Modelos Afetados
Nenhum.

## Permissões
Sem mudança.

## Impacto em Shared
- [ ] Não toca arquivos sensíveis. Não alterar `shared/components/ui/tabs.tsx`.

## Arquivos
| Arquivo | Ação |
|---|---|
| `app/(ready)/turmas/page.tsx` | modificar |

Sem mudança de queries, mutations ou componentes da página, então o `CONTEXT_MAP` do `DevContext.tsx` não muda.

## Verificação
- A 360px e 390px: `document.documentElement.scrollWidth === clientWidth` em `/turmas`.
- As quatro abas alcançáveis rolando a barra.
- `npx eslint "app/(ready)/turmas/page.tsx"` sem erros.

## Fora do escopo
- Botão "Nova Turma", cartões de turma, demais telas de turmas.
