# PRD: Remodelagem do Diretorio do chrMS

**Versao:** 1.0  
**Status:** Pronto para implementacao  
**Data:** 2026-04-20

---

## Contexto

O Diretorio atual tem problemas de usabilidade, bugs visuais e e mal otimizado pro uso principal (encontrar contato de pessoa especifica e agir rapidamente — ligar, WhatsApp, e-mail).

Problemas identificados:
- Lista com fotos grandes (60px) + badge de tipo de membro em cada linha = pouca densidade (com 164 membros, muita rolagem)
- Espacamento vertical exagerado entre cards (bug visual)
- Typos: "Diretorio" sem acento, "Membro Nao Comungante" sem til
- Chip "Pastores e Presbiteros" cortado
- Perfil individual nao tem botoes de acao claros (so um link verde implicito pra WhatsApp)
- Falta e-mail, informacao de familia/PG

Esta remodelagem reorganiza o Diretorio em duas telas: **lista densa otimizada pra busca** + **perfil individual com acoes de contato rapidas**.

---

## Tela 1: Lista do Diretorio

### Estrutura (de cima pra baixo)

1. **Header da pagina** (via `<PageHeader>` ja criado):
   - Breadcrumb "‹ Comunidade"
   - Titulo "Diretorio" (com acento)
   - Subtitulo "164 membros" (sem frase declarativa)
2. **Busca sticky**:
   - Barra de busca `bg-secondary`, icone de lupa a esquerda
   - Placeholder "Buscar por nome ou telefone"
   - Filtra em tempo real (debounce 200ms)
3. **Chips de filtro** — scroll horizontal:
   - "Todos" (default, preto solido)
   - "Membros"
   - "Obreiros"
   - "Lideranca" (renomear de "Pastores e Presbiteros" — mais curto, cabe)
4. **Lista agrupada alfabeticamente** + **scrubber A-Z lateral**

### Item da lista (cada pessoa)

```tsx
<button className="flex items-center gap-2.5 py-2 border-b border-border-tertiary w-full">
  <Avatar size={36} />  {/* foto ou iniciais com gradient deterministico */}
  <div className="flex-1 min-w-0 text-left">
    <div className="text-[13px] font-medium truncate">
      {person.fullName}
    </div>
  </div>
</button>
```

Pontos-chave:
- Foto 36x36 (nao 60x60 como antes)
- Apenas **nome completo** visivel — sem badge de tipo de membro, sem subtitulo
- Se pessoa tem foto real → usa foto
- Se nao tem → circulo com iniciais (1-2 letras) e gradient deterministico baseado em hash do `userId`
- Gap compacto entre items (`border-bottom` ao inves de card separado com margin)

### Secoes alfabetica

Lista agrupada por inicial do nome, cada letra com header:

```tsx
<div className="py-1.5 text-[10px] font-medium tracking-wider text-text-tertiary">
  A
</div>
```

O header da letra pode ser `position: sticky; top: 0` pra acompanhar scroll, mas atencao ao conflito com header global (ja removido na refatoracao anterior) ou barra de busca sticky.

### Scrubber A-Z lateral

Elemento vertical com todas as letras do alfabeto do lado direito da lista:

```tsx
<div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0 text-[9px] text-text-tertiary">
  {alphabet.map(letter => (
    <button
      key={letter}
      className={cn(
        "px-1 py-0.5",
        hasMatchingPeople(letter) ? "text-text-primary font-medium" : "opacity-30"
      )}
      onClick={() => scrollToLetter(letter)}
    >
      {letter}
    </button>
  ))}
</div>
```

Comportamento:
- Cada letra e clicavel (scroll pra secao correspondente)
- **Drag vertical** pelo scrubber faz scroll rapido — importante pra UX tipo Contatos do iOS
- Letras sem correspondencia (ex: "K" se nao ha ninguem) ficam com opacity 0.3 e nao clicaveis
- Letras com correspondencia ficam com cor primary e font-medium

### Comportamento da busca

- Ao digitar algo na busca, os grupos alfabetico somem e vira lista unica de resultados ordenada por relevancia (match no comeco do nome primeiro, depois contem)
- Busca funciona em: `fullName`, `phoneNumber` (normalizado — remover espacos, tracos, +55)
- Se 0 resultados: estado vazio com "Nenhum membro encontrado"
- Scrubber A-Z some durante busca

### Chips de filtro

Cada chip filtra a lista por tipo:
- "Todos" → sem filtro
- "Membros" → comungantes + nao comungantes
- "Obreiros" → quem tem role de obreiro
- "Lideranca" → pastores + presbiteros + diaconos

Combinacao com busca: ambos aplicam juntos (AND).

