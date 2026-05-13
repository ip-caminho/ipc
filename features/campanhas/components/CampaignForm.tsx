"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { Send, X, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const TEMPLATE_MEMBRO = `Ola {nome}, paz do Senhor!

A secretaria esta atualizando o cadastro de membros.
Por favor entre em https://ipc.app/meu-perfil e confirme seus dados.
Leva 2 minutos.

IPC`;

const TEMPLATE_FREQUENTADOR = `Ola {nome}, paz do Senhor!

Que alegria te ter conosco. Para te servir melhor, gostariamos de cadastrar seu contato.
Entre em https://ipc.app/meu-perfil e preencha seus dados.
Leva 2 minutos.

IPC`;

const PUBLICO_ALVO_OPTIONS = [
  { value: "MEMBRO", label: "Membros (rol oficial)" },
  { value: "FREQUENTADOR", label: "Frequentadores" },
  { value: "VISITANTE", label: "Visitantes" },
];

type MembroSelecionado = { id: Id<"membros">; nome: string; whatsapp: string };

export function CampaignForm() {
  const router = useRouter();
  const criarCampanha = useMutation(api.messaging.campanhas.criarCampanha);
  const dispararCampanha = useMutation(api.messaging.campanhas.dispararCampanha);

  const [titulo, setTitulo] = useState("Atualizacao de cadastro - " + new Date().toLocaleDateString("pt-BR"));
  const [publicoAlvo, setPublicoAlvo] = useState<"MEMBRO" | "FREQUENTADOR" | "VISITANTE">("MEMBRO");
  const [template, setTemplate] = useState(TEMPLATE_MEMBRO);
  const [janelaMeses, setJanelaMeses] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const [modoTeste, setModoTeste] = useState(false);
  const [search, setSearch] = useState("");
  const [selecionados, setSelecionados] = useState<MembroSelecionado[]>([]);

  const handlePublicoChange = (v: string) => {
    const alvo = v as "MEMBRO" | "FREQUENTADOR" | "VISITANTE";
    setPublicoAlvo(alvo);
    // Sugere template default conforme publico alvo (so substitui se ainda for um dos defaults)
    if (template === TEMPLATE_MEMBRO || template === TEMPLATE_FREQUENTADOR) {
      setTemplate(alvo === "MEMBRO" ? TEMPLATE_MEMBRO : TEMPLATE_FREQUENTADOR);
    }
  };

  const buscaMembros = useQuery(
    api.membros.queries.list,
    modoTeste && search.trim().length >= 2 ? { search: search.trim() } : "skip"
  );

  const filtros = modoTeste
    ? {
        membroIds: selecionados.map((s) => s.id),
        apenasComWhatsapp: true,
      }
    : {
        vinculoIgreja: [publicoAlvo],
        status: ["ATIVO"],
        apenasComWhatsapp: true,
        naoAtualizadoHaMeses: typeof janelaMeses === "number" ? janelaMeses : undefined,
      };

  const preview = useQuery(api.messaging.campanhas.previewDestinatarios, { filtros });

  const adicionarMembro = (m: MembroSelecionado) => {
    if (selecionados.some((s) => s.id === m.id)) return;
    setSelecionados((prev) => [...prev, m]);
    setSearch("");
  };

  const removerMembro = (id: Id<"membros">) => {
    setSelecionados((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCriar = async (disparar: boolean) => {
    if (!titulo.trim()) {
      toast.error("Informe um titulo");
      return;
    }
    if (!template.trim()) {
      toast.error("Informe um template");
      return;
    }
    if (modoTeste && selecionados.length === 0) {
      toast.error("Selecione ao menos um membro para o modo teste");
      return;
    }
    if (!preview || preview.total === 0) {
      toast.error("Nenhum destinatario com os filtros atuais");
      return;
    }

    const msg = modoTeste
      ? `Disparar para ${preview.total} membro(s) selecionado(s): ${selecionados.map((s) => s.nome).join(", ")}?`
      : `Confirmar criacao da campanha para ${preview.total} destinatarios?${disparar ? "\n\nA campanha sera disparada imediatamente." : ""}`;
    if (!confirm(msg)) return;

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

          {!modoTeste && (
            <div className="space-y-1">
              <Label className="text-xs">Publico alvo</Label>
              <Select value={publicoAlvo} onValueChange={handlePublicoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLICO_ALVO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {!modoTeste && (
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
          )}
        </CardContent>
      </Card>

      <Card className={modoTeste ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Modo teste
            <Button
              type="button"
              variant={modoTeste ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setModoTeste(!modoTeste);
                setSelecionados([]);
                setSearch("");
              }}
            >
              {modoTeste ? "Ativo" : "Ativar"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!modoTeste ? (
            <p className="text-xs text-muted-foreground">
              Ative para disparar apenas para membros especificos (ideal para validar o fluxo antes do envio em massa).
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Buscar membro (nome ou WhatsApp)</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Digite ao menos 2 caracteres"
                  />
                </div>
              </div>

              {search.trim().length >= 2 && buscaMembros && (
                <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                  {buscaMembros.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">Nenhum membro encontrado</p>
                  ) : (
                    buscaMembros.slice(0, 20).map((m) => {
                      const ja = selecionados.some((s) => s.id === m._id);
                      return (
                        <button
                          key={m._id}
                          type="button"
                          disabled={ja || !m.entidade.whatsapp}
                          onClick={() =>
                            adicionarMembro({
                              id: m._id,
                              nome: m.entidade.nomeCompleto ?? "(sem nome)",
                              whatsapp: m.entidade.whatsapp ?? "",
                            })
                          }
                          className="w-full text-left p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm flex justify-between items-center"
                        >
                          <span>{m.entidade.nomeCompleto}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.entidade.whatsapp || "sem WhatsApp"}
                            {ja && " · ja selecionado"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {selecionados.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Selecionados ({selecionados.length})</Label>
                  <div className="flex flex-wrap gap-1">
                    {selecionados.map((s) => (
                      <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                        {s.nome}
                        <button
                          type="button"
                          onClick={() => removerMembro(s.id)}
                          className="hover:bg-muted-foreground/20 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Destinatarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {modoTeste ? (
              <Badge variant="secondary">Modo teste: {selecionados.length} membro(s)</Badge>
            ) : (
              <>
                <Badge variant="secondary">Publico: {publicoAlvo}</Badge>
                <Badge variant="secondary">Status: ATIVO</Badge>
                <Badge variant="secondary">Com WhatsApp</Badge>
                {typeof janelaMeses === "number" && janelaMeses > 0 && (
                  <Badge variant="secondary">Sem atualizar ha {janelaMeses}+ meses</Badge>
                )}
              </>
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
