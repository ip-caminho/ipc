"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";

export function ComentariosRecentesCard() {
  const { isAdmin } = useAuth();
  // Admin-only: o backend tambem rejeita nao-admin, mas o "skip" evita ate a
  // ida ao servidor.
  const grupos = useQuery(
    api.gravacoes.comentarios.listGravacoesComComentariosRecentes,
    isAdmin ? {} : "skip",
  );

  if (!grupos || grupos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground px-1">
        Comentarios recentes
      </p>
      <div className="flex flex-col gap-2">
        {grupos.map((g) => (
          <Link
            key={g.gravacaoId}
            href={`/gravacoes/${g.gravacaoId}`}
            className="flex items-start gap-3 rounded-xl bg-secondary p-4 active:bg-secondary/80 transition-colors"
          >
            <div className="shrink-0 h-10 w-10 rounded-lg bg-foreground/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate flex-1">
                  {g.titulo}
                </p>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {g.comentariosCount}{" "}
                  {g.comentariosCount === 1 ? "comentario" : "comentarios"}
                </span>
              </div>
              {g.ultimoComentario && (
                <>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {g.ultimoComentario.texto}
                  </p>
                  <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                    {g.ultimoComentario.autorNome} ·{" "}
                    {formatDistanceToNow(g.ultimoComentario.criadoEm, {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
