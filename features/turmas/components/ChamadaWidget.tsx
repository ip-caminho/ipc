"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { GraduationCap, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { DIA_SEMANA_LABELS } from "../lib/constants";
import type { Id } from "@/convex/_generated/dataModel";

export function ChamadaWidget() {
  const turmas = useQuery(api.turmas.queries.minhasTurmasInstrutor);
  const createEncontro = useMutation(api.turmas.mutations.createEncontro);
  const salvarPresencas = useMutation(api.turmas.mutations.salvarPresencas);

  const [chamadaAberta, setChamadaAberta] = useState<string | null>(null);
  const [encontroId, setEncontroId] = useState<string | null>(null);
  const [presencaLocal, setPresencaLocal] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  const presencas = useQuery(
    api.turmas.queries.getPresencas,
    encontroId ? { encontroId: encontroId as Id<"turmaEncontros"> } : "skip"
  );

  if (!turmas || turmas.length === 0) return null;

  // Filtrar turmas que tem aula hoje
  const turmasHoje = turmas.filter((t) => t.isDiaDeAula);
  if (turmasHoje.length === 0) return null;

  async function handleIniciarChamada(turmaId: string, encontroHojeId: string | null) {
    if (chamadaAberta === turmaId) {
      setChamadaAberta(null);
      setEncontroId(null);
      return;
    }

    setChamadaAberta(turmaId);
    setPresencaLocal({});

    if (encontroHojeId) {
      setEncontroId(encontroHojeId);
    } else {
      // Criar encontro de hoje
      try {
        const hoje = new Date().toISOString().split("T")[0];
        const id = await createEncontro({
          turmaId: turmaId as Id<"turmas">,
          data: hoje,
        });
        setEncontroId(id as string);
      } catch (err: unknown) {
        toast.error((err as Error).message);
      }
    }
  }

  async function handleSalvar() {
    if (!encontroId || !presencas) return;
    setSalvando(true);
    try {
      const lista = presencas.map((p) => ({
        inscricaoId: p.inscricaoId as Id<"inscricoes">,
        presente: presencaLocal[p.inscricaoId] ?? p.presente,
      }));
      await salvarPresencas({
        encontroId: encontroId as Id<"turmaEncontros">,
        presencas: lista,
      });
      toast.success("Presenca salva");
      setChamadaAberta(null);
      setEncontroId(null);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setSalvando(false);
  }

  return (
    <div className="space-y-2">
      {turmasHoje.map((t) => (
        <Card key={t._id} className={chamadaAberta === t._id ? "ring-2 ring-primary" : ""}>
          <CardContent className="p-4 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleIniciarChamada(t._id, t.encontroHojeId)}
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{t.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.diaSemana && DIA_SEMANA_LABELS[t.diaSemana]}{t.horario && ` ${t.horario}`} — {t.totalInscritos} inscritos
                  </p>
                </div>
              </div>
              <Button variant="default" size="sm">
                {chamadaAberta === t._id ? (
                  <><ChevronUp className="h-4 w-4 mr-1" /> Fechar</>
                ) : (
                  <><ChevronDown className="h-4 w-4 mr-1" /> Chamada</>
                )}
              </Button>
            </div>

            {chamadaAberta === t._id && presencas && (
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
      ))}
    </div>
  );
}
