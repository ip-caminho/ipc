"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  TURMA_COLORS,
  USO_IMAGEM_COLORS,
  USO_IMAGEM_LABELS_CURTO,
  TIPO_RESPONSAVEL_LABELS,
} from "../lib/constants";
import {
  calcularIdade,
  proximaTransicaoTurma,
  turmaDivergente,
  formatarMesAno,
} from "../lib/idade";
import { ArrowRight } from "lucide-react";

interface CriancaCardProps {
  crianca: {
    _id: string;
    entidadeId: string;
    nome: string;
    foto?: string | null;
    dataNascimento?: string;
    turma: string;
    usoImagem: string;
    responsaveis: { nome: string; tipo: string }[];
  };
  onClick?: () => void;
}

export function CriancaCard({ crianca, onClick }: CriancaCardProps) {
  const turmaColor = TURMA_COLORS[crianca.turma] || "bg-gray-100 text-gray-800";
  const usoColor = USO_IMAGEM_COLORS[crianca.usoImagem] || "bg-gray-100 text-gray-800";
  const transicao = proximaTransicaoTurma(crianca.dataNascimento);
  const divergente = turmaDivergente(crianca.turma, crianca.dataNascimento);

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {crianca.foto && <AvatarImage src={crianca.foto} alt={crianca.nome} />}
            <AvatarFallback className="text-sm">{crianca.nome?.charAt(0)}</AvatarFallback>
          </Avatar>
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
            {USO_IMAGEM_LABELS_CURTO[crianca.usoImagem] || crianca.usoImagem}
          </Badge>
        </div>
        {(transicao || divergente) && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <ArrowRight className="h-3 w-3 shrink-0" />
            {divergente ? (
              <span className="text-amber-600">Turma desatualizada pela idade</span>
            ) : transicao?.saiDoDepartamento ? (
              <span>Sai do infantil em {formatarMesAno(transicao.data)}</span>
            ) : (
              <span>
                Muda p/ {transicao?.proximaTurma} em {formatarMesAno(transicao!.data)}
              </span>
            )}
          </p>
        )}
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
