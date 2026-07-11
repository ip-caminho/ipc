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
import { Button } from "@/shared/components/ui/button";
import { Share2, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TURMA_COLORS } from "../lib/constants";
import { shareRelatorioWhatsApp } from "../lib/relatorioWhatsApp";

interface RelatorioDetalheProps {
  id: Id<"eduRelatorios"> | null;
  onOpenChange: (open: boolean) => void;
  canWrite?: boolean;
  onEdit?: (relatorio: any) => void;
  onDelete?: (id: Id<"eduRelatorios">) => void;
}

const PAPEL_LABEL: Record<string, string> = {
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
  APOIO: "Apoio",
};

function Campo({ label, valor }: { label: string; valor?: string }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{valor}</p>
    </div>
  );
}

export function RelatorioDetalhe({
  id,
  onOpenChange,
  canWrite,
  onEdit,
  onDelete,
}: RelatorioDetalheProps) {
  const relatorio = useQuery(
    // @ts-ignore Convex TS2589
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
              {relatorio.voluntarios.length > 0 ? (
                <Campo
                  label="Voluntarios"
                  valor={relatorio.voluntarios
                    .map((v) => `${v.nome}${PAPEL_LABEL[v.papel] ? ` (${PAPEL_LABEL[v.papel]})` : ""}`)
                    .join("\n")}
                />
              ) : (
                <Campo label="Professores" valor={relatorio.professores} />
              )}
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

              <Button
                className="w-full"
                onClick={() => shareRelatorioWhatsApp(relatorio)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar no WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Envia titulo, data, professores e a licao. Presenca e observacoes
                internas nao vao na mensagem.
              </p>

              {canWrite && (onEdit || onDelete) && (
                <div className="flex gap-2 pt-1">
                  {onEdit && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => onEdit(relatorio)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {onDelete && id && (
                    <Button
                      variant="outline"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => onDelete(id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
