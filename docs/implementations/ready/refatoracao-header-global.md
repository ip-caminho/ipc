# PRD: Refatoracao do Header Global do chrMS (REVISADO)

**Versao:** 2.0  
**Status:** Em revisao - CORRECOES APLICADAS  
**Data:** 2026-04-20

---

## Resumo das Correcoes (apos critica)

Esta versao corrige problemas criticos identificados na revisao:
- ✅ Rota correta de perfil: `/meu-perfil` (nao `/perfil`)
- ✅ Home page correta: `/dashboard` (nao `/`)
- ✅ Funcoes do MobileHeader preservadas (tema, logout) via dropdown no avatar
- ✅ Estrategia desktop definida (sidebar trigger movido para AppSidebar)
- ✅ Rollout dividido em 2 fases (piloto + expansao)
- ✅ Componentes separados (PageHeader vs DetailHeader)

---

## Contexto

O header global atual mostra:
- **Desktop (`Header.tsx`):** Sidebar trigger + avatar com nome
- **Mobile (`MobileHeader.tsx`):** Logo "IPC" + dropdown com tema/logout/perfil

Problemas:
- Ocupa ~85px em todas as telas
- Logo da igreja e redundante (usuario nao alterna entre igrejas)
- Avatar mobile tem funcoes criticas (tema, logout) escondidas em dropdown

Solucao: Remover header global, integrar titulo em cada tela (Large Title pattern), avatar com dropdown no canto superior direito.

---

## FASE 1: Piloto (3 telas)

Validar o padrao antes de expandir para todo o app.

### Telas do piloto:
1. `/dashboard` (Home) - tela mais visitada
2. `/pedidos-oracao` - exemplo de aba com tabs
3. `/pedidos-oracao/[id]` - exemplo de tela de detalhe

### Componentes a criar

#### 1. PageHeader (titulos de secao)
```tsx
// shared/components/layout/PageHeader.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="pt-4 pb-3">
      <h1 className="text-2xl font-medium leading-tight">{title}</h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
```

#### 2. DetailHeader (telas de detalhe)
```tsx
// shared/components/layout/DetailHeader.tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface DetailHeaderProps {
  title?: string;
  backHref: string;
}

export function DetailHeader({ title, backHref }: DetailHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 pt-4 pb-3">
      <button
        onClick={() => router.push(backHref)}
        className="flex items-center gap-1 text-sm text-muted-foreground -ml-1 px-1 py-2"
        aria-label="Voltar"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </button>
      {title && (
        <h1 className="text-lg font-medium truncate">{title}</h1>
      )}
    </div>
  );
}
```

#### 3. UserMenu (avatar + dropdown)
```tsx
// shared/components/layout/UserMenu.tsx
"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useAuthActions } from "@convex-dev/auth/react";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

export function UserMenu() {
  const { name, role, foto } = useAuth();
  const { signOut } = useAuthActions();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Menu do usuario"
      >
        <Avatar className="h-9 w-9">
          {foto && <AvatarImage src={foto} alt={name || "Usuario"} />}
          <AvatarFallback className="text-xs">
            {name?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{name || "Usuario"}</span>
          {role && (
            <span className="truncate text-xs text-muted-foreground font-normal">
              {role}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/meu-perfil" className="cursor-pointer">
            <User className="size-4 mr-2" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="cursor-pointer"
        >
          {isDark ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
          Tema {isDark ? "claro" : "escuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut()}
          className="cursor-pointer"
        >
          <LogOut className="size-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 4. HeaderLayout (wrapper com avatar)
```tsx
// shared/components/layout/HeaderLayout.tsx
import { UserMenu } from "./UserMenu";

interface HeaderLayoutProps {
  children: React.ReactNode;
  showUserMenu?: boolean;
}