### Queries Convex necessarias

Provavelmente ja existe `listMembers`, mas ajustar:

```ts
// Query paginada com filtros opcionais
listDirectory({
  searchQuery?: string,
  filter?: "all" | "members" | "workers" | "leadership",
})
```

Retorna lista completa (nao paginada — 164 e gerenciavel) ordenada por `firstName` para agrupamento alfabetico correto.

### Bugs a corrigir

1. "Diretorio" → "Diretorio" (com acento)
2. "Membro Nao Comungante" → "Membro Nao Comungante" (com til) — ajustar na fonte de dados, nao so no display
3. Espacamento vertical excessivo entre cards — provavelmente `margin` exagerada no componente atual, ir pra `border-bottom` single linha
4. Cards com shapes inconsistentes — trocar por estrutura unica de item de lista

---

## Tela 2: Perfil individual

### Estrutura (de cima pra baixo)

1. **Header da pagina**:
   - Breadcrumb "‹ Diretorio"
   - Icone de menu contextual (⋮) no canto direito
2. **Cabecalho centralizado do perfil**:
   - Foto grande circular (96x96) ou iniciais com gradient
   - Nome completo (font-medium, 18px, centered)
   - Subtitulo: "Profissao · Cidade" (text-secondary, 12px)
3. **Linha de acoes rapidas** — grid de 3 botoes:
   - WhatsApp (circulo verde `#10b981`)
   - Ligar (circulo azul — text-info bg)
   - E-mail (circulo azul — text-info bg)
   - Cada botao: `bg-secondary`, `border-radius-md`, padding 10px, flex column com icone em circulo colorido + label
4. **Secao "Contato"**:
   - Label uppercase pequeno
   - Linhas com label esquerdo (text-secondary) + valor direito (text-primary)
   - Telefone formatado como "+55 11 99995-2881"
   - E-mail em text menor se for muito longo (ou truncar)
5. **Secao "Na igreja"**:
   - Status (ex: "Membro comungante") — sai da pilula que estava antes, vira linha simples
   - Pequeno Grupo (clicavel, text-info, leva pra pagina do PG)
   - Familia (clicavel, mostra quantidade, leva pra grupo familiar)
6. **Secao "Pessoal"**:
   - Aniversario (ex: "10 de marco (40 anos)")
   - Profissao
   - Cidade

### Botoes de acao — comportamento

**WhatsApp:**
```tsx
const handleWhatsApp = () => {
  const phone = cleanPhoneNumber(person.phone); // so digitos, com codigo pais
  const message = encodeURIComponent(`Oi ${person.firstName}, tudo bem? Peguei seu contato pelo app da IPC.`);
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
};
```

**Ligar:**
```tsx
const handleCall = () => {
  window.location.href = `tel:${person.phone}`;
};
```

**E-mail:**
```tsx
const handleEmail = () => {
  window.location.href = `mailto:${person.email}`;
};
```

Se a pessoa nao tem e-mail cadastrado, o botao fica desabilitado (opacity 0.4, sem click). Mesmo pra telefone (improvavel, mas tratar).

### Secoes clicaveis (PG e Familia)

- Clicar em "PG Jardins →" → navega pra `/pgs/[pgId]` (pode ser tela futura, por enquanto stub)
- Clicar em "3 membros →" (familia) → abre modal ou navega pra `/familias/[familyId]` (pode ser stub tambem)

Registrar como divida tecnica se essas rotas nao existem ainda.

### Menu contextual (⋮)

Botao no canto superior direito. Abre popover/actionsheet com opcoes:
- **Sempre disponivel:** "Salvar contato no telefone" (gera vCard)
- **Se usuario e admin/lider:** "Editar perfil", "Gerenciar permissoes"
- **Para qualquer um:** "Reportar dados incorretos"

Implementacao minima: so o item "Salvar contato no telefone" usando geracao de vCard. Resto fica pra fase 2.

### Fallback de foto

Se pessoa nao tem foto:
- Circulo 96x96 com gradient deterministico baseado em hash do `userId`
- Iniciais (1-2 letras) em branco, font-weight 500, 32px
- Pool de gradients: laranja, roxo, verde, azul, ambar (5-6 combinacoes)

### Schema — provavel ja existe

A tabela de pessoas (`members` ou `users`) provavelmente tem: `firstName`, `lastName`, `phone`, `email`, `birthDate`, `occupation`, `city`, `memberType`, `photoUrl`. Validar e listar o que falta:

- `pgId` (se nao existe) — FK pra tabela `pgs`
- `familyId` (se nao existe) — FK pra tabela `families`
- Indices em `firstName`, `phone` (pra busca performatica)

---

