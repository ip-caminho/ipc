# PRD: Remodelagem do Diretorio do chrMS

**Versao:** 2.0
**Status:** Pronto para implementacao
**Data:** 2026-04-21
**Revisao 2.0:** critica aplicada + decisoes do usuario

---

## Contexto

O Diretorio atual tem problemas de usabilidade, bugs visuais e e mal otimizado pro uso principal (encontrar contato de pessoa especifica e agir rapidamente — ligar ou abrir WhatsApp).

Problemas identificados:
- Lista com cards 44x44 + badge de cargo em cada linha = pouca densidade (164 membros, muita rolagem)
- Espacamento vertical exagerado entre cards
- Typos em labels: "Diretorio" sem acento, "Membro Nao Comungante" sem til
- Chip "Pastores e Presbiteros" cortado por ser longo
- Perfil individual fica num Drawer bottom sheet em vez de pagina dedicada
- Falta botao claro de acao rapida (so WhatsApp implicito)

Esta remodelagem reorganiza o Diretorio em duas telas: **lista densa otimizada pra busca** + **perfil individual dedicado com acoes rapidas**.

## Decisoes arquiteturais (confirmadas)

- **Typos:** corrigir so labels hardcoded. Valores do enum `cargoEclesiastico` ficam intocados (`MEMBRO_COMUNGANTE`, `MEMBRO_NAO_COMUNGANTE`, etc)
- **"Lideranca":** novo chip engloba apenas **Pastor + Presbitero**. Diaconos ficam em "Obreiros"
- **Familia e PG:** **removidos da Fase 1**. Sem secao de vinculos no perfil por enquanto
- **Gradient:** generalizar `getSermonGradient` ([features/comunidade/lib/sermonGradient.ts](features/comunidade/lib/sermonGradient.ts)) para `getDeterministicGradient(seed)` e reusar no Avatar do diretorio
- **Nome:** schema tem `nomeCompleto` unico — helper `splitNome(completo)` deriva first/rest on-the-fly (sem alterar schema)
- **Filtros:** mantem client-side no MVP (volume 164 nao justifica refactor pra server-side)
- **Telefone internacional:** criar novo helper `formatPhoneInternational(raw)` em [shared/lib/validations/brazilian.ts](shared/lib/validations/brazilian.ts), preservando o `formatPhone` existente
- **Email:** nao exibir no perfil (fora do MVP)
- **vCard:** gerar manualmente (string no formato vCard 3.0), sem dependencia nova
- **Mensagem WhatsApp:** sem texto pre-preenchido — abre conversa em branco
- **Links PG/familia inexistentes:** nao se aplica (sem secao)

## Tela 1: Lista do Diretorio

### Estrutura (de cima pra baixo)

1. **`PageHeader`** (ja criado na refatoracao do header):
   - Titulo "Diretorio" (com acento)
   - Subtitulo "164 membros" (valor dinamico — total retornado)
2. **Busca sticky** (top 0, abaixo do safe-area/HeaderLayout):
   - `bg-secondary`, icone de lupa a esquerda
   - Placeholder "Buscar por nome ou telefone"
   - Filtra em tempo real via `useDebounce` ([shared/hooks/useDebounce.ts](shared/hooks/useDebounce.ts))
3. **Chips de filtro** — scroll horizontal, sticky logo abaixo da busca:
   - "Todos" (default, preto solido)
   - "Membros" → `MEMBRO_COMUNGANTE` + `MEMBRO_NAO_COMUNGANTE`
   - "Obreiros" → `DIACONO` + `PRESBITERO` + `PASTOR`
   - "Lideranca" → `PASTOR` + `PRESBITERO` (subset de obreiros)
4. **Lista agrupada alfabeticamente** + **scrubber A-Z lateral**

### Item da lista

```tsx
<button className="flex items-center gap-2.5 py-2 border-b w-full text-left">
  <Avatar
    className="h-9 w-9"
    style={{ background: getDeterministicGradient(membro._id) }}
  >
    {membro.foto && <AvatarImage src={membro.foto} alt={membro.nomeCompleto} />}
    <AvatarFallback className="text-xs text-white font-medium bg-transparent">
      {getIniciais(membro.nomeCompleto)}
    </AvatarFallback>
  </Avatar>
  <div className="flex-1 min-w-0">
    <p className="text-[13px] font-medium truncate">{membro.nomeCompleto}</p>
  </div>
</button>
```

