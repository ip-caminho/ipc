"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { LogIn, FilePlus, Pencil, Trash2 } from "lucide-react";

const TABELA_LABEL: Record<string, string> = {
  membros: "membro",
  entidades: "perfil",
  gravacoes: "gravacao",
  auth: "autenticacao",
};

function formatarData(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

function descreve(item: {
  action: string;
  tabela: string;
  field: string | null;
  valor: string | null;
}): { icon: React.ReactNode; texto: string } {
  const tabela = TABELA_LABEL[item.tabela] ?? item.tabela;
  switch (item.action) {
    case "LOGIN":
      return { icon: <LogIn className="h-4 w-4" />, texto: `Acesso${item.valor ? ` (${item.valor})` : ""}` };
    case "CREATE":
      return { icon: <FilePlus className="h-4 w-4" />, texto: `Criou ${tabela}` };
    case "FIELD_CHANGE":
      return { icon: <Pencil className="h-4 w-4" />, texto: `Editou ${item.field ?? "campo"} (${tabela})` };
    case "DELETE":
      return { icon: <Trash2 className="h-4 w-4" />, texto: `Removeu ${tabela}` };
    default:
      return { icon: <Pencil className="h-4 w-4" />, texto: item.action };
  }
}

export function AtividadeMembroDrawer({
  membroId,
  nome,
  open,
  onOpenChange,
}: {
  membroId: Id<"membros"> | null;
  nome: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const atividade = useQuery(
    api.membros.acesso.getAtividadeMembro,
    membroId ? { membroId, limit: 50 } : "skip"
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Atividade — {nome}</SheetTitle>
          <SheetDescription>Acessos e acoes principais na plataforma</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {atividade === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : atividade.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
          ) : (
            <ul className="space-y-3">
              {atividade.map((item) => {
                const { icon, texto } = descreve(item);
                return (
                  <li key={item.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 text-muted-foreground">{icon}</span>
                    <div className="flex-1">
                      <p>{texto}</p>
                      <p className="text-xs text-muted-foreground">{formatarData(item.em)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
