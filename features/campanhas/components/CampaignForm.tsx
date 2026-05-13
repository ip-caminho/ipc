"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { Send } from "lucide-react";

const TEMPLATE_DEFAULT = `Ola {nome}, paz do Senhor!

A secretaria esta atualizando o cadastro de membros.
Por favor entre em https://ipc.app/meu-perfil e confirme seus dados.
Leva 2 minutos.

IPC`;

export function CampaignForm() {
  const router = useRouter();
  const criarCampanha = useMutation(api.messaging.campanhas.criarCampanha);
  const dispararCampanha = useMutation(api.messaging.campanhas.dispararCampanha);

  const [titulo, setTitulo] = useState("Atualizacao de cadastro - " + new Date().toLocaleDateString("pt-BR"));
  const [template, setTemplate] = useState(TEMPLATE_DEFAULT);
  const [janelaMeses, setJanelaMeses] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const filtros = {
    vinculoIgreja: ["MEMBRO"],
    status: ["ATIVO"],
    apenasComWhatsapp: true,
    naoAtualizadoHaMeses: typeof janelaMeses === "number" ? janelaMeses : undefined,
  };

  const preview = useQuery(api.messaging.campanhas.previewDestinatarios, { filtros });

  const handleCriar = async (disparar: boolean) => {
    if (!titulo.trim()) {
      toast.error("Informe um titulo");
      return;
    }
    if (!template.trim()) {
      toast.error("Informe um template");
      return;
    }
    if (!preview || preview.total === 0) {
      toast.error("Nenhum destinatario com os filtros atuais");
      return;
    }

    if (!confirm(`Confirmar criacao da campanha para ${preview.total} destinatarios?${disparar ? "\n\nA campanha sera disparada imediatamente." : ""}`)) {
      return;
    }

    setSubmitting(true);
    try {
      const { campanhaId } = await criarCampanha({
        titulo,
        tipo: "ATUALIZACAO_CADASTRO",
        template,
        filtros,
      });

      if (disparar) {
        await dispararCampanha({ campanhaId });
        toast.success(`Campanha criada e disparada para ${preview.total} destinatarios`);
      } else {
        toast.success(`Campanha criada como rascunho (${preview.total} destinatarios)`);
      }

      router.push(`/admin/campanhas/${campanhaId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar campanha");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova campanha de atualizacao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Titulo (interno)</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Template da mensagem</Label>
            <Textarea
              rows={8}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Variaveis disponiveis: <code>{"{nome}"}</code>, <code>{"{apelido}"}</code>
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Pular membros que atualizaram nos ultimos N meses (opcional)</Label>
            <Input
              type="number"
              min={1}
              max={48}
              value={janelaMeses}
              onChange={(e) => {
                const v = e.target.value;
                setJanelaMeses(v === "" ? "" : Number(v));
              }}
              placeholder="Ex: 6"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Destinatarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">Vinculo: MEMBRO</Badge>
            <Badge variant="secondary">Status: ATIVO</Badge>
            <Badge variant="secondary">Com WhatsApp</Badge>
            {typeof janelaMeses === "number" && janelaMeses > 0 && (
              <Badge variant="secondary">Sem atualizar ha {janelaMeses}+ meses</Badge>
            )}
          </div>
          {preview === undefined ? (
            <p className="text-sm text-muted-foreground">Carregando preview...</p>
          ) : (
            <div className="text-sm">
              <p>
                <span className="font-bold text-2xl">{preview.total}</span>
                <span className="text-muted-foreground ml-2">membros serao notificados</span>
              </p>
              {preview.puladosAntiSpam > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  {preview.puladosAntiSpam} membros serao pulados (ja receberam 3+ envios em{" "}
                  {preview.janelaAntiSpamDias} dias)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => handleCriar(false)}
        >
          Salvar como rascunho
        </Button>
        <Button disabled={submitting} onClick={() => handleCriar(true)}>
          <Send className="h-4 w-4 mr-1" />
          {submitting ? "Criando..." : "Criar e disparar"}
        </Button>
      </div>
    </div>
  );
}
