# PRD: Oracao Guiada Fullscreen (REVISADO)

Fix para tornar a tela do deck de oracao guiada uma experiencia fullscreen sem scroll vertical.

**Versao:** 2.0  
**Revisado apos:** Critica multi-perspectiva (arquitetura, performance, a11y, manutencao, edge cases, DX)  
**Status:** Pronto para implementacao

---

## Contexto

A tela de oracao guiada (deck de cards) atualmente permite scroll vertical, o que atrapalha a experiencia — o conteudo se desloca quando o usuario tenta interagir com o card, e gestos verticais (tipo o inicio de um swipe diagonal) acabam rolando a pagina em vez de arrastar o card.

O deck guiado deve se comportar como uma **experiencia imersiva de tela cheia**, tipo stories do Instagram: sem scroll de pagina, sem header global, sem bottom tab bar, altura travada no viewport.

---

## Tensao arquitetural

Anteriormente, aplicamos fix pra que o scroll do app seja do documento (permitindo screenshot "Pagina inteira" no iOS). Essa mudanca e global ao layout do app. Porem, o deck guiado e uma **excecao legitima** — deve ter comportamento fullscreen isolado, sem herdar o scroll global.

A solucao e escopar o comportamento fullscreen apenas na rota `/pedidos-oracao/guiada`, usando um layout dedicado.

**Decisao arquitetural:** O componente `GuidedPrayerDeck` JA tem `fixed inset-0 z-[60]`. Vamos remover essa responsabilidade dele e transferir para um layout dedicado, evitando redundancia e facilitando manutencao.

---

## Implementacao

### 1. Layout dedicado (NOVO)

Criar `app/(ready)/pedidos-oracao/guiada/layout.tsx`:

```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orar | IPC",
  // Previne scroll da pagina pai
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function GuidedPrayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div 
      className="fixed inset-0 overflow-hidden isolate"
      style={{
        backgroundColor: "hsl(var(--pray-background, 48 100% 98%))",
        zIndex: "var(--z-fullscreen, 50)",
        overscrollBehavior: "none",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}
```

**Decisoes:**
- **CSS Variables:** `--z-fullscreen` e `--pray-background` permitem override sem tocar no codigo
- **`isolate`:** Cria novo stacking context, evitando z-index wars
- **`overscrollBehavior: none`:** Bloqueia pull-to-refresh no Chrome Android
- **`touchAction: none`:** Bloqueia scroll nativo em todos os eixos
- **Removido `z-[60]` magico:** Agora usa CSS variable controlada pelo tema

### 2. CSS Variables necessarias (adicionar em `globals.css`)

```css
:root {
  --z-fullscreen: 50;
  --pray-background: 48 100% 98%; /* #fafaf5 em HSL */
}

/* Suporte a prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .guided-prayer-card {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

/* Classes utilitarias */
.touch-none {
  touch-action: none;
}

.touch-pan-x {
  touch-action: pan-x;
}

.overscroll-none {
  overscroll-behavior: none;
}
```

### 3. Container interno da pagina

Atualizar `app/(ready)/pedidos-oracao/guiada/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { GuidedPrayerDeck } from "@features/pedidosOracao/components/GuidedPrayerDeck";
import type { GuidedCardData } from "@features/pedidosOracao/components/GuidedPrayerCard";

export default function GuidedPrayerPage() {
  // @ts-ignore Convex TS2589
  const mural = useQuery(api.pedidosOracao.queries.listMuralRequests, {});

  // Efeito: previne scroll no body quando montado
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  const pedidos: GuidedCardData[] = (mural ?? [])
    .filter((p: any) => p.status === "ATIVO")
    .map((p: any) => ({
      _id: p._id,
      descricao: p.descricao,
      anonimo: !!p.anonimo,
      autor: p.autor ?? null,
      qtdOrando: p.qtdOrando,
      euOrando: p.euOrando,
      primeirosOrantes: p.primeirosOrantes ?? [],
    }));

  return (
    <ModuloGuard modulo="pedidos-oracao">
      <div 
        className="h-dvh flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <GuidedPrayerDeck 
          pedidos={pedidos} 
          variant="fullscreen" // Nova prop para comportamento especifico
        />
      </div>
    </ModuloGuard>
  );
}
```