## Layout e arquitetura

- **Remover** abordagem de modal/bottom sheet pro perfil — vira pagina dedicada em `/diretorio/[personId]`
- Scroll do documento (consistente com o resto do app pos-refatoracao do header)
- Header da pagina via `<PageHeader>` reutilizavel

---

## Componentizacao

- `<DiretorioPage />` — lista
- `<MemberListItem />` — item da lista (reutilizavel em outros contextos futuros, ex: aniversariantes, lista de PG)
- `<AlphabetScrubber />` — scrubber A-Z lateral
- `<MemberFilterChips />` — chips de filtro
- `<MemberProfilePage />` — perfil individual
- `<ProfileActionButtons />` — linha de WhatsApp / Ligar / E-mail
- `<ProfileSection />` — secao com label + lista de linhas key-value
- `<Avatar />` (se nao existe) — componente unificado com fallback de iniciais

---

## Detalhes tecnicos

- **Formatacao de telefone:** criar utility `formatPhone(raw: string): string` que retorna "+55 11 99995-2881" formatado
- **Limpeza de telefone pra WhatsApp:** utility `cleanPhoneForWhatsApp(raw: string): string` — remove tudo que nao e digito, garante codigo do pais
- **Gradient deterministico:** mesmo utility usado nos sermoes e aniversariantes — se ainda nao existe, criar `getInitialsGradient(seed: string)` e reusar em todos os contextos
- **vCard generation** (pra "Salvar contato"): gerar string no formato vCard 3.0 e usar `data:text/vcard` como download. Lib opcional: [vcards-js](https://github.com/enesser/vCards-js)
- **Acessibilidade:** scrubber A-Z precisa de aria-label "Navegacao alfabetica" e cada letra com aria-label. Botoes de acao com aria-label descritivo ("Ligar para Alejandro")
- **Performance:** 164 membros e pouco, renderizacao direta sem virtualizacao e ok. Se chegar a 500+, usar `react-window` ou `@tanstack/react-virtual`

---

## O que nao fazer

- Nao manter o modal bottom sheet do perfil — virar pagina dedicada
- Nao deixar "Membro Comungante" como pilula grande no cabecalho do perfil — vira linha na secao "Na igreja"
- Nao adicionar funcionalidades sociais (mural de mensagens, curtidas, timeline) — e diretorio, nao rede social
- Nao permitir editar dados da pessoa sem permissao apropriada (admin/lider)
- Nao exibir dados sensiveis (endereco completo, CPF, etc.) mesmo se existirem no banco — so o essencial pra contato

---

## Dividas tecnicas a registrar

1. **Paginas de PG** (`/pgs/[pgId]`) — se nao existem, criar stub
2. **Paginas de Familia** (`/familias/[familyId]`) — se nao existem, criar stub
3. **Edicao de perfil por lideres** — permissoes e tela de edicao
4. **Integracao WhatsApp Business** — se a igreja tem numero oficial, mensagens pre-preenchidas podem ser customizadas por admin
5. **Preferencia de contato** — campo "prefere WhatsApp" ou "prefere ligacao" no schema, pra destacar o botao correspondente

---

## Entrega esperada

1. Lista densa com agrupamento alfabetico + scrubber A-Z funcionando
2. Correcao dos typos ("Diretorio", "Nao") — incluindo na fonte de dados
3. Perfil individual como pagina dedicada com acoes rapidas funcionais (WhatsApp, Ligar, E-mail)
4. Fallback de foto com iniciais + gradient
5. Botao "Salvar contato no telefone" via vCard (opcional, se tiver tempo)
6. Formatacao adequada de telefone
7. Confirmacao visual com os mockups propostos

---

## Arquivos envolvidos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `app/(ready)/diretorio/page.tsx` | REESCREVER | Lista do diretorio |
| `app/(ready)/diretorio/[id]/page.tsx` | CRIAR | Perfil individual |
| `features/diretorio/components/MemberListItem.tsx` | CRIAR | Item da lista |
| `features/diretorio/components/AlphabetScrubber.tsx` | CRIAR | Scrubber A-Z |
| `features/diretorio/components/MemberFilterChips.tsx` | CRIAR | Chips de filtro |
| `features/diretorio/components/ProfileActionButtons.tsx` | CRIAR | WhatsApp/Ligar/Email |
| `features/diretorio/components/ProfileSection.tsx` | CRIAR | Secao key-value |
| `shared/lib/utils/phone.ts` | CRIAR | formatPhone, cleanPhoneForWhatsApp |
| `shared/lib/utils/gradient.ts` | CRIAR | getInitialsGradient |
| `convex/members/queries.ts` | MODIFICAR | listDirectory com filtros |
