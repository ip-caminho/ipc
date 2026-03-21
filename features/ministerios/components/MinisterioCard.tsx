"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Users } from "lucide-react";
import { MINISTERIO_STATUS_COLORS } from "../lib/constants";

interface MinisterioCardProps {
  ministerio: {
    _id: string;
    nome: string;
    descricao?: string;
    cor?: string;
    status: string;
    qtdMembros: number;
  };
  onClick?: () => void;
}

export function MinisterioCard({ ministerio, onClick }: MinisterioCardProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{ministerio.nome}</CardTitle>
          <Badge className={MINISTERIO_STATUS_COLORS[ministerio.status] || ""}>
            {ministerio.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ministerio.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {ministerio.descricao}
          </p>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {ministerio.qtdMembros} membros
        </div>
      </CardContent>
    </Card>
  );
}
