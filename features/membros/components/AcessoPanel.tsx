"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeToE164 } from "@convex/messaging/phoneUtils";
import { cn } from "@shared/lib/utils/cn";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/shared/components/ui/input-group";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Copy, MessageCircle, History } from "lucide-react";
import { toast } from "sonner";
import { AtividadeMembroDrawer } from "./AtividadeMembroDrawer";
import { LinkConvidadoCard } from "@features/gravacoes/components/LinkConvidadoCard";

type Row = {
  membroId: Id<"membros">;
  nome: string;
  whatsapp: string | null;
  ativado: boolean;
  onboardingCompleto: boolean;
  temLinkPendente: boolean;
  metodoAtivacao: "link" | "direto" | null;
  ultimoAcessoEm: number | null;
};

function formatarData(ms: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function mensagemWa(nome: string, link: string): string {
  return `Ola, ${nome.split(" ")[0]}! Seu acesso ao sistema da igreja esta pronto. Crie sua senha neste link (valido por 7 dias): ${link}`;
}

function ResumoCard({
  label,
  valor,
  ativo,
  onClick,
}: {
  label: string;
  valor: string | number;
  ativo?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        onClick && "cursor-pointer hover:bg-accent/40 transition-colors",
        ativo && "ring-2 ring-primary border-primary"
      )}
    >
      <CardContent className="p-4">
        <p className="text-2xl font-semibold">{valor}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export function AcessoPanel() {
  const data = useQuery(api.membros.acesso.getAcessosOverview, {});
  const gerarLink = useMutation(api.membros.acesso.gerarLink);
  const resetarAcesso = useMutation(api.membros.acesso.resetarAcesso);

  const [link, setLink] = useState<{ url: string; row: Row } | null>(null);
  const [lote, setLote] = useState<string | null>(null);
  const [loteLoading, setLoteLoading] = useState(false);
  const [atividade, setAtividade] = useState<{ id: Id<"membros">; nome: string } | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "ativados" | "pendentes" | "sem">("todos");

  function alternarFiltro(f: "ativados" | "pendentes" | "sem") {
    setFiltro((atual) => (atual === f ? "todos" : f));
  }

  async function resetar(row: Row) {
    if (!confirm(`Resetar o acesso de ${row.nome}? Perde o login atual e podera se cadastrar de novo (nova senha).`)) return;
    try {
      await resetarAcesso({ membroId: row.membroId });
      toast.success("Acesso resetado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao resetar");
    }
  }

  async function gerar(row: Row) {
    try {
      const { token } = await gerarLink({ membroId: row.membroId });
      setLink({ url: `${window.location.origin}/ativar/${token}`, row });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar link");
    }
  }

  async function gerarLote(rows: Row[]) {
    setLoteLoading(true);
    try {
      const linhas: string[] = [];
      for (const row of rows) {
        const { token } = await gerarLink({ membroId: row.membroId });
        const url = `${window.location.origin}/ativar/${token}`;
        linhas.push(`${row.nome}: ${mensagemWa(row.nome, url)}`);
      }
      setLote(linhas.join("\n\n"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar links");
    } finally {
      setLoteLoading(false);
    }
  }

  function enviarWa(row: Row, url: string) {
    const fone = row.whatsapp ? normalizeToE164(row.whatsapp).replace(/\D/g, "") : "";
    const msg = encodeURIComponent(mensagemWa(row.nome, url));
    window.open(fone ? `https://wa.me/${fone}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  }

  if (data === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const semAcesso = data.rows.filter((r) => !r.ativado);
  const linhas = data.rows.filter((r) => {
    if (filtro === "ativados") return r.ativado;
    if (filtro === "pendentes") return !r.ativado && r.temLinkPendente;
    if (filtro === "sem") return !r.ativado && !r.temLinkPendente;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Link publico de convidado (so admin) */}
      <LinkConvidadoCard />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ResumoCard label="Membros ativos" valor={data.resumo.total} ativo={filtro === "todos"} onClick={() => setFiltro("todos")} />
        <ResumoCard label="Com acesso" valor={data.resumo.ativados} ativo={filtro === "ativados"} onClick={() => alternarFiltro("ativados")} />
        <ResumoCard label="Link pendente" valor={data.resumo.pendentes} ativo={filtro === "pendentes"} onClick={() => alternarFiltro("pendentes")} />
        <ResumoCard label="Sem acesso" valor={data.resumo.semAcesso} ativo={filtro === "sem"} onClick={() => alternarFiltro("sem")} />
        <ResumoCard label="Adesao" valor={`${data.resumo.adesao}%`} />
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={loteLoading || semAcesso.length === 0}
          onClick={() => gerarLote(semAcesso)}
        >
          {loteLoading ? "Gerando..." : `Gerar links dos sem acesso (${semAcesso.length})`}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table containerClassName="max-h-[calc(100vh-16rem)] overflow-y-auto">
          <TableHeader className="sticky top-0 z-20 bg-background">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Metodo</TableHead>
              <TableHead className="hidden sm:table-cell">Ultimo acesso</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((row) => (
              <TableRow key={row.membroId}>
                <TableCell className="font-medium">{row.nome}</TableCell>
                <TableCell>
                  {row.ativado ? (
                    row.onboardingCompleto ? (
                      <Badge>Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Dados pendentes</Badge>
                    )
                  ) : row.temLinkPendente ? (
                    <Badge variant="secondary">Link pendente</Badge>
                  ) : (
                    <Badge variant="secondary">Sem acesso</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {row.metodoAtivacao === "link"
                    ? "Link"
                    : row.metodoAtivacao === "direto"
                      ? "Telefone+CPF"
                      : "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {formatarData(row.ultimoAcessoEm)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!row.ativado && (
                      <Button variant="outline" size="sm" onClick={() => gerar(row)}>
                        {row.temLinkPendente ? "Novo link" : "Gerar link"}
                      </Button>
                    )}
                    {row.ativado && (
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => resetar(row)}>
                        Resetar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Ver atividade"
                      onClick={() => setAtividade({ id: row.membroId, nome: row.nome })}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: link individual */}
      <Dialog open={!!link} onOpenChange={(o) => !o && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de acesso</DialogTitle>
            <DialogDescription>Valido por 7 dias. Envie ao membro criar a senha.</DialogDescription>
          </DialogHeader>
          {link && (
            <>
              <InputGroup>
                <InputGroupInput readOnly value={link.url} className="text-xs" />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-sm"
                    variant="outline"
                    aria-label="Copiar link"
                    onClick={() => {
                      navigator.clipboard.writeText(link.url);
                      toast.success("Link copiado");
                    }}
                  >
                    <Copy />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <Button className="w-full" onClick={() => enviarWa(link.row, link.url)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar pelo WhatsApp
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: lote */}
      <Dialog open={!!lote} onOpenChange={(o) => !o && setLote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Links gerados</DialogTitle>
            <DialogDescription>
              Copie as mensagens e envie pelos seus canais. Cada link vale 7 dias.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={lote ?? ""}
            className="h-64 text-xs font-mono"
          />
          <Button
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(lote ?? "");
              toast.success("Mensagens copiadas");
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar tudo
          </Button>
        </DialogContent>
      </Dialog>

      <AtividadeMembroDrawer
        membroId={atividade?.id ?? null}
        nome={atividade?.nome ?? ""}
        open={!!atividade}
        onOpenChange={(o) => !o && setAtividade(null)}
      />
    </div>
  );
}
