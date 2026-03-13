"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";

interface PageContext {
  nome: string;
  pagina: string;
  arquivos: string[];
  queries?: string[];
  mutations?: string[];
  componentes?: string[];
  notas?: string[];
}

const CONTEXT_MAP: Record<string, PageContext> = {
  "/": {
    nome: "Dashboard",
    pagina: "app/(ready)/page.tsx",
    arquivos: [
      "app/(ready)/page.tsx",
      "features/gravacoes/components/AvisosWidget.tsx",
    ],
    queries: ["gravacoes.queries.getLatestAvisos", "membros.queries.birthdaysThisMonth"],
    mutations: ["membros.bootstrap.bootstrapAdmin"],
    componentes: ["AvisosWidget", "BootstrapForm"],
    notas: ["Mostra avisos da semana + aniversariantes do mes"],
  },
  "/membros": {
    nome: "Lista de Membros",
    pagina: "app/(ready)/membros/page.tsx",
    arquivos: [
      "app/(ready)/membros/page.tsx",
      "features/membros/components/MembroTable.tsx",
    ],
    queries: ["membros.queries.list"],
    componentes: ["MembroTable", "PermissionGate"],
    notas: ["Permissao: membros:read"],
  },
  "/membros/novo": {
    nome: "Novo Membro",
    pagina: "app/(ready)/membros/novo/page.tsx",
    arquivos: [
      "app/(ready)/membros/novo/page.tsx",
      "features/membros/components/MembroForm.tsx",
      "features/membros/lib/validations.ts",
    ],
    mutations: ["membros.mutations.create"],
    componentes: ["MembroForm"],
    notas: ["Permissao: membros:create"],
  },
  "/membros/[id]": {
    nome: "Detalhe do Membro",
    pagina: "app/(ready)/membros/[id]/page.tsx",
    arquivos: [
      "app/(ready)/membros/[id]/page.tsx",
      "features/membros/components/MembroForm.tsx",
    ],
    queries: ["membros.queries.getById"],
    mutations: ["membros.mutations.update"],
    componentes: ["MembroForm"],
    notas: ["Permissao: membros:read, membros:update"],
  },
  "/entidades": {
    nome: "Lista de Entidades",
    pagina: "app/(ready)/entidades/page.tsx",
    arquivos: [
      "app/(ready)/entidades/page.tsx",
      "features/entidades/lib/constants.ts",
    ],
    queries: ["entidades.queries.list"],
    componentes: ["PermissionGate"],
    notas: ["Permissao: entidades:read. Exibe PF e PJ com papeis"],
  },
  "/entidades/novo": {
    nome: "Nova Entidade",
    pagina: "app/(ready)/entidades/novo/page.tsx",
    arquivos: ["app/(ready)/entidades/novo/page.tsx"],
    mutations: ["entidades.mutations.create"],
    notas: ["Permissao: entidades:create"],
  },
  "/diretorio": {
    nome: "Diretorio de Membros",
    pagina: "app/(ready)/diretorio/page.tsx",
    arquivos: ["app/(ready)/diretorio/page.tsx"],
    queries: ["membros.queries.list", "membros.queries.birthdaysThisMonth"],
    notas: ["Permissao: diretorio:read. Visao publica com telefone, cargo, aniversarios"],
  },
  "/gravacoes": {
    nome: "Lista de Gravacoes (visao membro)",
    pagina: "app/(ready)/gravacoes/page.tsx",
    arquivos: [
      "app/(ready)/gravacoes/page.tsx",
      "features/gravacoes/components/BibleBookFilter.tsx",
      "features/gravacoes/lib/bible.ts",
    ],
    queries: ["gravacoes.queries.list", "gravacoes.queries.listTags"],
    componentes: ["BibleBookFilter"],
    notas: [
      "Apenas visao para membros — sem criar/editar/excluir",
      "Mostra apenas gravacoes PUBLICADO",
      "Filtros: tag, livro da biblia, busca texto",
      "Agrupamento: por data ou por pregador",
      "Criacao/edicao feita em /admin/gravacoes",
    ],
  },
  "/gravacoes/nova": {
    nome: "Nova Gravacao",
    pagina: "app/(ready)/gravacoes/nova/page.tsx",
    arquivos: [
      "app/(ready)/gravacoes/nova/page.tsx",
      "features/gravacoes/components/GravacaoForm.tsx",
      "shared/files/components/FileUpload.tsx",
      "shared/files/hooks/useAudioCompressor.ts",
    ],
    mutations: ["gravacoes.ai.createFromAudio"],
    componentes: ["GravacaoForm", "FileUpload"],
    notas: [
      "Permissao: gravacoes:create",
      "Data padrao: ultimo domingo",
      "Audio comprimido client-side (FFmpeg.wasm → 64kbps MP3)",
      "Upload via presigned URL para B2",
    ],
  },
  "/gravacoes/[id]": {
    nome: "Detalhe da Gravacao (visao membro)",
    pagina: "app/(ready)/gravacoes/[id]/page.tsx",
    arquivos: [
      "app/(ready)/gravacoes/[id]/page.tsx",
      "shared/files/components/SecureAudioPlayer.tsx",
      "features/gravacoes/components/Reacoes.tsx",
      "features/gravacoes/components/Comentarios.tsx",
      "features/gravacoes/hooks/useEscutaTracker.ts",
    ],
    queries: ["gravacoes.queries.getById"],
    componentes: [
      "SecureAudioPlayer",
      "Reacoes",
      "Comentarios",
    ],
    notas: [
      "Apenas visao para membros — sem editar/publicar/excluir/reprocessar",
      "Audio restrito ao trecho do sermao (inicioSermao/fimSermao)",
      "Edicao/admin feita em /gravacoes/[id]/admin",
    ],
  },
  "/gravacoes/[id]/admin": {
    nome: "Admin da Gravacao",
    pagina: "app/(ready)/gravacoes/[id]/admin/page.tsx",
    arquivos: [
      "app/(ready)/gravacoes/[id]/admin/page.tsx",
      "features/gravacoes/components/IaResultadoDisplay.tsx",
      "features/gravacoes/components/SegmentEditor.tsx",
      "features/gravacoes/components/IaProcessarButton.tsx",
      "features/gravacoes/components/IaProgressPanel.tsx",
      "shared/files/components/SecureAudioPlayer.tsx",
    ],
    queries: ["gravacoes.queries.getById"],
    mutations: ["gravacoes.mutations.update"],
    componentes: [
      "AvisosEditor (inline)",
      "IaResultadoDisplay",
      "SegmentEditor",
      "SecureAudioPlayer",
    ],
    notas: [
      "Permissao: gravacoes:update ou gravacoes:process_ai",
      "Tabs: Avisos, Resultado IA, Segmentos, Audio completo",
      "AvisosEditor: editar titulo/descricao de cada aviso",
      "SegmentEditor: ajustar inicioSermao/fimSermao/inicioAvisos/fimAvisos",
    ],
  },
  "/admin/permissoes": {
    nome: "Permissoes e Convites",
    pagina: "app/(ready)/admin/permissoes/page.tsx",
    arquivos: [
      "app/(ready)/admin/permissoes/page.tsx",
      "features/preferencias/components/PermissionMatrix.tsx",
      "convex/preferencias/rbac.ts",
      "types/auth.ts",
    ],
    mutations: ["membros.convites.generateInvite"],
    componentes: ["PermissionMatrix", "AdminGate"],
    notas: [
      "Somente admin",
      "Tabs: Roles e Permissoes, Convites",
      "Gera links de convite com role (membro/secretaria)",
    ],
  },
  "/admin/gravacoes": {
    nome: "Gerenciar Gravacoes (Admin)",
    pagina: "app/(ready)/admin/gravacoes/page.tsx",
    arquivos: [
      "app/(ready)/admin/gravacoes/page.tsx",
      "features/gravacoes/components/IaStatusBadge.tsx",
    ],
    queries: ["gravacoes.queries.list"],
    componentes: ["GravacaoAdminCard (inline)", "AdminGate", "IaStatusBadge"],
    notas: [
      "Somente admin",
      "Lista todas as gravacoes com filtros de status e status IA",
      "Link Gerenciar → /gravacoes/[id]/admin",
    ],
  },
  "/meu-perfil": {
    nome: "Meu Perfil",
    pagina: "app/(ready)/meu-perfil/page.tsx",
    arquivos: ["app/(ready)/meu-perfil/page.tsx"],
    queries: ["membros.selfService.getMyProfile"],
    mutations: ["membros.selfService.updateMyProfile"],
    notas: ["Self-service: membro edita seus proprios dados"],
  },
  "/signin": {
    nome: "Login",
    pagina: "app/(auth)/signin/page.tsx",
    arquivos: ["app/(auth)/signin/page.tsx", "convex/auth/phoneOTP.ts"],
    mutations: ["audit.mutations.logLogin"],
    notas: ["WhatsApp OTP (bypass em dev)", "Valida status do membro no login"],
  },
};