### 4. Componente GuidedPrayerDeck (REFATORADO)

Atualizar `features/pedidosOracao/components/GuidedPrayerDeck.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { GuidedPrayerCard, type GuidedCardData } from "./GuidedPrayerCard";
import { GuidedPrayerComplete } from "./GuidedPrayerComplete";

interface Props {
  pedidos: GuidedCardData[];
  variant?: "inline" | "fullscreen";
}

/** Pequenos cards "atras" do atual para efeito de baralho. */
function StackLayer({ depth }: { depth: number }) {
  const translateY = depth * 8;
  const scale = 1 - depth * 0.06;
  const opacity = depth === 1 ? 0.5 : 0.2;
  return (
    <motion.div
      aria-hidden
      initial={{ y: translateY, scale, opacity }}
      animate={{ y: translateY, scale, opacity }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 rounded-2xl bg-background border shadow-sm"
      style={{ zIndex: -depth }}
    />
  );
}

export function GuidedPrayerDeck({ pedidos, variant = "inline" }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [orouCount, setOrouCount] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const total = pedidos.length;

  const handleClose = useCallback(() => {
    if (confirm("Encerrar oracao guiada?")) {
      router.push("/pedidos-oracao");
    }
  }, [router]);

  // Keyboard: ESC para fechar (apenas fullscreen)
  useEffect(() => {
    if (variant !== "fullscreen") return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [variant, handleClose]);

  // A11y: esconde conteudo atras quando fullscreen
  useEffect(() => {
    if (variant !== "fullscreen") return;
    
    const main = document.querySelector("main");
    const nav = document.querySelector("nav");
    const header = document.querySelector("header");
    
    const elements = [main, nav, header].filter(Boolean) as HTMLElement[];
    elements.forEach(el => el.setAttribute("aria-hidden", "true"));
    
    return () => {
      elements.forEach(el => el.removeAttribute("aria-hidden"));
    };
  }, [variant]);

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 p-6",
          variant === "fullscreen" ? "flex-1" : "min-h-[50vh]"
        )}
      >
        <p className="text-sm text-muted-foreground">
          Nenhum pedido de oracao ativo.
        </p>
        <button
          type="button"
          onClick={() => router.push("/pedidos-oracao")}
          className="text-sm text-primary underline min-h-11"
        >
          Voltar ao mural
        </button>
      </div>
    );
  }

  const concluido = index >= total;

  return (
    <>
      {/* Skip link para acessibilidade */}
      <a 
        href="#guided-prayer-end"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-2 focus:bg-background"
      >
        Pular para fim da oracao guiada
      </a>

      <div className="flex flex-col flex-1">
        <header className="flex items-center gap-2 px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1 text-xs text-muted-foreground min-h-11 px-1 active:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary rounded"
            aria-label="Encerrar oracao guiada"
          >
            <X className="h-4 w-4" aria-hidden />
            Encerrar
          </button>
          <div className="flex-1" />
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {Math.min(index + 1, total)} de {total}
          </span>
        </header>

        <div className="px-4 flex items-center gap-1">
          {pedidos.map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 h-0.5 rounded-full bg-muted-foreground/20 overflow-hidden"
            >
              <motion.div
                className="h-full bg-foreground"
                initial={false}
                animate={{
                  width: i < index ? "100%" : i === index ? "60%" : "0%",
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </motion.div>
          ))}
        </div>

        <div
          className={cn(
            "flex-1 flex items-stretch justify-center p-4 touch-none",
            concluido && "items-center",
          )}
        >
          {concluido ? (
            <GuidedPrayerComplete
              id="guided-prayer-end"
              total={orouCount}
              onRestart={() => {
                setOrouCount(0);
                setDirection(1);
                setIndex(0);
              }}
            />
          ) : (
            <div className="relative w-full max-w-md h-full mx-auto">
              {/* Cards do baralho atras (visual) - protecao para poucos pedidos */}
              {pedidos.slice(index + 1, index + 3).map((p, i) => (
                <StackLayer key={`${p._id}-${i}`} depth={i + 1} />
              ))}

              <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                <GuidedPrayerCard
                  key={pedidos[index]._id}
                  pedido={pedidos[index]}
                  direction={direction}
                  onAdvance={(orou) => {
                    if (orou) setOrouCount((c) => c + 1);
                    setDirection(1);
                    setIndex((i) => i + 1);
                  }}
                  onPrevious={() => {
                    if (index > 0) {
                      setDirection(-1);
                      setIndex((i) => i - 1);
                    }
                  }}
                />
              </AnimatePresence>
            </div>
          )}
        </div>

        {!concluido && (
          <p className="text-center text-[11px] text-muted-foreground pb-4">
            ← deslize para passar →
          </p>
        )}
      </div>
    </>
  );
}
```

