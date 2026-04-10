"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { GraduationCap, Check, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { DIA_SEMANA_LABELS } from "../lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expirado";
  const horas = Math.floor(ms / (60 * 60 * 1000));
  const minutos = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (horas >= 1) return `${horas}h${minutos > 0 ? ` ${minutos}min` : ""}`;
  return `${minutos}min`;
}

export function ChamadaWidget() {
  const turmas = useQuery(api.turmas.queries.minhasTurmasInstrutor);
  const createEncontro = useMutation(api.turmas.mutations.createEncontro);
  const salvarPresencas = useMutation(api.turmas.mutations.salvarPresencas);

  // Composto: turmaId + encontroData para diferenciar entre encontros distintos
  const [chamadaAberta, setChamadaAberta] = useState<string | null>(null);
  const [encontroAtivo, setEncontroAtivo] = useState<string | null>(null);
  const [presencaLocal, setPresencaLocal] = useState<Record<string, boolean>>({});
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

  async function handleAbrir(item: typeof turmas[0]) {
    const key = `${item._id}-${item.encontroData}`;
    if (chamadaAberta === key) {
      setChamadaAberta(null);
      setEncontroAtivo(null);
      return;
    }

    setChamadaAberta(key);
    setPresencaLocal({});

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
      });
      toast.success("Presenca salva");
      setChamadaAberta(null);
      setEncontroAtivo(null);
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
        const isExpiring = remaining > 0 && remaining < 6 * 60 * 60 * 1000; // < 6h

        return (
          <Card key={key} className={isOpen ? "ring-2 ring-primary" : ""}>
            <CardContent className="p-4 space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer gap-3"
                onClick={() => handleAbrir(t)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.isDiaDeAula
                        ? `Aula de hoje${t.horario ? ` - ${t.horario}` : ""} · ${t.totalInscritos} inscritos`
                        : `Encontro de ${formatDate(t.encontroData)} · ${t.totalInscritos} inscritos`}
                    </p>
                    {t.encontroId && (
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${isExpiring ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        Tempo restante: {formatRemaining(remaining)}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="default" size="sm">
                  {isOpen ? (
                    <><ChevronUp className="h-4 w-4 mr-1" /> Fechar</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-1" /> Chamada</>
                  )}
                </Button>
              </div>

              {isOpen && presencas && (
                <div className="border-t pt-3 space-y-1">
                  {presencas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum inscrito confirmado</p>
                  ) : (
                    <>
                      {presencas.map((p) => {
                        const checked = presencaLocal[p.inscricaoId] ?? p.presente;
                        return (
                          <label
                            key={p.inscricaoId}
                            className="flex items-center gap-3 py-2 px-2 rounded hover:bg-accent cursor-pointer min-h-[44px]"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                setPresencaLocal((prev) => ({
                                  ...prev,
                                  [p.inscricaoId]: v === true,
                                }))
                              }
                            />
                            <span className={`text-sm ${checked ? "font-medium" : "text-muted-foreground"}`}>
                              {p.nome}
                            </span>
                          </label>
                        );
                      })}
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={handleSalvar}
                        disabled={salvando}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {salvando ? "Salvando..." : "Salvar presenca"}
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
