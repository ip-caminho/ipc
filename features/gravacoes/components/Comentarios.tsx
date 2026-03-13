"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { toast } from "sonner";
import { MessageCircle, Reply, Trash2, Send } from "lucide-react";
import { MembroProfilePopover } from "@/shared/components/MembroProfilePopover";
import type { Id } from "@/convex/_generated/dataModel";
import { useState, useRef } from "react";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComentariosProps {
  gravacaoId: Id<"gravacoes">;
}

function ComentarioItem({
  comentario,
  replies,
  gravacaoId,
  currentMembroId,
  isAdmin,
  highlight,
}: {
  comentario: any;
  replies: any[];
  gravacaoId: Id<"gravacoes">;
  currentMembroId: string | null;
  isAdmin: boolean;
  highlight?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  // @ts-ignore Convex TS2589
  const createComment = useMutation(api.gravacoes.comentarios.create);
  const removeComment = useMutation(api.gravacoes.comentarios.remove);
  const inputRef = useRef<HTMLInputElement>(null);

  const canDelete = comentario.membroId === currentMembroId || isAdmin;
  const timeAgo = formatDistanceToNow(fromUnixTime(comentario.createdAt / 1000), {
    addSuffix: true,
    locale: ptBR,
  });

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await createComment({
        gravacaoId,
        texto: replyText,
        parentId: comentario._id,
      });
      setReplyText("");
      setReplying(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao responder");
    }
  };

  const handleDelete = async () => {
    try {
      await removeComment({ id: comentario._id });
      toast.success("Comentario excluido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  return (
    <div className={`space-y-2 rounded-md px-2 py-1.5 -mx-2 transition-colors duration-1000 ${highlight ? "bg-yellow-200 dark:bg-yellow-800/40" : ""}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">
            {comentario.autorNome?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-baseline gap-2">
            <MembroProfilePopover membroId={comentario.membroId}>
              <button className="text-sm font-medium hover:underline cursor-pointer">{comentario.autorNome}</button>
            </MembroProfilePopover>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{comentario.texto}</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => {
                setReplying(!replying);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
            >
              <Reply className="h-3 w-3" />
              Responder
            </button>
            {canDelete && (
              <button
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3" />
                Excluir
              </button>
            )}
          </div>

          {replying && (
            <div className="flex items-center gap-2 mt-2">
              <input
                ref={inputRef}
                className="flex-1 text-sm rounded-md border border-input bg-background px-3 py-1.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Escreva uma resposta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
              />
              <Button size="sm" className="h-7 px-2" onClick={handleReply} disabled={!replyText.trim()}>
                <Send className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-muted">
              {replies.map((reply: any) => (
                <div key={reply._id} className="flex gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs">
                      {reply.autorNome?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-baseline gap-2">
                      <MembroProfilePopover membroId={reply.membroId}>
                        <button className="text-sm font-medium hover:underline cursor-pointer">{reply.autorNome}</button>
                      </MembroProfilePopover>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(fromUnixTime(reply.createdAt / 1000), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {(reply.membroId === currentMembroId || isAdmin) && (
                        <button
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            try {
                              await removeComment({ id: reply._id });
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Erro");
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{reply.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ComentarioInput({ gravacaoId, onCreated }: { gravacaoId: Id<"gravacoes">; onCreated?: (id: string) => void }) {
  const [newComment, setNewComment] = useState("");
  const createComment = useMutation(api.gravacoes.comentarios.create);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      const id = await createComment({ gravacaoId, texto: newComment });
      setNewComment("");
      onCreated?.(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao comentar");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 text-sm rounded-md border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="Escreva um comentario..."
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ComentariosList({ gravacaoId, highlightId }: { gravacaoId: Id<"gravacoes">; highlightId: string | null }) {
  const { membroId, isAdmin } = useAuth();
  const comentarios = useQuery(api.gravacoes.comentarios.listByGravacao, { gravacaoId });

  const topLevel = (comentarios?.filter((c: any) => !c.parentId) ?? [])
    .sort((a: any, b: any) => a.createdAt - b.createdAt);
  const repliesMap: Record<string, any[]> = {};
  for (const c of comentarios ?? []) {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
      repliesMap[c.parentId].push(c);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Comentarios {topLevel.length > 0 && `(${topLevel.length})`}
        </h3>
      </div>

      {topLevel.length > 0 && (
        <div className="space-y-4">
          {topLevel.map((c: any) => (
            <ComentarioItem
              key={c._id}
              comentario={c}
              replies={repliesMap[c._id] ?? []}
              gravacaoId={gravacaoId}
              currentMembroId={membroId}
              isAdmin={isAdmin}
              highlight={c._id === highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** @deprecated Use ComentarioInput + ComentariosList separately */
export function Comentarios({ gravacaoId }: ComentariosProps) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <ComentarioInput
        gravacaoId={gravacaoId}
        onCreated={(id) => {
          setHighlightId(id);
          setTimeout(() => setHighlightId(null), 2000);
        }}
      />
      <ComentariosList gravacaoId={gravacaoId} highlightId={highlightId} />
    </div>
  );
}