export function HeaderLayout({ children, showUserMenu = true }: HeaderLayoutProps) {
  return (
    <div className="relative">
      {showUserMenu && (
        <div className="absolute top-4 right-4 z-10">
          <UserMenu />
        </div>
      )}
      {children}
    </div>
  );
}
```

### Modificacoes no piloto

#### `/dashboard/page.tsx`
```tsx
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";

// ... dentro do return:
<HeaderLayout>
  <PageHeader 
    title={`Boa noite, ${userName}`} 
    subtitle={formatDate(new Date())} 
  />
  {/* resto do conteudo */}
</HeaderLayout>
```

#### `/pedidos-oracao/page.tsx`
```tsx
<HeaderLayout>
  <PageHeader title="Orar" />
  <Tabs defaultValue="mural">...</Tabs>
</HeaderLayout>
```

#### `/pedidos-oracao/[id]/page.tsx`
```tsx
import { DetailHeader } from "@shared/components/layout/DetailHeader";

// ...
<DetailHeader backHref="/pedidos-oracao" />
{/* ou com titulo: <DetailHeader title="Pedido" backHref="/pedidos-oracao" /> */}
```

### Estrategia Desktop (Fase 1)

Manter `Header.tsx` mas **simplificado**:
- Remover avatar e nome
- Manter apenas sidebar trigger
- Altura reduzida para h-12

```tsx
// Header.tsx simplificado
export function Header() {
  return (
    <header className="hidden md:flex sticky top-0 z-40 h-12 shrink-0 items-center border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
    </header>
  );
}
```

### Verificacao Fase 1

- [ ] Dashboard: titulo + avatar visiveis, menu funciona
- [ ] Pedidos: titulo + avatar, tabs funcionam
- [ ] Detalhe: botao voltar funciona, sem avatar
- [ ] Mobile: tema e logout acessiveis via dropdown
- [ ] Desktop: sidebar trigger funciona
- [ ] Nenhuma regressao em gestos/swipe

**Se validacao positiva:** Proceder para Fase 2  
**Se problemas:** Ajustar e revalidar

---

## FASE 2: Expansao (todas as telas)

Aplicar padrao a todas as paginas restantes, com adaptacoes especificas.

### Telas com PageHeader (titulo + avatar)

| Tela | Titulo | Subtitulo |
|------|--------|-----------|
| `/dashboard` | `Boa noite, {nome}` | Data atual |
| `/comunidade` | Comunidade | "O que esta fresco na IPC" |
| `/pedidos-oracao` | Orar | - |
| `/gravacoes` | Gravacoes | - |
| `/pequenos-grupos` | Pequenos Grupos | - |
| `/ministerios` | Ministerios | - |
| `/calendario` | Calendario | - |
| `/diretorio` | Diretorio | - |
| `/boletim` | Boletim | - |
| `/cultos` | Cultos | - |
| `/biblioteca` | Biblioteca | - |
| `/turmas` | Turmas | - |
| `/tarefas` | Tarefas | - |
| `/multimidia` | Multimidia | - |
| `/salas` | Salas | - |
| `/educacional` | Educacional | - |
| `/louvor` | Louvor | - |
| `/escalas` | Escalas | - |
| `/pastoreio` | Pastoreio | - |
| `/membros` | Membros | - |
| `/entidades` | Entidades | - |
| `/avisos` | Avisos | - |

### Telas com DetailHeader (botao voltar)

Todas as rotas `[id]` e subpaginas:
- `/pedidos-oracao/[id]`
- `/gravacoes/[id]`
- `/pequenos-grupos/[id]`
- `/ministerios/[id]`
- `/cultos/[id]`
- `/turmas/[id]`
- `/biblioteca/[id]`
- `/salas/[id]`
- `/educacional/turma/[id]`
- `/tarefas/[id]`
- `/admin/*` (manter como esta - ver excecao abaixo)

### Excecao: Aba Gestao

A aba `/gestao` **mantem header proprio** ou usa versao especial:

```tsx
// Opcao A: Manter como esta (ja tem header interno)
// Opcao B: PageHeader com logo
<HeaderLayout showUserMenu={false}>
  <div className="flex items-center gap-2">
    <Church className="h-6 w-6" />
    <PageHeader title="Gestao" subtitle="Ferramentas operacionais" />
  </div>
</HeaderLayout>
```

**Recomendacao:** Opcao A (manter) - menos risco.

### Excecao: Admin

Telas em `/admin/*` mantem header existente (ja tem `AdminGate` e layout proprio).

---

## Arquivos Modificados

### Fase 1 (Piloto)

| Arquivo | Acao |
|---------|------|
| `shared/components/layout/UserMenu.tsx` | CRIAR |
| `shared/components/layout/HeaderLayout.tsx` | CRIAR |
| `shared/components/layout/PageHeader.tsx` | CRIAR |
| `shared/components/layout/DetailHeader.tsx` | CRIAR |
| `shared/components/layout/Header.tsx` | SIMPLIFICAR (remover avatar) |
| `app/(ready)/dashboard/page.tsx` | MODIFICAR (adicionar PageHeader) |
| `app/(ready)/pedidos-oracao/page.tsx` | MODIFICAR (adicionar PageHeader) |
| `app/(ready)/pedidos-oracao/[id]/page.tsx` | MODIFICAR (adicionar DetailHeader) |

### Fase 2 (Expansao)

| Arquivo | Acao |
|---------|------|
| Todas as `page.tsx` em `(ready)/*/` | MODIFICAR (adicionar PageHeader) |
| Todas as `page.tsx` em `(ready)/*/[id]/` | MODIFICAR (adicionar DetailHeader) |
| `shared/components/layout/MobileHeader.tsx` | REMOVER (deprecado) |

---

## O Que Nao Fazer

- ❌ Nao remover Header.tsx antes de ter UserMenu funcionando
- ❌ Nao esquecer de migrar funcoes (tema, logout) do MobileHeader
- ❌ Nao aplicar em telas admin sem validacao
- ❌ Nao mudar rotas (manter `/meu-perfil`)
- ❌ Nao criar `/` - usar `/dashboard` como home

---

## Rollback Plan

Se necessario voltar atras:

1. Restaurar `MobileHeader.tsx` e `Header.tsx` originais
2. Remover imports de `PageHeader`, `DetailHeader`, `HeaderLayout`
3. Reverter modificacoes nas paginas (git checkout)

Tempo estimado de rollback: 15 minutos.

---

## Checklist de Validacao

### Fase 1 (antes de expandir)
- [ ] UserMenu abre e mostra nome/role
- [ ] Tema claro/escuro funciona via dropdown
- [ ] Logout funciona via dropdown
- [ ] Link "Meu perfil" vai para `/meu-perfil`
- [ ] PageHeader renderiza titulo e subtitulo
- [ ] DetailHeader renderiza botao voltar funcional
- [ ] Desktop: sidebar trigger acessivel
- [ ] Mobile: gestos de swipe nao conflitam

### Fase 2 (apos expansao)
- [ ] Todas as paginas principais tem PageHeader
- [ ] Todas as paginas de detalhe tem DetailHeader
- [ ] Nenhuma pagina sem titulo/contexto
- [ ] Nenhum link quebrado
- [ ] Espaco vertical ganho mensuravel (~60px)

---

## Dividas Tecnicas

1. **Header contextual no scroll:** Futuramente, titulo pode encolher ao rolar (iOS Large Title). Nao implementar agora.

2. **Busca integrada:** PageHeaderWithSearch para Comunidade/Gravacoes. Registrar para proxima fase.

3. **Acoes no header:** PageHeaderWithAction para "Novo" botao. Registrar para proxima fase.

---

## Metricas de Sucesso

- Reducao de ~60-80px de altura nas telas piloto
- Zero perda de funcionalidade (tema, logout, perfil)
- Tempo de navegacao mantido ou melhorado
- Zero reclamacoes de usuarios sobre "nao encontrar" funcoes