Pontos-chave:
- Foto 36x36 (`h-9 w-9`)
- So nome completo visivel — sem badge de cargo, sem subtitulo
- Fallback: iniciais em cima do gradient deterministico (seed = `membro._id`)
- `border-b` em vez de card com margin — densidade maxima

### Secoes alfabeticas

```tsx
<div className="sticky top-[calc(var(--sticky-search-height)+var(--sticky-filter-height))] py-1.5 text-[10px] font-medium tracking-wider text-muted-foreground bg-background z-10">
  {letra}
</div>
```

O header da letra e sticky, empilhado abaixo da busca+filtros.

Edge case: `nomeCompleto` vazio ou comecando com numero/simbolo → grupo `#`.

### Scrubber A-Z lateral

```tsx
<div
  className="fixed right-1 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-0 text-[9px] text-muted-foreground md:hidden"
  role="navigation"
  aria-label="Navegacao alfabetica"
>
  {alphabet.map(letter => (
    <button
      key={letter}
      className={cn(
        "px-1 py-0.5 min-h-[16px]",
        temMembro(letter) ? "text-primary font-medium" : "opacity-30"
      )}
      onClick={() => scrollToLetter(letter)}
      disabled={!temMembro(letter)}
      aria-label={`Ir para ${letter}`}
    >
      {letter}
    </button>
  ))}
</div>
```

Comportamento:
- `z-40` — abaixo da FloatingBottomBar (`z-56`) mas acima do conteudo
- Clique em letra: `scrollToLetter(letter)` usa `ref[letter].scrollIntoView({ block: "start" })`
- Drag vertical (pointer events) mapeia Y → letra → scroll continuo (tipo Contatos iOS)
- Letras sem correspondencia: `opacity-0.3`, `disabled`
- Scrubber some quando busca esta ativa (so um unico grupo de resultados)

### Comportamento da busca

- Ao digitar, grupos alfabeticos somem e vira lista unica ordenada por relevancia:
  - Match no comeco do nome (startsWith) primeiro
  - Depois contains
- Busca em `nomeCompleto` (case-insensitive) e `whatsapp` normalizado (remove `+55`, espacos, hifens, parenteses)
- 0 resultados: estado vazio `"Nenhum membro encontrado"`
- Scrubber oculto durante busca

### Chips + busca: AND

Ambos os filtros aplicam simultaneamente. Busca filtra sobre o subset ja filtrado por chip.

### Query Convex

Mantem a query `list` atual de [convex/membros/queries.ts](convex/membros/queries.ts) (aceita `search`). Ajustes:
- Garantir que retorna tambem `cargoEclesiastico`, `profissao`, `cidade`, `aniversario` e `whatsapp` no shape do item — campos que a lista precisa renderizar e o perfil vai reaproveitar
- Filtro por `cargoEclesiastico` fica client-side por `useMemo`
- Sem paginacao (164 e gerenciavel — validado no PRD)

Sem nova query necessaria no MVP.

### Bugs a corrigir

1. `"Diretorio"` → `"Diretorio"` (com acento) em [app/(ready)/diretorio/page.tsx](app/(ready)/diretorio/page.tsx)
2. `"Membro Nao Comungante"` → `"Membro Nao Comungante"` (com til) em:
   - [features/membros/lib/constants.ts](features/membros/lib/constants.ts)
   - [features/pastoreio/components/MembroPerfilPastoral.tsx](features/pastoreio/components/MembroPerfilPastoral.tsx)
3. Espacamento vertical excessivo entre cards — trocar cards com margin por `border-b` single linha
4. Chips: "Pastores e Presbiteros" → "Lideranca" (curto, cabe)

## Tela 2: Perfil individual

Migrada de Drawer bottom sheet para **pagina dedicada** em `/diretorio/[id]`.

### Estrutura

1. **`DetailHeader`** (ja criado) com `backHref="/diretorio"` + icone de menu contextual (⋮) no canto direito
2. **Cabecalho centralizado:**
   - Foto ou iniciais-gradient 96x96 (tamanho `lg`)
   - Nome completo — 18px, font-medium, centered
   - Subtitulo: `"{profissao} · {cidade}"` (se vazios, omitir o separador e o campo)