**Mudancas principais:**
1. **Nova prop `variant`:** Permite reuso do componente em contextos inline (futuro) ou fullscreen
2. **Removido `fixed inset-0`:** Agora e responsabilidade do layout pai
3. **Keyboard support:** ESC fecha o deck
4. **A11y:** Skip link, aria-hidden no conteudo de fundo, focus ring nos botoes
5. **Cleanup:** useCallback para handlers, cleanup de event listeners

### 5. Componente GuidedPrayerCard (AJUSTES)

Atualizar `features/pedidosOracao/components/GuidedPrayerCard.tsx`:

```tsx
// ... imports existentes ...

export function GuidedPrayerCard({ pedido, direction, onAdvance, onPrevious }: Props) {
  // ... codigo existente ...

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      style={{ 
        touchAction: "pan-x",
        willChange: "transform", // Hardware acceleration
      }}
      className="guided-prayer-card absolute inset-0" // Classe para reduced-motion
      // ... resto das props
    >
      {/* ... conteudo ... */}
    </motion.div>
  );
}
```

**Adicoes:**
- `willChange: "transform"` para hardware acceleration
- `touchAction: "pan-x"` inline no motion.div (permissao especifica)
- Classe `guided-prayer-card` para reduced-motion CSS

---

## Checklist de Verificacao

### Testes funcionais (obrigatorios)

- [ ] **Sem scroll vertical:** Tentar rolar pra cima/baixo — nada acontece
- [ ] **Drag horizontal funciona:** Swipe lateral passa o card
- [ ] **Swipe diagonal nao rola:** Gestos diagonais sao interpretados como drag, nao scroll
- [ ] **Header/tab bar ocultos:** Nao aparecem visualmente nem no DOM (aria-hidden)
- [ ] **Altura correta iOS:** Barra de endereco aparecer/sumir nao causa saltos
- [ ] **Sem pull-to-refresh:** Chrome Android nao recarrega ao puxar do topo
- [ ] **Encerrar funciona:** Botao volta pra `/pedidos-oracao` com scroll restaurado
- [ ] **Safe area respeitada:** iPhone Dynamic Island nao cobre o header

### Testes de acessibilidade (obrigatorios)

- [ ] **Skip link:** Tab inicial foca no link "Pular para fim"
- [ ] **Focus trap:** Tab nao vaza para elementos atras do overlay
- [ ] **ESC fecha:** Tecla Escape funciona no desktop
- [ ] **Screen reader:** Conteudo de fundo anunciado como "aria-hidden"
- [ ] **Reduced motion:** Animacoes desabilitadas quando preferencia ativa
- [ ] **Contraste:** Texto "Encerrar" e contador tem contraste suficiente

