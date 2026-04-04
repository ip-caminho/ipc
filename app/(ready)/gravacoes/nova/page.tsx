"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import {
  Mic, BookOpen, Presentation, FileAudio,
  ArrowRight, ArrowLeft, Check, Sparkles, Upload,
} from "lucide-react";

const TIPO_ICONS: Record<string, typeof Mic> = {
  SERMAO: Mic,
  ESTUDO_BIBLICO: BookOpen,
  PALESTRA: Presentation,
  OUTRO: FileAudio,
};

const TIPO_DESCRIPTIONS: Record<string, string> = {
  SERMAO: "Gravacao completa do culto. A IA vai identificar o sermao e os avisos automaticamente.",
  ESTUDO_BIBLICO: "Estudo biblico gravado. A IA vai gerar resumo, pontos-chave e conteudo para redes sociais.",
  PALESTRA: "Palestra ou conferencia. A IA vai gerar resumo e conteudo para redes sociais.",
  OUTRO: "Outro tipo de gravacao (assembleia, reuniao, etc). A IA vai gerar resumo e conteudo basico.",
};

function getLastSunday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - diff);
  return sunday.toISOString().split("T")[0];
}

type Step = "tipo" | "data" | "upload" | "done";

export default function NovaGravacaoPage() {
  const createFromAudio = useMutation(api.gravacoes.ai.createFromAudio);
  const router = useRouter();

  const [step, setStep] = useState<Step>("tipo");
  const [tipo, setTipo] = useState<string>("");
  const [data, setData] = useState(getLastSunday());
  const [creating, setCreating] = useState(false);
  const [gravacaoId, setGravacaoId] = useState<string | null>(null);

  const handleAudioUploaded = async (url: string | undefined) => {
    if (!url) return;

    setCreating(true);
    try {
      const id = await createFromAudio({
        audioUrl: url,
        tipo: tipo as any,
        data,
      });
      setGravacaoId(id);
      setStep("done");
      toast.success("Audio enviado com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar gravacao");
      setCreating(false);
    }
  };

  const stepNumber = step === "tipo" ? 1 : step === "data" ? 2 : step === "upload" ? 3 : 4;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progresso */}
      <div className="flex items-center gap-2 px-1">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= stepNumber ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Step 1: Tipo */}
      {step === "tipo" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Qual o tipo da gravacao?</h2>
              <p className="text-sm text-muted-foreground">Isso define como a IA vai processar o conteudo.</p>
            </div>

            <div className="grid gap-2">
              {TIPO_GRAVACAO_OPTIONS.map((opt) => {
                const Icon = TIPO_ICONS[opt.value] || FileAudio;
                const isSelected = tipo === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTipo(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <span className="text-sm font-medium">{opt.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TIPO_DESCRIPTIONS[opt.value]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              className="w-full"
              disabled={!tipo}
              onClick={() => setStep("data")}
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Data */}
      {step === "data" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Quando foi gravado?</h2>
              <p className="text-sm text-muted-foreground">Data do culto, estudo ou evento.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("tipo")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={() => setStep("upload")} disabled={!data} className="flex-1">
                Continuar
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Envie o audio</h2>
              <p className="text-sm text-muted-foreground">
                MP3, M4A ou WAV. O audio sera comprimido automaticamente antes do envio.
              </p>
            </div>

            <FileUpload
              folder="gravacoes-audio"
              entityId="new"
              accept="audio/*"
              maxSizeMB={200}
              onChange={handleAudioUploaded}
              label="Arraste ou clique para enviar"
            />

            {creating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Criando gravacao e iniciando processamento...
              </div>
            )}

            {!creating && (
              <Button variant="outline" onClick={() => setStep("data")} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Audio enviado com sucesso</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O processamento com IA esta acontecendo em segundo plano. Voce pode fechar esta pagina — sera notificado quando terminar.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/gravacoes")} className="flex-1">
                Ver gravacoes
              </Button>
              {gravacaoId && (
                <Button onClick={() => router.push(`/gravacoes/${gravacaoId}/admin`)} className="flex-1">
                  Gerenciar
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                setStep("tipo");
                setTipo("");
                setData(getLastSunday());
                setCreating(false);
                setGravacaoId(null);
              }}
            >
              <Upload className="h-4 w-4 mr-1" />
              Enviar outro audio
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