3. **Acoes rapidas — 2 botoes grid:**
   - **WhatsApp** (circulo verde `#10b981`) — abre `https://wa.me/{whatsapp_limpo}` sem texto
   - **Ligar** (circulo azul da paleta `--primary` ou `--info`) — abre `tel:{whatsapp}`
   - Cada botao: `bg-secondary rounded-md p-2.5`, flex column com icone em circulo colorido + label
   - Sem botao de email no MVP
4. **Secao "Contato":**
   - Label uppercase 10px tracked
   - Linha: `Telefone` (muted) | `{formatPhoneInternational(whatsapp)}` (primary)
5. **Secao "Na igreja":**
   - Linha unica com o label do cargo (ja corrigido — "Membro Comungante", "Presbitero", etc)
6. **Secao "Pessoal":**
   - Aniversario (ex: `"10 de marco (40 anos)"` usando `date-fns`)
   - Profissao (se preenchida)
   - Cidade (se preenchida)

### Acoes rapidas — implementacao

```tsx
const handleWhatsApp = () => {
  const phone = cleanPhoneForWhatsApp(membro.whatsapp);
  window.open(`https://wa.me/${phone}`, "_blank");
};

const handleCall = () => {
  window.location.href = `tel:${cleanPhoneForWhatsApp(membro.whatsapp)}`;
};
```

Se a pessoa nao tem telefone: ambos os botoes ficam `opacity-0.4` e desabilitados.

### Menu contextual (⋮)

Abre `DropdownMenu` (shadcn) com apenas **"Salvar contato no telefone"** no MVP.

### "Salvar contato no telefone" — vCard manual

Gera string vCard 3.0 e dispara download via `data:text/vcard;charset=utf-8,{conteudo}`.

```tsx
function generateVCard(m: Membro): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${m.nomeCompleto}`,
    `N:${splitNome(m.nomeCompleto).resto};${splitNome(m.nomeCompleto).primeiro};;;`,
    m.whatsapp && `TEL;TYPE=CELL:${cleanPhoneForWhatsApp(m.whatsapp)}`,
    m.aniversario && `BDAY:${m.aniversario}`,
    m.cidade && `ADR;TYPE=HOME:;;;${m.cidade};;;`,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}
```

Dispara o download:
```tsx
const blob = new Blob([generateVCard(membro)], { type: "text/vcard" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `${membro.nomeCompleto}.vcf`;
a.click();
URL.revokeObjectURL(url);
```

**Nota iOS:** comportamento pode abrir em vez de baixar em alguns clients; validar em device real. Se falhar, registrar divida tecnica pra endpoint de vcard com `Content-Disposition: attachment`.

### Fallback de foto (perfil)

Mesmo padrao da lista: circulo 96x96 com gradient deterministico (seed = `membro._id`) + iniciais (1-2 letras) em branco, font-weight 500, ~32px.

### Query do perfil

Adaptar [getPublicProfile em convex/membros/queries.ts](convex/membros/queries.ts) para retornar no shape necessario:
- `nomeCompleto`, `foto`, `whatsapp`, `cargoEclesiastico`, `aniversario`, `profissao`, `cidade`

Sem email, sem PG, sem familia no MVP.

## Arquitetura / layout

- Scroll do documento (consistente com resto do app pos-refatoracao do header)
- **Nova rota:** `app/(ready)/diretorio/[id]/page.tsx`
- Lista antiga perde o Drawer bottom sheet — substituido por `router.push("/diretorio/" + id)`

## Componentizacao

Criar:
- `features/diretorio/components/DiretorioList.tsx` — a lista agrupada
- `features/diretorio/components/MemberListItem.tsx` — item da lista
- `features/diretorio/components/AlphabetScrubber.tsx` — scrubber A-Z
- `features/diretorio/components/MemberFilterChips.tsx` — chips de filtro
- `features/diretorio/components/MemberProfile.tsx` — conteudo do perfil
- `features/diretorio/components/ProfileActionButtons.tsx` — WhatsApp + Ligar
- `features/diretorio/components/ProfileSection.tsx` — secao generica com label + key-value