function resolveRoute(pathname: string): PageContext | null {
  // Exact match
  if (CONTEXT_MAP[pathname]) return CONTEXT_MAP[pathname];

  // /gravacoes/[id]/admin
  if (/^\/gravacoes\/[^/]+\/admin$/.test(pathname)) return CONTEXT_MAP["/gravacoes/[id]/admin"];
  // /gravacoes/[id]
  if (/^\/gravacoes\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/gravacoes/[id]"];
  // /membros/[id]
  if (/^\/membros\/[^/]+$/.test(pathname) && pathname !== "/membros/novo") return CONTEXT_MAP["/membros/[id]"];
  // /convite/[token]
  if (/^\/convite\/[^/]+$/.test(pathname)) return CONTEXT_MAP["/signin"];

  return null;
}

function buildMarkdown(pathname: string, ctx: PageContext): string {
  const lines: string[] = [
    `## Contexto: ${ctx.nome}`,
    "",
    `**Rota**: \`${pathname}\``,
    `**Pagina**: \`${ctx.pagina}\``,
    "",
  ];

  if (ctx.arquivos.length > 0) {
    lines.push("### Arquivos relacionados");
    for (const a of ctx.arquivos) lines.push(`- \`${a}\``);
    lines.push("");
  }

  if (ctx.queries && ctx.queries.length > 0) {
    lines.push("### Queries");
    for (const q of ctx.queries) lines.push(`- \`api.${q}\``);
    lines.push("");
  }

  if (ctx.mutations && ctx.mutations.length > 0) {
    lines.push("### Mutations");
    for (const m of ctx.mutations) lines.push(`- \`api.${m}\``);
    lines.push("");
  }

  if (ctx.componentes && ctx.componentes.length > 0) {
    lines.push("### Componentes");
    for (const c of ctx.componentes) lines.push(`- ${c}`);
    lines.push("");
  }

  if (ctx.notas && ctx.notas.length > 0) {
    lines.push("### Notas");
    for (const n of ctx.notas) lines.push(`- ${n}`);
    lines.push("");
  }

  lines.push("### Arquivos globais uteis");
  lines.push("- `convex/schema.ts` — Schema completo");
  lines.push("- `convex/preferencias/rbac.ts` — RBAC e permissoes");
  lines.push("- `types/auth.ts` — Tipos de permissao");
  lines.push("- `shared/components/layout/AppSidebar.tsx` — Sidebar/navegacao");
  lines.push("- `CLAUDE.md` — Instrucoes do projeto");

  return lines.join("\n");
}

export function DevContext() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isAdmin) return null;

  const ctx = resolveRoute(pathname);

  const markdown = ctx
    ? buildMarkdown(pathname, ctx)
    : `## Contexto\n\n**Rota**: \`${pathname}\`\n\nPagina sem mapeamento de contexto.`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  return (
    <>
      <div
        className="fixed bottom-3 right-3 w-4 h-4 z-50 cursor-pointer opacity-0 hover:opacity-10"
        onDoubleClick={() => setOpen(true)}
        title=""
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-medium">Contexto da Pagina</DialogTitle>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">
            {markdown}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
