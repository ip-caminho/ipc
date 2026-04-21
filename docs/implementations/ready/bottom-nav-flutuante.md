# PRD: Bottom nav flutuante com blur — chrMS

**Versao:** 2.0
**Status:** Pronto para implementacao
**Data:** 2026-04-21
**Revisao 2.0:** critica aplicada (bloqueadores + decisoes do usuario)

---

## Contexto

O bottom tab bar atual do chrMS e ancorado no fundo da tela, com fundo solido e borda superior. Funciona bem mas e visualmente convencional.

Queremos transforma-lo em um **bottom nav flutuante**: pilula arredondada destacada do fundo, com efeito blur por tras, permitindo que o conteudo da pagina "passe por baixo". Padrao visual moderno, usado por apps como Circle, Airbnb, Revolut.

Quando ha audio tocando, o player e a barra de navegacao passam a ser **um unico bloco empilhado** dentro da mesma pilula (duas linhas: player em cima, tabs embaixo), no lugar de dois blocos separados flutuando.

## O que muda

- Antes: tab bar ocupando 100% da largura, ancorado no bottom, borda superior separando do conteudo; MobileAudioPlayer flutua separado acima
- Depois: pilula arredondada com margens laterais, flutuando sobre o conteudo, blur do que passa por tras; player integrado dentro da mesma pilula quando ativo

Funcionalmente nada muda nos itens de nav — mantem-se o comportamento dinamico atual:
- 3 primarias (Inicio, Comunidade, Orar)
- + Gestao se o usuario tem role elevada
- + Boletim aos domingos

## Implementacao

### Novo componente: `FloatingBottomBar`

Substitui `MobileTabBar` e absorve a funcao do `MobileAudioPlayer` (mobile). O `GlobalAudioPlayer` desktop continua inalterado.

```tsx
// shared/components/layout/FloatingBottomBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  PRIMARY_TABS,
  GESTAO_TAB,
  BOLETIM_TAB,
  ELEVATED_ROLES,
  isDomingoWindow,
  type NavItem,
} from "@shared/constants/navigation";
import { haptic } from "@shared/lib/haptic";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { GlobalAudioPlayer } from "@shared/audio/GlobalAudioPlayer";
import { cn } from "@shared/lib/utils/cn";

export function FloatingBottomBar() {
  const pathname = usePathname();
  const { hasAnyRole, isLoading } = useAuth();
  const { isActive: audioActive } = useAudioPlayer();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (
      pendingHref &&
      (pathname === pendingHref ||
        (pendingHref !== "/dashboard" && pathname.startsWith(pendingHref)))
    ) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const tabs: NavItem[] = useMemo(() => {
    const result = [...PRIMARY_TABS];
    if (hasAnyRole(ELEVATED_ROLES)) result.push(GESTAO_TAB);
    if (isDomingoWindow()) result.push(BOLETIM_TAB);
    return result;
  }, [hasAnyRole]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (isLoading) return null;

  return (
    <nav
      className="md:hidden fixed bottom-4 left-4 right-4 z-[56]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <div
        className={cn(
          "flex flex-col overflow-hidden border bg-background/75 supports-[backdrop-filter]:bg-background/60",
          audioActive ? "rounded-3xl" : "rounded-full",
        )}
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderColor: "var(--floating-bar-border)",
        }}
      >
        {audioActive && (
          <div className="border-b border-border/50">
            <GlobalAudioPlayer compact />
          </div>
        )}
        <div className="flex items-stretch px-2 py-1.5">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            const loading = pendingHref === tab.href && !active;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                onClick={() => {
                  if (!active) {
                    haptic(15);
                    setPendingHref(tab.href);
                  }
                }}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] rounded-2xl transition-colors",
                  active
                    ? "text-primary"
                    : loading
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-[stroke-width]",
                    active && "[&_*]:stroke-[2.25]",
                    loading && "animate-pulse",
                  )}
                />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

**Pontos-chave:**
- Reutiliza `PRIMARY_TABS`, `GESTAO_TAB`, `BOLETIM_TAB` e `ELEVATED_ROLES` de [shared/constants/navigation.ts](shared/constants/navigation.ts) — preserva dinamismo de roles + domingo
- Reutiliza `haptic()` de [shared/lib/haptic.ts](shared/lib/haptic.ts)
- Usa `useAudioPlayer()` para detectar se ha audio ativo e integrar `GlobalAudioPlayer` dentro da pilula (prop nova `compact` necessaria — ver abaixo)
- Mantem o estado `pendingHref` da implementacao atual para preservar o loading pulse ao trocar de aba
- z-index `[56]` (acima do player integrado, acima do conteudo scrollable)
- `isActive` trata `/dashboard` como caso especial para nao casar todas as rotas

### Alteracao em GlobalAudioPlayer (prop `compact`)

`GlobalAudioPlayer` ganha uma prop `compact?: boolean` para renderizar sem a borda externa (`border-t`) e com altura menor quando dentro da `FloatingBottomBar`. Padrao mantem o visual atual.

### Alteracao em `app/(ready)/layout.tsx`

- Trocar `<MobileTabBar />` por `<FloatingBottomBar />`
- Remover `<MobileAudioPlayer />` do layout (agora esta dentro da FloatingBottomBar)
- Manter `<AudioPlayer />` desktop inalterado

### Tokens de cor (oklch, compativel com design system)

```css
/* app/globals.css — adicionar no :root */
:root {
  --floating-bar-border: oklch(0.92 0 0);
}

.dark {
  --floating-bar-border: oklch(0.28 0 0);
}

/* Fallback quando backdrop-filter nao e suportado:
   usa bg-background/75 via Tailwind (oklch nativo com alpha)
   e promove a 95% de opacidade pra garantir contraste */
