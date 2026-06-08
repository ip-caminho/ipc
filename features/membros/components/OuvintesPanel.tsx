"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeToE164 } from "@convex/messaging/phoneUtils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/shared/components/ui/input-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Copy, MessageCircle, Headphones } from "lucide-react";
import { toast } from "sonner";

type Row = {
  membroId: string;
  nome: string;
  whatsapp: string | null;
  ativado: boolean;
  acessoExpiraEm: number | null;
  expirado: boolean;
  expiraEmBreve: boolean;
  temLinkPendente: boolean;
};

function formatarData(ms: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function mensagemWa(nome: string, link: string): string {
  return `Ola, ${nome.split(" ")[0]}! Voce tem acesso as gravacoes das pregacoes da igreja. Crie sua senha neste link (valido por 7 dias): ${link}`;
}

function StatusBadge({ row }: { row: Row }) {
  if (row.expirado) return <Badge variant="destructive">Expirado</Badge>;
  if (row.expiraEmBreve)
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Expira em breve</Badge>;
  if (row.ativado) return <Badge>Ativo</Badge>;
  if (row.temLinkPendente) return <Badge variant="secondary">Link pendente</Badge>;
  return <Badge variant="outline">Sem acesso</Badge>;
}

export function OuvintesPanel() {
  const ouvintes = useQuery(api.membros.ouvinte.listar, {});
  const criar = useMutation(api.membros.ouvinte.criarOuvinte);
  const renovar = useMutation(api.membros.ouvinte.renovarAcesso);
  const gerarLink = useMutation(api.membros.acesso.gerarLink);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [link, setLink] = useState<{ url: string; row: Row } | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !whatsapp.trim()) {
      toast.error("Informe nome e WhatsApp");
      return;
    }
    setSalvando(true);
    try {
      await criar({ nome: nome.trim(), whatsapp: whatsapp.trim() });
      toast.success("Ouvinte adicionado. Gere o link de acesso abaixo.");
      setNome("");
      setWhatsapp("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSalvando(false);
    }
  }

  async function gerar(row: Row) {
    try {
      const { token } = await gerarLink({ membroId: row.membroId as Id<"membros"> });
      setLink({ url: `${window.location.origin}/ativar/${token}`, row });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar link");
    }
  }

  async function renovarAcesso(row: Row) {
    try {
      await renovar({ membroId: row.membroId as Id<"membros"> });
      toast.success("Acesso renovado ate o fim do ano");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao renovar");
    }
  }

  function enviarWa(row: Row, url: string) {
    const fone = row.whatsapp ? normalizeToE164(row.whatsapp).replace(/\D/g, "") : "";
    const msg = encodeURIComponent(mensagemWa(row.nome, url));
    window.open(fone ? `https://wa.me/${fone}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <div className="space-y-5">
      {/* Form de criacao */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={adicionar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da pessoa"
                className="h-11"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">WhatsApp</label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={salvando} className="h-11 sm:w-auto">
              {salvando ? "Adicionando..." : "Adicionar ouvinte"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Acesso so as gravacoes. Expira no fim do ano — renove quando necessario.
          </p>
        </CardContent>
      </Card>

      {/* Lista (cards responsivos) */}
      {ouvintes === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : ouvintes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Headphones className="h-8 w-8" />
          <p className="text-sm">Nenhum ouvinte cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ouvintes.map((row: Row) => (
            <Card key={row.membroId}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{row.nome}</p>
                    <StatusBadge row={row} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.whatsapp || "sem telefone"} · expira {formatarData(row.acessoExpiraEm)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" className="h-10" onClick={() => gerar(row)}>
                    {row.temLinkPendente ? "Novo link" : "Gerar link"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-10" onClick={() => renovarAcesso(row)}>
                    Renovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: link de acesso */}
      <Dialog open={!!link} onOpenChange={(o) => !o && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de acesso</DialogTitle>
            <DialogDescription>Valido por 7 dias. Envie ao ouvinte criar a senha.</DialogDescription>
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
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar pelo WhatsApp
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
