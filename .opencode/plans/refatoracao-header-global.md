# PRD: Refatoracao do Header Global do chrMS

**Versao:** 1.0  
**Status:** Pronto para implementacao  
**Data:** 2026-04-20

---

## Contexto

O header global atual do chrMS mostra o logo + "IPC" a esquerda e o avatar do usuario a direita, com um divider horizontal abaixo. Esse bloco ocupa ~85px de altura em **todas as telas do app** e carrega pouco valor informacional:

- O nome da igreja e algo que o usuario aprende em 2 segundos e nunca mais precisa ver
- O app nao e multi-tenant (usuario nao alterna entre igrejas)
- O avatar ja tem funcao similar a aba "Gestao" do bottom tab bar, criando redundancia

Em telas como Orar ou Inicio, somando o header global + o titulo da pagina + tabs internas, chega-se a ~145px (15%+ da altura do viewport) gastos antes do conteudo comecar.

Esta refatoracao **remove o header global** e integra o titulo da pagina diretamente no topo de cada tela, seguindo padrao iOS (Large Title pattern). O avatar do usuario migra pro canto superior direito do titulo, mantendo acesso ao perfil pessoal.

---

## Onde o contexto da igreja passa a viver

Pra nao perder o branding completamente, a identidade "IPC" aparece em:

- **Splash screen / primeira abertura do app** — logo grande centralizado
- **Tela de login / onboarding** — para quem nao esta autenticado
- **Aba Gestao** — header interno pode mostrar logo + nome da igreja (contexto administrativo)
- **Configuracoes / Sobre** — secao "Sua igreja"
- **PWA manifest** — icone no home screen ja e a marca

Nao implementar nada novo nesses lugares como parte desta entrega — eles ja existem ou ja comunicam contexto. Apenas garantir que o header global sumindo nao deixa o usuario "orfa" de contexto.

---

## Estrutura nova

### Layout raiz

Remover o componente de header global do layout (`app/layout.tsx` ou layout compartilhado). O `<body>` passa a renderizar apenas:

```tsx
<body className="min-h-screen">
  <main>{children}</main>
  <BottomTabBar />
</body>
```

### Cabecalho em cada tela

Cada pagina que hoje tem titulo (Inicio, Orar, Comunidade, Gestao, etc.) ganha um componente `<PageHeader>` no topo:

```tsx
// components/layout/PageHeader.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  title: string;
  subtitle?: string;
  showAvatar?: boolean; // default true
  backHref?: string; // se presente, mostra botao voltar em vez de avatar
};

export function PageHeader({ title, subtitle, showAvatar = true, backHref }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-start justify-between pt-4 pb-3">
      <div className="flex-1 min-w-0">
        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-1 text-sm text-text-secondary mb-2"
          >
            {/* icone chevron-left */}
            Voltar
          </button>
        )}
        <h1 className="text-2xl font-medium leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>

      {showAvatar && !backHref && (
        <Link href="/perfil" aria-label="Perfil">
          <div className="w-9 h-9 rounded-full bg-background-info overflow-hidden flex-shrink-0">
            {/* avatar do usuario */}
          </div>
        </Link>
      )}
    </div>
  );
}
```

Pontos-chave:
- Titulo em `h1` com `font-size: 24px`, `font-weight: 500` — aparece grande e escaneavel
- Avatar alinhado ao topo do titulo (`items-start`)
- Em telas de detalhe, passa `backHref` e o avatar some (da lugar ao botao voltar)
- Subtitulo opcional (ex: "O que esta fresco na IPC" na Comunidade)

### Exemplo de aplicacao nas telas

**Aba Orar:**
```tsx
<PageHeader title="Orar" />
<Tabs defaultValue="mural">...</Tabs>
```

**Aba Comunidade:**
```tsx
<PageHeader title="Comunidade" subtitle="O que esta fresco na IPC" />
```

**Detalhe de pedido:**
```tsx
<PageHeader title="" showAvatar={false} backHref="/orar" />
<PrayerRequestDetail ... />
```

Ou um componente separado `<DetailHeader>` pra telas de detalhe, se fizer mais sentido na arquitetura.

---

## Separacao de papeis: avatar vs. Gestao

Hoje ha ambiguidade entre o avatar no header e a aba Gestao (ambos parecem levar a "configuracoes"). Resolver definindo claramente:

- **Avatar (canto superior direito de cada tela)** → `/perfil` — perfil pessoal (dados do usuario, preferencias, logout, tema)
- **Aba Gestao (bottom tab bar)** → `/gestao` — administracao da igreja (so funcional pra lideres/admins; para membros comuns, pode mostrar info da igreja, PG, escalas, etc.)

Se essa separacao ainda nao existe no app, **registrar como divida tecnica** — nao e escopo desta entrega criar a tela de perfil pessoal, so garantir que o avatar aponta pro lugar certo (pode ser `/perfil` com placeholder temporario).

---

## Aba Gestao — excecao

A aba Gestao pode manter um header maior com logo + nome da igreja, porque ali o contexto "qual igreja voce esta administrando" faz sentido. Essa tela nao e escopo desta refatoracao — apenas nao remover o que ja existe la.

---

## Telas afetadas