@supports not (backdrop-filter: blur(1px)) {
  .floating-bottom-bar-container {
    background-color: var(--background) !important;
  }
}
```

O fundo usa `bg-background/75 supports-[backdrop-filter]:bg-background/60` — Tailwind resolve o alpha via `color-mix` automaticamente em oklch. Sem `rgba()` hardcoded.

### Ajuste no padding-bottom do conteudo (centralizado)

Hoje [PlayerAwareMain](shared/audio/PlayerAwareMain.tsx) aplica `paddingBottom: calc(6rem + env(safe-area-inset-bottom))` = 96px. Com a pilula flutuante (16px de margem inferior + altura ~64px = 80px) + margem extra de respiro, manter 96px cobre bem **mesmo com audio ativo** (pilula vira ~130px, mas 96px + 16px bottom-4 = 112px visivel acima da pill na pior das hipoteses; validar em device).

**Decisao:** deixar o padding como esta; ajustar so se testes mostrarem item cortado.

### Drawer deixa de expor a tab bar (decisao 2b)

Em [shared/components/ui/drawer.tsx](shared/components/ui/drawer.tsx):

```tsx
// Linha 51 — overlay:
// ANTES: "fixed inset-0 bottom-17 md:bottom-0 z-[57] bg-black/50 ..."
// DEPOIS: "fixed inset-0 z-[57] bg-black/50 ..."

// Linha 72 — content bottom:
// ANTES: "data-[vaul-drawer-direction=bottom]:bottom-14 data-[vaul-drawer-direction=bottom]:md:bottom-0 ..."
// DEPOIS: "data-[vaul-drawer-direction=bottom]:bottom-0 ..."
```

O overlay passa a cobrir ate o chao; a pilula fica coberta enquanto o drawer esta aberto. Remove inconsistencia visual em drawers de confirmacao/form (NewRequestModal, AddUpdateModal, shadcn drawers do app).

### Fade no final do scroll (opcional)

Mesmo texto/decisao do PRD v1: implementar so se o corte ficar visualmente estranho em device real. Se for feito, aplicar no container do `PlayerAwareMain` (nao em todos os `<main>`) para nao afetar elementos posicionados (FAB, UserMenu em HeaderLayout).

### Fallback para browsers sem backdrop-filter

O Tailwind `supports-[backdrop-filter]:bg-background/60` ja resolve a maior parte. Complementar com `@supports not` no CSS como fallback defensivo (ver secao de tokens acima).

## Verificacao pos-implementacao

Testar no celular:

1. **Blur visivel:** ao rolar, conteudo atras da pilula fica borrado
2. **Aba ativa destacada:** `text-primary` com stroke mais grosso (2.25) vs inativa `text-muted-foreground` com stroke 1.75 — testar contraste WCAG AA nos dois temas
3. **Haptic ao navegar:** vibracao curta (15ms) ao trocar de aba (so se nao ja estiver ativa)
4. **Loading pulse:** ao tocar aba inativa, icone pulsa e fundo fica `bg-primary/10` ate nova rota carregar
5. **Safe area respeitada:** em iPhone com home indicator, pilula nao cola na borda
6. **Conteudo nao escondido:** ultimo item scrollavel visivel quando rola ate o fim
7. **Com audio ativo:** player e tabs aparecem empilhados dentro da mesma pilula arredondada (corners `rounded-3xl` quando expandida)
8. **Dark mode:** contraste adequado nas duas variantes
9. **Drawer aberto:** pilula some (coberta pelo overlay preto do drawer); ao fechar, reaparece
10. **Performance:** scroll a 60fps, sem jank no blur
11. **Admin:** aba Gestao aparece na pilula quando user tem role elevada
12. **Domingo:** aba Boletim aparece nas horas de `isDomingoWindow()`
13. **Rotas corretas:** `/dashboard`, `/comunidade`, `/pedidos-oracao`, `/gestao`, `/boletim` — nao `/` nem `/orar`

## O que nao fazer

- Nao mudar os itens do tab bar ou a logica dinamica (role + domingo)
- Nao adicionar animacao elaborada na troca de aba — manter transicao de cor simples + pulse de loading
- Nao criar icone de busca flutuante separado
- Nao trocar os icones lucide atuais
- Nao implementar dark toggle aqui — ja existe
- Nao aplicar mask-image globalmente em `<main>` — so no container centralizado se necessario

## Dividas tecnicas a registrar (se aparecer)

- **Jank no blur em Android baixa-potencia:** flag pra desabilitar blur e usar bg opaco em devices com `hardware: low`
- **Gesture de hide-on-scroll:** pilula pode sumir quando rola pra baixo e reaparecer quando rola pra cima (padrao iOS Safari bottom bar). Registrar como evolucao.
- **Fix do `MOBILE_BOTTOM_OFFSET` em MobileAudioPlayer:18** — valor calc esta errado (112px exportado vs 68px real). Nenhum consumer externo hoje, mas corrigir oportunisticamente ao remover MobileAudioPlayer.

## Entrega esperada

1. Componente `<FloatingBottomBar>` com visual flutuante + blur + integracao do audio player
2. Prop `compact` em `GlobalAudioPlayer`
3. Remocao de `<MobileAudioPlayer />` do layout e substituicao de `<MobileTabBar />` por `<FloatingBottomBar />`
4. Ajuste em `drawer.tsx` para cobrir ate o chao no mobile
5. Tokens CSS em oklch (`--floating-bar-border`) em light e dark
6. Haptic feedback + loading pulse preservados
7. Fallback `@supports not (backdrop-filter)`
8. Confirmacao visual em light e dark mode, com e sem audio ativo, no mobile emulado