### Testes de edge cases (obrigatorios)

- [ ] **0 pedidos:** Mostra estado vazio funcional
- [ ] **1 pedido:** Nao quebra (StackLayer nao renderiza nada)
- [ ] **2 pedidos:** StackLayer renderiza apenas 1 card atras
- [ ] **Landscape:** Layout nao quebra (pode ter scroll interno no card se necessario)
- [ ] **Teclado virtual:** Se houver input no card, teclado nao empurra layout
- [ ] **Gesture rapido:** Swipe rapido funciona mesmo com pouca distancia

### Testes de regressao (obrigatorios)

- [ ] **Outras telas:** Inicio, Comunidade, Orar mural ainda tem scroll normal
- [ ] **Screenshot iOS:** Paginas normais ainda permitem "Pagina inteira"
- [ ] **Deep link:** Acessar `/pedidos-oracao/guiada` direto funciona
- [ ] **Refresh:** F5 na pagina do deck nao quebra o layout

---

## O que NAO fazer (anti-patterns)

| Nao fazer | Por que |
|-----------|---------|
| Alterar `app/layout.tsx` | Quebra screenshot do iOS em outras telas |
| Usar `h-screen` em vez de `h-dvh` | Causa bugs no iOS Safari quando barra de endereco muda |
| Usar `position: absolute` no layout | Absoluto e relativo ao pai, nao ao viewport |
| Hardcoded `z-[60]` | Usar CSS variable `--z-fullscreen` |
| Inline styles em todos os elementos | Usar classes Tailwind + CSS variables |
| Ignorar `prefers-reduced-motion` | Acessibilidade e obrigatoria |
| Esquecer cleanup do `useEffect` | Vazamento de memoria e event listeners |

---

## Debug durante desenvolvimento

```css
/* Adicionar temporariamente em globals.css */
.debug-guided-prayer * {
  outline: 1px solid rgba(255, 0, 0, 0.3);
}
```

Verificar no DevTools:
1. **Elements > Computed:** `overflow: hidden` no body
2. **Console:** `document.body.style.touchAction` === `"none"`
3. **Device Mode:** Toggle device toolbar, testar gestures

---

## Notas de implementacao

1. **Fallback `h-dvh`:** Safari 14- nao suporta `dvh`. O layout ainda funciona, mas pode ter pequenos glitches. Acceptable.

2. **iOS Safari rubber band:** `overscroll-behavior: none` no body mitiga, mas nao elimina completamente. O `touchAction: none` no container ajuda.

3. **Gestos conflitantes:** Se o usuario fizer um swipe muito rapido e curto, o navegador pode interpretar como scroll. O `dragElastic={0.9}` no framer-motion ajuda a "segurar" o gesto.

4. **Analytics:** Considerar tracking de `deck_completed`, `deck_abandoned` (onbeforeunload), `cards_viewed`.

---

## Arquivos modificados/criados

| Arquivo | Acao |
|---------|------|
| `app/(ready)/pedidos-oracao/guiada/layout.tsx` | CRIAR |
| `app/(ready)/pedidos-oracao/guiada/page.tsx` | MODIFICAR |
| `features/pedidosOracao/components/GuidedPrayerDeck.tsx` | MODIFICAR |
| `features/pedidosOracao/components/GuidedPrayerCard.tsx` | AJUSTAR (willChange) |
| `app/globals.css` | ADICIONAR CSS variables |

---

## Questoes em aberto (para PO/UX)

1. **Input de texto no card?** Se sim, precisamos de tratamento especial pro teclado virtual (ajustar `h-dvh` dinamicamente).

2. **Suporte landscape?** Layout atual e portrait-first. Em landscape, o card pode ficar muito alto. Aceitavel ou precisa de scroll interno no card?

3. **Analytics?** Queremos trackar abandono do deck, tempo por card, etc?

4. **Som/feedback?** Haptic feedback no mobile ao passar card?