Aplicar `<PageHeader>` nas seguintes telas:
- `/` (Inicio) — titulo "Inicio" ou baseado na saudacao ("Boa noite, Andre")
- `/comunidade` — titulo "Comunidade"
- `/orar` — titulo "Orar"
- `/gestao` — manter como esta (excecao)
- `/ouvir` — titulo "Ouvir", com `backHref="/comunidade"`
- Todas as telas de detalhe (pedido individual, sermao individual, evento individual) — usar modo `backHref`

---

## Tela "Inicio" — caso especial

Na home, o "Boa noite, Andre · 19 de abril" atual pode servir como titulo grande via `<PageHeader>`:

```tsx
<PageHeader
  title={`Boa noite, ${userName}`}
  subtitle={formatDate(new Date())}
/>
```

Ou manter como esta se a combinacao saudacao + data e tratada como elemento unico. Avaliar visualmente.

---

## O que nao fazer

- Nao deletar o componente do header global sem substituir em todas as telas — app ficaria sem avatar/contexto
- Nao remover o logo da aba Gestao (e o unico lugar de branding constante)
- Nao criar nova tela de perfil pessoal agora — so garantir que o avatar linka pra `/perfil` (pode ser placeholder)
- Nao mexer em bottom tab bar
- Nao mexer em headers internos de modais (eles tem proprio titulo)

---

## Arquivos a modificar/criar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `shared/components/layout/PageHeader.tsx` | CRIAR | Componente reutilizavel de header de pagina |
| `shared/components/layout/Header.tsx` | REMOVER | Header global atual (ou deprecar) |
| `app/(ready)/layout.tsx` | MODIFICAR | Remover `<Header />` do layout |
| `app/(ready)/page.tsx` | MODIFICAR | Adicionar `<PageHeader>` na home |
| `app/(ready)/comunidade/page.tsx` | MODIFICAR | Adicionar `<PageHeader>` |
| `app/(ready)/pedidos-oracao/page.tsx` | MODIFICAR | Adicionar `<PageHeader>` |
| `app/(ready)/pedidos-oracao/[id]/page.tsx` | MODIFICAR | Adicionar `<PageHeader backHref="/pedidos-oracao">` |
| `app/(ready)/gravacoes/[id]/page.tsx` | MODIFICAR | Adicionar `<PageHeader backHref="/gravacoes">` |
| `app/(ready)/perfil/page.tsx` | CRIAR | Placeholder da tela de perfil (ou verificar se existe) |

---

## Verificacao pos-refatoracao

- [ ] Todas as telas principais (Inicio, Comunidade, Orar, Gestao) tem titulo grande no topo com avatar ao lado
- [ ] Telas de detalhe tem botao "Voltar" em vez de avatar
- [ ] Avatar clicavel leva pra `/perfil` (mesmo que seja placeholder)
- [ ] Nenhuma tela ficou "sem contexto" ou visualmente desorientadora
- [ ] Aba Gestao mantem logo + nome da igreja
- [ ] Espaco vertical ganho e visivel — mais conteudo aparece acima da dobra
- [ ] Nao ha regressao em modais ou drawers (headers internos preservados)

---

## Dividas tecnicas a registrar

1. **Tela de perfil pessoal** (`/perfil`) — pode ter apenas placeholder nesta entrega. Implementar com: dados do usuario, preferencias de tema, logout, zona de perigo (deletar conta).

2. **Diferenciacao de acesso na Gestao** — membros comuns vs. admins — se nao existe ainda, mapear pra fase seguinte.

3. **Header contextual no scroll** — opcional e futuro: quando o usuario rola, o titulo grande pode encolher e virar um header sticky pequeno com titulo + avatar (padrao iOS Large Title). Nao implementar agora, so registrar.

---

## Notas de implementacao

### Componente PageHeader — variantes sugeridas

Alem da versao basica, considere criar variantes para casos especificos:

```tsx
// Para telas com busca integrada no header
<PageHeaderWithSearch title="Comunidade" onSearch={...} />

// Para telas com acoes (botao "Novo")
<PageHeaderWithAction 
  title="Pedidos" 
  actionLabel="Novo" 
  onAction={...} 
/>

// Para telas de detalhe (simplificado)
<DetailHeader backHref="/rota" title="Detalhe" />
```

Ou manter tudo no `<PageHeader>` com props condicionais — avaliar complexidade.

### Avatar do usuario

O avatar deve buscar a foto do usuario logado. Sugestao de implementacao:

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function UserAvatar() {
  // @ts-ignore
  const me = useQuery(api.members.queries.getCurrent);
  
  return (
    <div className="w-9 h-9 rounded-full bg-muted overflow-hidden">
      {me?.fotoUrl ? (
        <img src={me.fotoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="flex items-center justify-center w-full h-full text-sm font-medium">
          {me?.nome?.charAt(0) || "?"}
        </span>
      )}
    </div>
  );
}
```

### Transicao de paginas

Ao navegar entre telas, o titulo deve aparecer instantaneamente (sem animacao de fade). A animacao de transicao de pagina (se houver) nao deve afetar o header.

### Acessibilidade

- O `<h1>` deve ser o primeiro heading da pagina
- O avatar deve ter `aria-label="Perfil do usuario"`
- Botao voltar deve ter `aria-label="Voltar para [nome da pagina]"`

---

## Metricas de sucesso

- Reducao de ~60-80px de altura em telas principais (de ~145px para ~65-85px de header total)
- Aumento da area visivel de conteudo em ~15%
- Zero reclamacoes de usuarios sobre "nao encontrar" o perfil ou contexto da igreja
