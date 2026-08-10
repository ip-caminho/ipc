"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { GraduationCap, Check, ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { DIA_SEMANA_LABELS } from "../lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

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

  async function handleAbrir(item: NonNullable<typeof turmas>[number]) {
    const key = `${item._id}-${item.encontroData}`;
    if (chamadaAberta === key) {
      fechar();
      return;
    }

    setChamadaAberta(key);
    setPresencaLocal({});
    setAnotacao("");
    setAnotacaoAberta(false);

    if (item.encontroId) {
      setEncontroAtivo(item.encontroId);
    } else {
      // Criar encontro de hoje
      try {
        const id = await createEncontro({
          turmaId: item._id as Id<"turmas">,
          data: item.encontroData,
        });
        setEncontroAtivo(id as string);
      } catch (err: unknown) {
        toast.error((err as Error).message);
      }
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
          <Card key={key} className={isOpen ? "ring-2 ring-primary" : ""}>
            <CardContent className="p-4 space-y-3">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 text-left min-h-[44px]"
                onClick={() => handleAbrir(t)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.isDiaDeAula
                        ? `Aula de hoje${t.horario ? ` - ${t.horario}` : ""} · ${t.totalInscritos} inscritos`
                        : `Aula de ${formatDate(t.encontroData)} · ${t.totalInscritos} inscritos`}
                    </p>
                    {t.encontroId && (
                      <p
                        className={`text-xs mt-0.5 flex items-center gap-1 ${isExpiring ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                      >
                        <Clock className="h-3 w-3" />
                        {remaining > 0 ? `Some em ${formatRemaining(remaining)}` : "Prazo expirado"}
                      </p>
                    )}
                    {!t.isDiaDeAula && t.diaSemana && (
                      <p className="text-xs text-muted-foreground">
                        {DIA_SEMANA_LABELS[t.diaSemana] ?? t.diaSemana}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center h-11 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                  {isOpen ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" /> Fechar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" /> Chamada
                    </>
                  )}
                </span>
              </button>

              {isOpen && presencas && (
                <div className="border-t pt-3 space-y-2">
                  {presencas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum inscrito confirmado</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Todos comecam como presentes. Toque em quem faltou.
                      </p>

                      <div className="space-y-1">
                        {presencas.map((p) => {
                          const presente = presencaLocal[p.inscricaoId] ?? p.presente;
                          return (
                            <button
                              key={p.inscricaoId}
                              type="button"
                              aria-pressed={presente}
                              onClick={() =>
                                setPresencaLocal((prev) => ({
                                  ...prev,
                                  [p.inscricaoId]: !presente,
                                }))
                              }
                              className={`w-full flex items-center justify-between gap-3 min-h-[48px] px-3 rounded-lg border text-left transition-colors ${
                                presente
                                  ? "bg-background border-border"
                                  : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
                              }`}
                            >
                              <span
                                className={`text-sm ${presente ? "font-medium" : "text-muted-foreground line-through"}`}
                              >
                                {p.nome}
                              </span>
                              <span className="shrink-0 flex items-center gap-1 text-xs">
                                {presente ? (
                                  <>
                                    <Check className="h-4 w-4 text-green-600" />
                                    <span className="text-green-700 dark:text-green-500">
                                      Presente
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <X className="h-4 w-4 text-red-600" />
                                    <span className="text-red-700 dark:text-red-400">Faltou</span>
                                  </>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {anotacaoAberta ? (
                        <Textarea
                          value={anotacao}
                          onChange={(e) => setAnotacao(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Como foi a aula? (opcional)"
                          className="mt-2"
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 px-2 text-muted-foreground"
                          onClick={() => setAnotacaoAberta(true)}
                        >
                          + Anotar algo sobre a aula (opcional)
                        </Button>
                      )}

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
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
