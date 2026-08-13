"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Label } from "@/shared/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { GraduationCap, Check, ChevronDown, Clock, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { DIA_SEMANA_LABELS } from "../lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

/** Iniciais para o avatar: primeiro e ultimo nome. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// Prazo agora e de 7 dias: em horas ficaria "168h", que nao diz nada.
function formatRemaining(ms: number): string {
  if (ms <= 0) return "expirado";
  const dias = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (dias >= 1) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const horas = Math.floor(ms / (60 * 60 * 1000));
  if (horas >= 1) return `${horas}h`;
  return `${Math.floor(ms / (60 * 1000))}min`;
}

export function ChamadaWidget() {
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const turmas = useQuery(api.turmas.queries.minhasTurmasInstrutor);
  const createEncontro = useMutation(api.turmas.mutations.createEncontro);
  const salvarPresencas = useMutation(api.turmas.mutations.salvarPresencas);

  // Composto: turmaId + encontroData para diferenciar entre encontros distintos
  const [chamadaAberta, setChamadaAberta] = useState<string | null>(null);
  const [encontroAtivo, setEncontroAtivo] = useState<string | null>(null);
  const [presencaLocal, setPresencaLocal] = useState<Record<string, boolean>>({});
  const [anotacao, setAnotacao] = useState("");
  const [anotacaoAberta, setAnotacaoAberta] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Tick do relogio para contagem regressiva
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const presencas = useQuery(
    api.turmas.queries.getPresencas,
    encontroAtivo ? { encontroId: encontroAtivo as Id<"turmaEncontros"> } : "skip"
  );

  if (!turmas || turmas.length === 0) return null;

  function fechar() {
    setChamadaAberta(null);
    setEncontroAtivo(null);
    setPresencaLocal({});
    setAnotacao("");
    setAnotacaoAberta(false);
  }

  async function abrir(item: NonNullable<typeof turmas>[number]) {
    setChamadaAberta(`${item._id}-${item.encontroData}`);
    setPresencaLocal({});
    setAnotacao("");
    setAnotacaoAberta(false);

    if (item.encontroId) {
      setEncontroAtivo(item.encontroId);
      return;
    }

    // Sem encontro: cria o de hoje. Só chega aqui quando a turma NÃO tem
    // calendário cadastrado — minhasTurmasInstrutor deixou de deduzir "hoje tem
    // aula" pelo dia da semana quando existem aulas, justamente para o
    // instrutor não materializar aula em data que o curso pulou.
    try {
      const novo = await createEncontro({
        turmaId: item._id as Id<"turmas">,
        data: item.encontroData,
      });
      setEncontroAtivo(novo as string);
    } catch (err: unknown) {
      toast.error((err as Error).message);
      fechar();
    }
  }

  async function handleSalvar() {
    if (!encontroAtivo || !presencas) return;
    setSalvando(true);
    try {
      const lista = presencas.map((p) => ({
        inscricaoId: p.inscricaoId as Id<"inscricoes">,
        presente: presencaLocal[p.inscricaoId] ?? p.presente,
      }));
      await salvarPresencas({
        encontroId: encontroAtivo as Id<"turmaEncontros">,
        presencas: lista,
        observacoes: anotacao.trim() || undefined,
      });
      toast.success("Presenca salva");
      fechar();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setSalvando(false);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Chamadas pendentes</h2>
      {turmas.map((t) => {
        const key = `${t._id}-${t.encontroData}`;
        const isOpen = chamadaAberta === key;
        const remaining = t.expiraEm - now;
        const isExpiring = remaining > 0 && remaining < 24 * 60 * 60 * 1000; // < 1 dia

        // Contagem do que sera salvo — pre-marcado como presente, o instrutor
        // desmarca so quem faltou.
        const total = presencas?.length ?? 0;
        const faltas =
          presencas?.filter((p) => !(presencaLocal[p.inscricaoId] ?? p.presente)).length ?? 0;
        const presentes = total - faltas;

        return (
          <Collapsible
            key={key}
            open={isOpen}
            onOpenChange={(aberto) => (aberto ? abrir(t) : fechar())}
            asChild
          >
            <Card className={isOpen ? "ring-2 ring-primary" : undefined}>
              <CardContent className="p-3 space-y-3">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-auto min-h-[56px] justify-between gap-3 px-2 py-2 text-left whitespace-normal"
                  >
                    <span className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-sm truncate">{t.nome}</span>
                        {t.tituloAula && (
                          <span className="block text-xs text-muted-foreground font-normal">
                            {t.tituloAula}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="font-normal">
                            {t.isDiaDeAula
                              ? `Hoje${t.horario ? ` · ${t.horario}` : ""}`
                              : formatDate(t.encontroData)}
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {t.totalInscritos} {t.totalInscritos === 1 ? "aluno" : "alunos"}
                          </Badge>
                        </span>
                        {t.encontroId && (
                          <span
                            className={`mt-0.5 flex items-center gap-1 text-xs font-normal ${isExpiring ? "text-destructive font-medium" : "text-muted-foreground"}`}
                          >
                            <Clock className="h-3 w-3" />
                            {remaining > 0
                              ? `Some em ${formatRemaining(remaining)}`
                              : "Prazo expirado"}
                          </span>
                        )}
                        {!t.isDiaDeAula && t.diaSemana && (
                          <span className="block text-xs text-muted-foreground font-normal">
                            {DIA_SEMANA_LABELS[t.diaSemana] ?? t.diaSemana}
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-2">
                  {!presencas ? (
                    <p className="text-sm text-muted-foreground px-2">Carregando...</p>
                  ) : presencas.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2">
                      Nenhum inscrito confirmado
                    </p>
                  ) : (
                    <>
                      <Separator />

                      <div className="flex items-center justify-between gap-2 px-2">
                        <span className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 font-medium">
                            <UserCheck className="h-4 w-4 text-primary" />
                            {presentes}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${faltas > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}
                          >
                            <UserX className="h-4 w-4" />
                            {faltas}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Desligue quem faltou
                        </span>
                      </div>

                      <div className="space-y-1">
                        {presencas.map((p) => {
                          const presente = presencaLocal[p.inscricaoId] ?? p.presente;
                          const inputId = `presenca-${p.inscricaoId}`;
                          return (
                            <Label
                              key={p.inscricaoId}
                              htmlFor={inputId}
                              className={`flex items-center justify-between gap-3 min-h-[52px] px-3 rounded-lg border cursor-pointer transition-colors ${
                                presente ? "" : "border-destructive/30 bg-destructive/10"
                              }`}
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <Avatar className="size-9 shrink-0">
                                  <AvatarFallback
                                    className={
                                      presente ? "" : "bg-destructive/15 text-destructive"
                                    }
                                  >
                                    {iniciais(p.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex flex-col min-w-0">
                                <span
                                  className={`text-sm ${presente ? "font-medium" : "text-muted-foreground line-through"}`}
                                >
                                  {p.nome}
                                </span>
                                <span
                                  className={`text-xs font-normal ${presente ? "text-muted-foreground" : "text-destructive"}`}
                                >
                                  {presente ? "Presente" : "Faltou"}
                                </span>
                                </span>
                              </span>
                              <Switch
                                id={inputId}
                                checked={presente}
                                onCheckedChange={(v) =>
                                  setPresencaLocal((prev) => ({
                                    ...prev,
                                    [p.inscricaoId]: v,
                                  }))
                                }
                              />
                            </Label>
                          );
                        })}
                      </div>

                      <Collapsible open={anotacaoAberta} onOpenChange={setAnotacaoAberta}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-2 text-muted-foreground"
                          >
                            {anotacaoAberta
                              ? "Ocultar anotacao"
                              : "+ Anotar algo sobre a aula (opcional)"}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <Textarea
                            value={anotacao}
                            onChange={(e) => setAnotacao(e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="Como foi a aula?"
                          />
                        </CollapsibleContent>
                      </Collapsible>

                      <Button
                        className="w-full h-11"
                        onClick={handleSalvar}
                        disabled={salvando}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {salvando
                          ? "Salvando..."
                          : `Salvar — ${presentes} ${presentes === 1 ? "presente" : "presentes"}, ${faltas} ${faltas === 1 ? "falta" : "faltas"}`}
                      </Button>
                    </>
                  )}
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
