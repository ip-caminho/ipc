"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "sonner";
import { Copy, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface IaResultado {
  temaCentral?: { titulo: string; passagemBiblica: string };
  pontosChave?: string[];
  aplicacaoPratica?: string[];
  momentoInteracao?: string | null;
  fraseChave?: string;
  descricao?: string;
  frasesRedesSociais?: string[];
  descricoesInstagram?: string[];
}

interface IaResultadoDisplayProps {
  iaResultado: IaResultado | null;
  iaTranscricao?: string | null;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success(label ? `${label} copiado` : "Copiado");
  };

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
      <Copy className="h-3 w-3" />
    </Button>
  );
}

function CopyAllButton({ items, label }: { items: string[]; label: string }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(items.join("\n\n---\n\n"));
    toast.success(`${label} copiados`);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
      <Copy className="h-3 w-3" />
      Copiar todos
    </Button>
  );
}

export function IaResultadoDisplay({ iaResultado, iaTranscricao }: IaResultadoDisplayProps) {
  const [transcricaoAberta, setTranscricaoAberta] = useState(false);

  if (!iaResultado && !iaTranscricao) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Resultado da IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            {iaResultado && <TabsTrigger value="resumo">Resumo</TabsTrigger>}
            {iaResultado?.frasesRedesSociais && <TabsTrigger value="frases">Frases</TabsTrigger>}
            {iaResultado?.descricoesInstagram && <TabsTrigger value="instagram">Instagram</TabsTrigger>}
            {iaTranscricao && <TabsTrigger value="transcricao">Transcricao</TabsTrigger>}
          </TabsList>

          {/* Resumo Tab */}
          {iaResultado && (
            <TabsContent value="resumo" className="space-y-4 mt-4">
              {/* Tema Central */}
              {iaResultado.temaCentral && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Tema Central</p>
                    <CopyButton
                      text={`${iaResultado.temaCentral.titulo} — ${iaResultado.temaCentral.passagemBiblica}`}
                      label="Tema"
                    />
                  </div>
                  <p className="text-sm">{iaResultado.temaCentral.titulo}</p>
                  <Badge variant="outline">{iaResultado.temaCentral.passagemBiblica}</Badge>
                </div>
              )}

              {/* Pontos-chave */}
              {iaResultado.pontosChave && iaResultado.pontosChave.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Pontos-chave</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {iaResultado.pontosChave.map((ponto, i) => (
                      <li key={i}>{ponto}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Aplicacao Pratica */}
              {iaResultado.aplicacaoPratica && iaResultado.aplicacaoPratica.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Aplicacao Pratica</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    {iaResultado.aplicacaoPratica.map((ap, i) => (
                      <li key={i}>{ap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Momento de Interacao */}
              {iaResultado.momentoInteracao && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Momento de Interacao</p>
                  <p className="text-sm text-muted-foreground">{iaResultado.momentoInteracao}</p>
                </div>
              )}

              {/* Frase-chave */}
              {iaResultado.fraseChave && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Frase-chave</p>
                    <CopyButton text={iaResultado.fraseChave} label="Frase-chave" />
                  </div>
                  <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
                    &ldquo;{iaResultado.fraseChave}&rdquo;
                  </blockquote>
                </div>
              )}
            </TabsContent>
          )}

          {/* Frases Tab */}
          {iaResultado?.frasesRedesSociais && (
            <TabsContent value="frases" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Frases para Redes Sociais ({iaResultado.frasesRedesSociais.length})
                    </p>
                  </div>
                  <CopyAllButton items={iaResultado.frasesRedesSociais} label="Frases" />
                </div>
                <div className="space-y-2">
                  {iaResultado.frasesRedesSociais.map((frase, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded-md"
                    >
                      <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="flex-1 text-muted-foreground">{frase}</p>
                      <CopyButton text={frase} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}

          {/* Instagram Tab */}
          {iaResultado?.descricoesInstagram && (
            <TabsContent value="instagram" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Descricoes Instagram ({iaResultado.descricoesInstagram.length})
                  </p>
                  <CopyAllButton items={iaResultado.descricoesInstagram} label="Descricoes" />
                </div>
                <div className="space-y-2">
                  {iaResultado.descricoesInstagram.map((desc, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded-md"
                    >
                      <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="flex-1 text-muted-foreground whitespace-pre-wrap">{desc}</p>
                      <CopyButton text={desc} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}

          {/* Transcricao Tab */}
          {iaTranscricao && (
            <TabsContent value="transcricao" className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Transcricao Completa</p>
                  <CopyButton text={iaTranscricao} label="Transcricao" />
                </div>
                <Collapsible open={transcricaoAberta} onOpenChange={setTranscricaoAberta}>
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-md max-h-64 overflow-y-auto">
                    {transcricaoAberta
                      ? iaTranscricao
                      : iaTranscricao.slice(0, 500) + (iaTranscricao.length > 500 ? "..." : "")}
                  </div>
                  {iaTranscricao.length > 500 && (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="mt-1 gap-1">
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${transcricaoAberta ? "rotate-180" : ""}`}
                        />
                        {transcricaoAberta ? "Ver menos" : "Ver tudo"}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </Collapsible>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
