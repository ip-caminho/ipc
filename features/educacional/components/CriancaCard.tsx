"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { TURMA_COLORS, USO_IMAGEM_COLORS, TIPO_RESPONSAVEL_LABELS } from "../lib/constants";

interface CriancaCardProps {
  crianca: {
    _id: string;
    entidadeId: string;
    nome: string;
    dataNascimento?: string;
    turma: string;
    usoImagem: string;
    responsaveis: { nome: string; tipo: string }[];
  };
  onClick?: () => void;
}

function calcularIdade(dataNascimento: string): string {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  const diff = hoje.getTime() - nascimento.getTime();
  const anos = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  if (anos < 1) {
    const meses = Math.floor(diff / (30.44 * 24 * 60 * 60 * 1000));
    return `${meses}m`;
  }
  return `${anos}a`;
}

export function CriancaCard({ crianca, onClick }: CriancaCardProps) {
  const turmaColor = TURMA_COLORS[crianca.turma] || "bg-gray-100 text-gray-800";
  const usoColor = USO_IMAGEM_COLORS[crianca.usoImagem] || "bg-gray-100 text-gray-800";

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{crianca.nome}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className={turmaColor}>
                {crianca.turma}
              </Badge>
              {crianca.dataNascimento && (
                <span className="text-xs text-muted-foreground">
                  {calcularIdade(crianca.dataNascimento)}
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className={usoColor}>
            {crianca.usoImagem === "AUTORIZADO" ? "Img" : crianca.usoImagem === "NAO_AUTORIZADO" ? "S/Img" : "Pend"}
          </Badge>
        </div>
        {crianca.responsaveis.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {crianca.responsaveis
              .map((r) => `${r.nome} (${TIPO_RESPONSAVEL_LABELS[r.tipo] || r.tipo})`)
              .join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
