"use client";

import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { ArrowRight } from "lucide-react";

interface Props {
  foto: string | undefined;
  nomeCompleto: string;
  entidadeId: string;
  onUpdate: (foto: string | undefined) => void;
  onNext: () => void;
}

export function PhotoStep({ foto, nomeCompleto, entidadeId, onUpdate, onNext }: Props) {
  const initial = nomeCompleto.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">Sua foto</h2>
        <p className="text-xs text-muted-foreground">
          Ajuda a comunidade a te reconhecer
        </p>
      </div>

      <Avatar className="h-32 w-32 border-2 border-border">
        {foto && <AvatarImage src={foto} alt={nomeCompleto} />}
        <AvatarFallback className="text-4xl">{initial}</AvatarFallback>
      </Avatar>

      <div className="w-full">
        <FileUpload
          folder="membros/fotos"
          entityId={entidadeId}
          accept="image/*"
          maxSizeMB={10}
          value={foto}
          onChange={(url) => onUpdate(url)}
          label="Escolher foto"
        />
      </div>

      <Button className="w-full" onClick={onNext}>
        {foto ? "Continuar" : "Pular por agora"}
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
