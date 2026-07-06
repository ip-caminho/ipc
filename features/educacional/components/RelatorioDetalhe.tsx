"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TURMA_COLORS } from "../lib/constants";

interface RelatorioDetalheProps {
  id: Id<"eduRelatorios"> | null;
  onOpenChange: (open: boolean) => void;
}

function Campo({ label, valor }: { label: string; valor?: string }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{valor}</p>
    </div>
  );
}

export function RelatorioDetalhe({ id, onOpenChange }: RelatorioDetalheProps) {
  const relatorio = useQuery(
    api.educacional.queries.getRelatorio,
    id ? { id } : "skip"
  );

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {relatorio === undefined ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !relatorio ? (
          <p className="text-sm text-muted-foreground">Relatorio nao encontrado</p>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {relatorio.numero != null && <span>Licao {relatorio.numero}</span>}
                <Badge
                  variant="secondary"
                  className={TURMA_COLORS[relatorio.turma] || ""}
                >
                  Turma {relatorio.turma}
                </Badge>
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(relatorio.data), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <Campo label="Tema" valor={relatorio.tema} />
              {relatorio.textosBase && relatorio.textosBase.length > 0 && (
                <Campo label="Textos-base" valor={relatorio.textosBase.join("\n")} />
              )}
              <Campo label="Passagem para memorizar" valor={relatorio.passagemMemorizar} />
              <Campo label="Historia" valor={relatorio.historia} />
              <Campo label="Aplicacao" valor={relatorio.aplicacao} />
              <Campo label="Licao de casa" valor={relatorio.licaoDeCasa} />
              <Campo label="Professores" valor={relatorio.professores} />
              {relatorio.visitantes && relatorio.visitantes.length > 0 && (
                <Campo label="Visitantes" valor={relatorio.visitantes.join("\n")} />
              )}
              <Campo label="Observacoes e sugestoes internas" valor={relatorio.observacoes} />

              <div>
                <p className="text-xs text-muted-foreground">
                  Presentes ({relatorio.presentes.length})
                </p>
                {relatorio.presentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum registrado</p>
                ) : (
                  <p className="text-sm">
                    {relatorio.presentes.map((p) => p.nome).join(", ")}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
