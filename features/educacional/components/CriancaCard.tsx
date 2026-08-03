"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { PrivateAvatarImage } from "@/shared/files/components/PrivateImage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  TURMA_COLORS,
  TURMA_RING,
  USO_IMAGEM_LABELS,
  USO_IMAGEM_ICON_COLORS,
  TIPO_RESPONSAVEL_LABELS,
} from "../lib/constants";
import {
  calcularIdade,
  proximaTransicaoTurma,
  turmaDivergente,
} from "../lib/idade";
import { ArrowRight, Camera, CameraOff } from "lucide-react";

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
  const turmaRing = TURMA_RING[crianca.turma] || "ring-gray-200";
  const transicao = proximaTransicaoTurma(crianca.dataNascimento);
  const divergente = turmaDivergente(crianca.turma, crianca.dataNascimento);

  const usoImagemLabel = USO_IMAGEM_LABELS[crianca.usoImagem] || crianca.usoImagem;
  const usoIconColor = USO_IMAGEM_ICON_COLORS[crianca.usoImagem] || "text-muted-foreground";
  const UsoIcon = crianca.usoImagem === "NAO_AUTORIZADO" ? CameraOff : Camera;

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <Avatar
            className={`h-10 w-10 shrink-0 ring-2 ring-offset-2 ring-offset-background ${turmaRing}`}
          >
            {crianca.foto && <PrivateAvatarImage src={crianca.foto} alt={crianca.nome} />}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`shrink-0 ${usoIconColor}`}>
                  <UsoIcon className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Uso de imagem: {usoImagemLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {(transicao || divergente) && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <ArrowRight className="h-3 w-3 shrink-0" />
            {divergente ? (
              <span className="text-yellow-600">Turma desatualizada pela idade</span>
            ) : transicao?.saiDoDepartamento ? (
              <span>Sai do infantil em {transicao.ano}</span>
            ) : (
              <span>
                Muda p/ {transicao?.proximaTurma} em {transicao?.ano}
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
