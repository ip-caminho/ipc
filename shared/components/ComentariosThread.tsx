"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Send, Trash2, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@shared/providers/PermissionsProvider";
import type { Id } from "@/convex/_generated/dataModel";

interface ComentariosThreadProps {
  entidadeTipo: "tarefas" | "gravacoes" | "pedidos-oracao";
  entidadeId: string;
  showTipo?: boolean; // mostrar toggle COMENTARIO/ATUALIZACAO
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(timestamp).toLocaleDateString("pt-BR");
}

export function ComentariosThread({ entidadeTipo, entidadeId, showTipo }: ComentariosThreadProps) {
  const comentarios = useQuery(api.comentarios.queries.listByEntidade, {
    entidadeTipo,
    entidadeId,
  });
  const createComentario = useMutation(api.comentarios.mutations.create);
  const removeComentario = useMutation(api.comentarios.mutations.remove);

  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<"COMENTARIO" | "ATUALIZACAO">("COMENTARIO" as const);
  const [replyTo, setReplyTo] = useState<Id<"comentarios"> | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const { isAdmin } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;

    setSending(true);
    try {
      await createComentario({
        entidadeTipo,
        entidadeId,
        texto: texto.trim(),
        parentId: replyTo ?? undefined,
        tipo: showTipo ? tipo : undefined,
      });
      setTexto("");
      setReplyTo(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar comentario");
    }
    setSending(false);
  }

  async function handleRemove(id: Id<"comentarios">) {
    try {
      await removeComentario({ id });
      toast.success("Comentario removido");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  }

  if (!comentarios) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  // Separar top-level e replies
  const topLevel = comentarios.filter((c) => !c.parentId);
  const repliesMap = new Map<string, typeof comentarios>();
  for (const c of comentarios) {
    if (c.parentId) {
      const key = c.parentId as string;
      if (!repliesMap.has(key)) repliesMap.set(key, []);
      repliesMap.get(key)!.push(c);
    }
  }

  function toggleReplies(id: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderComentario(c: any, isReply = false) {
    const replies = repliesMap.get(c._id) || [];
    const hasReplies = replies.length > 0;
    const showReplies = expandedReplies.has(c._id);

    return (
      <div key={c._id} className={`${isReply ? "ml-8 border-l-2 border-muted pl-3" : ""}`}>
        <div className="flex gap-2 py-2">
          <Avatar className="h-7 w-7 shrink-0">
            {c.autorFoto && <AvatarImage src={c.autorFoto} />}
            <AvatarFallback className="text-[10px]">{c.autorNome?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.autorNome}</span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(c.criadoEm)}</span>
              {c.tipo === "ATUALIZACAO" && (
                <Badge variant="outline" className="text-[10px] py-0">Atualização</Badge>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">{c.texto}</p>
            <div className="flex items-center gap-2 mt-1">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setReplyTo(replyTo === c._id ? null : c._id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Responder
                </Button>
              )}
              {(c.isOwner || isAdmin) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-red-600"
                  onClick={() => handleRemove(c._id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              {hasReplies && !isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => toggleReplies(c._id)}
                >
                  {showReplies ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Reply input inline */}
        {replyTo === c._id && (
          <form onSubmit={handleSubmit} className="ml-9 mb-2 flex gap-2">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva uma resposta..."
              rows={1}
              className="text-sm min-h-[36px]"
            />
            <Button type="submit" size="sm" disabled={sending || !texto.trim()}>
              <Send className="h-3 w-3" />
            </Button>
          </form>
        )}

        {/* Replies */}
        {showReplies && replies.map((r) => renderComentario(r, true))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {topLevel.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum comentario ainda
        </p>
      )}
      {topLevel.map((c) => renderComentario(c))}

      {/* Input principal (quando nao esta respondendo) */}
      {!replyTo && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
          {showTipo && (
            <select
              className="text-xs border rounded px-2 py-1 bg-background"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as any)}
            >
              <option value="COMENTARIO">Comentário</option>
              <option value="ATUALIZACAO">Atualização</option>
            </select>
          )}
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva um comentario..."
            rows={1}
            className="text-sm min-h-[36px] flex-1"
          />
          <Button type="submit" size="sm" disabled={sending || !texto.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