Utilities:
- `features/diretorio/lib/splitNome.ts` — derivar first/resto de `nomeCompleto`
- `features/diretorio/lib/vcard.ts` — gerar string vCard + trigger download
- Renomear/generalizar `features/comunidade/lib/sermonGradient.ts` → `shared/lib/utils/gradient.ts` com `getDeterministicGradient(seed)` (e atualizar consumidores atuais de `getSermonGradient`)
- Novo helper em [shared/lib/validations/brazilian.ts](shared/lib/validations/brazilian.ts): `formatPhoneInternational(raw)` → `"+55 11 99999-9999"`
- Novo helper: `cleanPhoneForWhatsApp(raw)` → so digitos com codigo pais

## Detalhes tecnicos

- **Debounce de busca:** reaproveitar `useDebounce` com 300ms (ja em uso)
- **ScrollIntoView:** nativo, sem lib
- **Scrubber drag:** `onPointerDown`/`onPointerMove` + `getBoundingClientRect()` → indice do array de letras → scroll
- **Acessibilidade:** `aria-label`s no scrubber e nos botoes de acao. Menu contextual via `DropdownMenu` da shadcn (acessivel por teclado)
- **Performance:** 164 membros, lista direta, zero virtualizacao. Se crescer pra 500+, avaliar `@tanstack/react-virtual`

## O que nao fazer

- Nao manter o Drawer bottom sheet do perfil — vira pagina dedicada
- Nao adicionar secoes de PG, familia ou email no MVP
- Nao adicionar funcionalidades sociais (mural, curtidas, timeline)
- Nao permitir editar dados da pessoa (fica pra fase 2)
- Nao exibir dados sensiveis (CPF, endereco completo, etc)
- Nao instalar `vcards-js` — gerar manualmente
- Nao mandar mensagem pre-preenchida no WhatsApp

## Dividas tecnicas a registrar

1. **Paginas `/pgs/[id]` e `/familias/[id]`** — registrar quando rotas forem necessarias (fora do MVP)
2. **Secao Familia no perfil** — derivar de `conjugeId + filhos` quando voltar
3. **Secao PG no perfil** — via `pgMembros` associativa quando voltar
4. **Email no perfil** — avaliar RBAC (sensivel?) e reativar
5. **Edicao de perfil por lideres** — permissoes + tela de edicao
6. **Integracao WhatsApp Business** — mensagens customizaveis por admin
7. **Preferencia de contato** — campo "prefere WhatsApp/ligacao" no schema
8. **vCard em iOS** — se falhar, endpoint `/api/vcard/[id]` com `Content-Disposition`
9. **Virtualizacao** — quando volume passar ~500 membros

## Entrega esperada

1. Lista densa com agrupamento alfabetico + scrubber A-Z funcional (clique + drag)
2. Correcao dos typos em labels
3. Chip "Lideranca" substituindo "Pastores e Presbiteros" (Pastor + Presbitero)
4. Perfil individual como pagina dedicada em `/diretorio/[id]`
5. Acoes rapidas funcionais: WhatsApp (verde) + Ligar (azul)
6. Fallback de foto com iniciais + gradient deterministico (reusando utility renomeada)
7. "Salvar contato no telefone" via vCard 3.0 gerado manualmente
8. Helpers `formatPhoneInternational`, `cleanPhoneForWhatsApp`, `splitNome` criados
9. Confirmacao visual em mobile e desktop

## Verificacao pos-implementacao

- [ ] Busca em nome e em telefone normalizado retornam resultados corretos
- [ ] Chips "Todos/Membros/Obreiros/Lideranca" filtram corretamente
- [ ] Scrubber A-Z: clique rola para letra; drag rola continuamente
- [ ] Scrubber some durante busca
- [ ] Header sticky de letra acompanha scroll
- [ ] Avatar sem foto usa gradient deterministico (mesma pessoa, mesmo gradient sempre)
- [ ] Perfil abre em `/diretorio/[id]`, nao em Drawer
- [ ] WhatsApp abre `wa.me/{phone}` sem texto
- [ ] Ligar abre discador do device
- [ ] "Salvar contato" baixa `.vcf` com nome e telefone corretos
- [ ] Labels "Diretorio" e "Membro Nao Comungante" com acentos/til
- [ ] `npx tsc --noEmit` zero erros novos
