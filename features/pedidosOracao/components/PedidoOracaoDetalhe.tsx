"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from "@/components/animate-ui/components/animate/avatar-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  ArrowLeft,
  HandHeart,
  Send,
  Trash2,
  CheckCircle,
  Archive,
  RotateCcw,
  Plus,
  MessageCircle,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-yellow-100 text-yellow-800",
  RESPONDIDO: "bg-green-100 text-green-800",
  ARQUIVADO: "bg-gray-100 text-gray-800",
};

function timeAgo(ts: number) {
  return formatDistanceToNow(fromUnixTime(ts / 1000), {
    addSuffix: true,
    locale: ptBR,
  });
}

interface PedidoOracaoDetalheProps {
  pedidoId: Id<"pedidosOracao">;
  onBack: () => void;
}

export function PedidoOracaoDetalhe({
  pedidoId,
  onBack,
}: PedidoOracaoDetalheProps) {
  const { isAdmin } = useAuth();
  // @ts-ignore Convex TS2589
  const pedido = useQuery(api.pedidosOracao.queries.getById, { id: pedidoId });
  const toggleOrando = useMutation(api.pedidosOracao.mutations.toggleOrando);
  const addComentario = useMutation(api.pedidosOracao.mutations.addComentario);
  const removeComentario = useMutation(
    api.pedidosOracao.mutations.removeComentario
  );
  const updateStatus = useMutation(api.pedidosOracao.mutations.updateStatus);

  const [comentarioTexto, setComentarioTexto] = useState("");
  const [atualizacaoTexto, setAtualizacaoTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showUpdateInput, setShowUpdateInput] = useState(false);

  if (pedido === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (!pedido) {
    return (
      <p className="text-sm text-muted-foreground">Pedido nao encontrado</p>
    );
  }

  // Separar atualizacoes (do autor) e comentarios (de qualquer pessoa)
  const atualizacoes = pedido.comentarios.filter(
    (c: any) => c.tipo === "ATUALIZACAO"
  );
  const comentarios = pedido.comentarios.filter(
    (c: any) => c.tipo !== "ATUALIZACAO"
  );

  const handleToggleOrando = async () => {
    try {
      const result = await toggleOrando({ pedidoId });
      toast.success(
        result.orando
          ? "Voce esta orando por este pedido"
          : "Removido da lista de oracao"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleAddComentario = async () => {
    if (!comentarioTexto.trim()) return;
    setSending(true);
    try {
      const id = await addComentario({
        pedidoId,
        texto: comentarioTexto.trim(),
        tipo: "COMENTARIO",
      });
      setComentarioTexto("");
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    } finally {
      setSending(false);
    }
  };

  const handleAddAtualizacao = async () => {
    if (!atualizacaoTexto.trim()) return;
    setSendingUpdate(true);
    try {
      await addComentario({
        pedidoId,
        texto: atualizacaoTexto.trim(),
        tipo: "ATUALIZACAO",
      });
      setAtualizacaoTexto("");
      setShowUpdateInput(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    } finally {
      setSendingUpdate(false);
    }
  };

  const handleRemoveComentario = async (id: Id<"pedidoOracaoComentarios">) => {
    try {
      await removeComentario({ id });
      toast.success("Excluido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleStatusChange = async (
    status: "ATIVO" | "RESPONDIDO" | "ARQUIVADO"
  ) => {
    try {
      await updateStatus({ id: pedidoId, status });
      toast.success(
        status === "RESPONDIDO"
          ? "Pedido marcado como respondido"
          : status === "ARQUIVADO"
            ? "Pedido arquivado"
            : "Pedido reaberto"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  return (
    <div
      className="flex flex-col -m-4 md:-m-6"
      style={{
        height: "calc(100% + 2rem)",
        maxHeight: "calc(100% + 2rem)",
      }}
    >
      {/* Fixed top: pedido info + atualizacoes + orando */}
      <div className="bg-background px-4 pb-4 pt-4 md:px-6 md:pt-6 shrink-0 border-b">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold flex-1">Pedido de Oracao</h2>
          </div>

          {/* Autor + descricao + atualizacoes */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                {pedido.autor?.foto && (
                  <AvatarImage src={pedido.autor.foto} />
                )}
                <AvatarFallback>
                  {pedido.autor?.nome?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {pedido.autor?.nome}
                  </span>
                  <Badge className={STATUS_COLORS[pedido.status] || ""}>
                    {pedido.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(pedido.criadoEm)}
                </p>
              </div>
            </div>

            <p className="text-sm whitespace-pre-wrap">{pedido.descricao}</p>

            {/* Atualizacoes do autor (parte do post) */}
            {atualizacoes.length > 0 && (
              <div className="space-y-2 border-l-2 border-primary/30 pl-3 ml-1">
                {atualizacoes.map((a: any) => (
                  <div key={a._id} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        Atualizacao
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(a.criadoEm)}
                      </span>
                      {a.isOwner && (
                        <button
                          className="text-xs text-muted-foreground hover:text-destructive ml-auto"
                          onClick={() => handleRemoveComentario(a._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{a.texto}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Input de atualizacao (somente dono) */}
            {pedido.isOwner && showUpdateInput && (
              <div className="border-l-2 border-primary/30 pl-3 ml-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    Nova atualizacao
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 text-sm rounded-md border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Compartilhe uma atualizacao..."
                    value={atualizacaoTexto}
                    onChange={(e) => setAtualizacaoTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddAtualizacao();
                      }
                      if (e.key === "Escape") {
                        setShowUpdateInput(false);
                        setAtualizacaoTexto("");
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    disabled={!atualizacaoTexto.trim() || sendingUpdate}
                    onClick={handleAddAtualizacao}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Orando avatars */}
            <div className="flex items-center gap-1.5">
              {pedido.intercessores.length > 0 && (
                <AvatarGroup className="h-8 -space-x-2">
                  {pedido.intercessores.map((i: any) => (
                    <Avatar
                      key={i._id}
                      className="h-8 w-8 border-2 border-background"
                    >
                      {i.foto && <AvatarImage src={i.foto} />}
                      <AvatarFallback className="text-xs">
                        {i.nome?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                      <AvatarGroupTooltip>{i.nome}</AvatarGroupTooltip>
                    </Avatar>
                  ))}
                </AvatarGroup>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleToggleOrando}
                      className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-colors ${
                        pedido.euOrando
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {pedido.euOrando ? (
                        <HandHeart className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {pedido.euOrando
                      ? "Parar de orar"
                      : "Orar por este pedido"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Acoes do dono */}
            {pedido.isOwner && (
              <div className="flex items-center gap-2 flex-wrap">
                {pedido.status === "ATIVO" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUpdateInput(!showUpdateInput)}
                    >
                      <Megaphone className="h-4 w-4 mr-1.5" />
                      Postar atualizacao
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("RESPONDIDO")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Respondido
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange("ARQUIVADO")}
                    >
                      <Archive className="h-4 w-4 mr-1.5" />
                      Arquivar
                    </Button>
                  </>
                )}
                {pedido.status !== "ATIVO" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("ATIVO")}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Reabrir
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable middle: comentarios (somente tipo COMENTARIO) */}
      <div className="flex-1 overflow-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-4 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Comentarios{" "}
              {comentarios.length > 0 && `(${comentarios.length})`}
            </h3>
          </div>

          {comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum comentario ainda
            </p>
          ) : (
            <div className="space-y-4">
              {comentarios.map((c: any) => (
                <div
                  key={c._id}
                  className={`flex gap-3 rounded-md px-2 py-1.5 -mx-2 transition-colors duration-1000 ${
                    c._id === highlightId
                      ? "bg-yellow-200 dark:bg-yellow-800/40"
                      : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {c.autorFoto && <AvatarImage src={c.autorFoto} />}
                    <AvatarFallback className="text-xs">
                      {c.autorNome?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">
                        {c.autorNome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(c.criadoEm)}
                      </span>
                      {(c.isOwner || isAdmin) && (
                        <button
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 ml-auto"
                          onClick={() => handleRemoveComentario(c._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {c.texto}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom: comment input */}
      <div className="bg-background px-4 pt-3 pb-4 md:px-6 md:pb-6 border-t shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 text-sm rounded-md border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Escreva um comentario..."
              value={comentarioTexto}
              onChange={(e) => setComentarioTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComentario();
                }
              }}
            />
            <Button
              size="sm"
              disabled={!comentarioTexto.trim() || sending}
              onClick={handleAddComentario}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
