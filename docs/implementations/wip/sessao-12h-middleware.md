# Sessão de 12h: remover janela morta do middleware

Issue: #332

## Escopo
Remover do `middleware.ts` a janela de sessão própria baseada no cookie `__appSessionExpiry` (30 min no computador, 12h no celular), que é código morto. A sessão passa a ser descrita por uma única regra, já em vigor e igual no celular e no computador: 12h contadas a partir da última renovação do token, com limite total de 30 dias. Nenhum limite novo é introduzido.

Por que é código morto: o cookie é gravado com `maxAge` igual à própria janela (`middleware.ts:84-90`), então o navegador o descarta no momento em que ele venceria. A leitura volta vazia, `expiry` vira 0 e o desvio de `:42-53` só dispara numa corrida de milissegundos ao vencer a janela. A remoção elimina também esse logout raro.

Regra que permanece (não mexer):
- `convex/auth/auth.ts:9-12`: 12h desde a última renovação do token, 30 dias no total. Com a aba fechada, o corte vem entre 11h e 12h depois do último uso. Aba aberta renova sozinha, até o limite de 30 dias. Esse comportamento já existe e não muda com esta remoção.
- `middleware.ts:98`: `cookieConfig: { maxAge: 12 * 60 * 60 }`.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| Nenhuma | Sem mudança de schema, sem deploy de backend |

## Permissões
- Sem mudança. Rotas públicas, redirecionamentos e papéis continuam iguais.

## Impacto em Shared
- [ ] Toca arquivos sensíveis? Não. `convex/auth/*` e `convex/schema.ts` não são editados. `middleware.ts` afeta todas as rotas, mas a mudança é só remoção.
- [ ] Risco de regressão em quais features? Login e navegação autenticada em geral (baixo).

## Riscos
- Remover algo ainda em uso. Mitigação: tudo o que sai só é referenciado pelos dois blocos removidos (conferido por busca no repo); `NextResponse` e `nextjsMiddlewareRedirect` continuam usados e os imports ficam.
- Mudança de comportamento percebida: nenhuma esperada, fora o fim do logout raro descrito no Escopo. Sem o bloco `:79-92`, o caminho autenticado cai no retorno padrão de `:94-96`, idêntico exceto pelo `Set-Cookie` do cookie removido.
- Cookie antigo em navegadores: não exige limpeza. Expira sozinho em até 12h e passa a ser ignorado.
- Computador compartilhado: aba esquecida aberta segue logada por até 30 dias. Não é regressão, porque os 30 min já não valiam.

Fora de escopo: `TRINTA_MIN_MS` em `convex/membros/acesso.ts` (outro assunto); qualquer alteração nos prazos de `convex/auth/auth.ts`; `docs/plano-geral.md` (plano histórico, a issue não pede a edição).

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `middleware.ts` | Modificar | Remover `isMobileUA` (`:20-22`), `isLocalhost` (`:15-18`), as variáveis `ua`, `host`, `mobile`, `isLocal`, `desktopSeconds`, `mobileSeconds`, `durationSec`, `appCookieName`, `expiryStr`, `now`, `expiry` (`:25-37`), o bloco de reautenticação forçada (`:42-53`) e o bloco "Slide the window" (`:79-92`) |

Ficam como estão: `authed`, `pathname`, `verSite`, `isSignInPage`, `isPublicRoute`, `isLandingPage`, a regra do `/culto`, o retorno padrão, o `cookieConfig` e o `config.matcher`.

## Ordem de Implementação
1. Editar `middleware.ts` (remoções acima).
2. Rodar a verificação abaixo.
3. PR vinculado à issue #332; só frontend (Vercel), sem `npx convex deploy`.

## Verificação
- [ ] `npm run lint` passa, sem aviso de variável ou import não usado em `middleware.ts`.
- [ ] `npm run typecheck` passa.
- [ ] Busca por `__appSessionExpiry`, `isMobileUA`, `isLocalhost`, `desktopSeconds` e `mobileSeconds` fora de `docs/implementations/` não retorna nada.
- [ ] `git diff` de `middleware.ts` contém apenas linhas removidas.
- [ ] Deslogado: rota protegida (ex.: `/dashboard`) redireciona para `/signin`; `/` e as rotas públicas abrem normalmente.
- [ ] Logado: `/` e `/signin` redirecionam para `/dashboard`; `/?site=1` abre o site; rota protegida abre; a resposta não traz `Set-Cookie` de `__appSessionExpiry`.
- [ ] `/culto` fora do domingo continua redirecionando para `/`.

## Testes
Não criar teste novo. O middleware não tem testes hoje, a mudança é só remoção de código que na prática não executa e nenhum comportamento novo é introduzido. Montar a infraestrutura de teste (simular `convexAuthNextjsMiddleware` e `NextRequest`) custaria mais que a mudança e testaria principalmente o mock. Lint, typecheck e a conferência manual acima cobrem o risco. Cobertura do middleware, se desejada, é assunto para outra issue.
