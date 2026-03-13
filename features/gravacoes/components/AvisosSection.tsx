"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { SecureAudioPlayer } from "@/shared/files/components/SecureAudioPlayer";
import { Megaphone } from "lucide-react";

interface Aviso {
  titulo: string;
  descricao: string;
}

interface AvisosSectionProps {
  audioUrl: string;
  inicioAvisos?: number | null;
  fimAvisos?: number | null;
  avisos?: Aviso[] | null;
}

export function AvisosSection({
  audioUrl,
  inicioAvisos,
  fimAvisos,
  avisos,
}: AvisosSectionProps) {
  if (!avisos || avisos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Avisos do culto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {inicioAvisos != null && (
          <SecureAudioPlayer
            url={audioUrl}
            inicioSermao={inicioAvisos}
            fimSermao={fimAvisos}
          />
        )}

        <ul className="space-y-3">
          {avisos.map((aviso, i) => (
            <li key={i} className="space-y-0.5">
              <p className="text-sm font-medium">{aviso.titulo}</p>
              <p className="text-sm text-muted-foreground">{aviso.descricao}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
