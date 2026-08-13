"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { FREQUENCIA_MINIMA_PADRAO } from "../lib/constants";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Award, Printer, Pencil, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  turmaId: Id<"turmas">;
}

export function CertificadosTab({ turmaId }: Props) {
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const painel = useQuery(api.turmas.certificados.painel, { turmaId });
  const emitir = useMutation(api.turmas.certificados.emitir);
  const emitirAptos = useMutation(api.turmas.certificados.emitirAptos);
  const revogar = useMutation(api.turmas.certificados.revogar);
  const setObservacoes = useMutation(api.turmas.certificados.setObservacoesInstrutor);
  const setFrequenciaMinima = useMutation(api.turmas.mutations.setFrequenciaMinima);
  const setCriterio = useMutation(api.turmas.mutations.setCriterioAprovacao);

  const [nomeEditado, setNomeEditado] = useState<Record<string, string>>({});
  const [notaAberta, setNotaAberta] = useState<string | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [minimaEditada, setMinimaEditada] = useState<string>("");
  const [faltasEditadas, setFaltasEditadas] = useState<string>("");
  const [ocupado, setOcupado] = useState(false);

  if (painel === undefined) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (painel === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Voce nao tem permissao para gerenciar certificados desta turma.
      </p>
    );
  }

  const minima = painel.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO;
  const porFaltas = painel.criterioAprovacao === "MAX_FALTAS";
  const maxFaltas = painel.maxFaltas ?? 0;
  const aptosSemCertificado = painel.alunos.filter((a) => a.apto && !a.certificado).length;

  // sucesso pode ser funcao para usar o RETORNO da mutation na mensagem — a
  // contagem calculada no render mentiria se o estado mudasse antes do clique.
  async function comBloqueio(
    fn: () => Promise<unknown>,
    sucesso: string | ((resultado: unknown) => string)
  ) {
    setOcupado(true);
    try {
      const resultado = await fn();
      toast.success(typeof sucesso === "function" ? sucesso(resultado) : sucesso);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setOcupado(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs">Criterio de aprovacao</Label>
                <Select
                  value={painel.criterioAprovacao}
                  onValueChange={(v) =>
                    comBloqueio(
                      () =>
                        setCriterio({
                          turmaId,
                          criterioAprovacao: v as "PERCENTUAL" | "MAX_FALTAS",
                          // Troca para faltas sem numero definido comeca em 0:
                          // a secretaria ajusta no campo ao lado.
                          maxFaltas: v === "MAX_FALTAS" ? maxFaltas : undefined,
                        }),
                      "Criterio atualizado"
                    )
                  }
                >
                  <SelectTrigger className="h-10 w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTUAL">Frequencia minima (%)</SelectItem>
                    <SelectItem value="MAX_FALTAS">Maximo de faltas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {porFaltas ? (
                <div className="flex gap-2">
                  <Input
                    id="maxFaltas"
                    type="number"
                    inputMode="numeric"
                    className="w-24 h-10"
                    value={faltasEditadas === "" ? String(maxFaltas) : faltasEditadas}
                    onChange={(e) => setFaltasEditadas(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={
                      ocupado ||
                      faltasEditadas === "" ||
                      Number(faltasEditadas) === maxFaltas
                    }
                    onClick={() =>
                      comBloqueio(async () => {
                        await setCriterio({
                          turmaId,
                          criterioAprovacao: "MAX_FALTAS",
                          maxFaltas: Number(faltasEditadas),
                        });
                        setFaltasEditadas("");
                      }, "Limite de faltas atualizado")
                    }
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="minima"
                    type="number"
                    inputMode="numeric"
                    className="w-24 h-10"
                    value={minimaEditada === "" ? String(minima) : minimaEditada}
                    onChange={(e) => setMinimaEditada(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={ocupado || minimaEditada === "" || Number(minimaEditada) === minima}
                    onClick={() =>
                      comBloqueio(async () => {
                        await setFrequenciaMinima({
                          turmaId,
                          frequenciaMinima: Number(minimaEditada),
                        });
                        setMinimaEditada("");
                      }, "Frequencia minima atualizada")
                    }
                  >
                    Salvar
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 ml-auto">
              <Button
                className="h-10"
                disabled={ocupado || aptosSemCertificado === 0}
                onClick={() =>
                  comBloqueio(
                    () => emitirAptos({ turmaId }),
                    (n) => `Certificados emitidos: ${n}`
                  )
                }
              >
                <Award className="h-4 w-4 mr-1" />
                Emitir para os aptos ({aptosSemCertificado})
              </Button>
              <Button variant="outline" className="h-10" asChild>
                <Link href={`/turmas/${turmaId}/certificados/imprimir`} target="_blank">
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O criterio e semaforo, nao trava: da para emitir para quem ficou fora. A
            impressao sai em lote, um certificado por pagina, com os dados congelados no
            momento da emissao.
          </p>
        </CardContent>
      </Card>

      {painel.alunos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum inscrito confirmado.
        </p>
      ) : (
        <div className="space-y-2">
          {painel.alunos.map((a) => {
            const nome = nomeEditado[a.inscricaoId] ?? a.certificado?.nomeImpresso ?? a.nome;
            const semApuracao = a.percentual === null;
            return (
              <Card key={a.inscricaoId}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {semApuracao
                          ? "Sem aula com chamada feita"
                          : porFaltas
                            ? `${a.faltas} ${a.faltas === 1 ? "falta" : "faltas"} · ${a.aulasPresentes} de ${a.aulasConsideradas} aulas`
                            : `${a.percentual}% · ${a.aulasPresentes} de ${a.aulasConsideradas} aulas`}
                      </p>
                    </div>
                    {a.certificado ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 shrink-0">
                        Emitido
                      </Badge>
                    ) : semApuracao ? (
                      <Badge variant="outline" className="shrink-0">
                        Sem apuracao
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={
                          a.apto
                            ? "bg-green-100 text-green-800 shrink-0"
                            : "bg-yellow-100 text-yellow-800 shrink-0"
                        }
                      >
                        {a.apto
                          ? "Apto"
                          : porFaltas
                            ? `Acima de ${maxFaltas} ${maxFaltas === 1 ? "falta" : "faltas"}`
                            : `Abaixo de ${minima}%`}
                      </Badge>
                    )}
                  </div>

                  {a.certificado ? (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        Nome impresso: <span className="font-medium">{a.certificado.nomeImpresso}</span>
                        {" · "}
                        {a.certificado.criterioAprovacao === "MAX_FALTAS"
                          ? `${a.certificado.faltas ?? 0} faltas no momento da emissao`
                          : `${a.certificado.percentualFrequencia}% no momento da emissao`}
                      </p>
                      <p>Codigo: {a.certificado.codigo}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10"
                        disabled={ocupado}
                        onClick={() =>
                          comBloqueio(
                            () => revogar({ id: a.certificado!._id }),
                            "Certificado revogado — emita um novo para corrigir"
                          )
                        }
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        Revogar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`nome-${a.inscricaoId}`} className="text-xs">
                          Nome que sai impresso
                        </Label>
                        <Input
                          id={`nome-${a.inscricaoId}`}
                          className="h-10"
                          value={nome}
                          onChange={(e) =>
                            setNomeEditado((prev) => ({
                              ...prev,
                              [a.inscricaoId]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-10"
                        disabled={ocupado || semApuracao}
                        onClick={() =>
                          comBloqueio(
                            () =>
                              emitir({
                                inscricaoId: a.inscricaoId,
                                nomeImpresso: nome,
                              }),
                            "Certificado emitido"
                          )
                        }
                      >
                        <Award className="h-4 w-4 mr-1" />
                        Emitir
                      </Button>
                    </div>
                  )}

                  {notaAberta === a.inscricaoId ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notaTexto}
                        rows={3}
                        maxLength={500}
                        placeholder="Anotacao sobre o aluno (opcional)"
                        onChange={(e) => setNotaTexto(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-10"
                          disabled={ocupado}
                          onClick={() =>
                            comBloqueio(async () => {
                              await setObservacoes({
                                inscricaoId: a.inscricaoId,
                                texto: notaTexto,
                              });
                              setNotaAberta(null);
                            }, "Anotacao salva")
                          }
                        >
                          Salvar anotacao
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10"
                          onClick={() => setNotaAberta(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline min-h-[44px] text-left"
                      onClick={() => {
                        setNotaAberta(a.inscricaoId);
                        setNotaTexto(a.observacoesInstrutor ?? "");
                      }}
                    >
                      <Pencil className="h-3 w-3 inline mr-1" />
                      {a.observacoesInstrutor
                        ? `Anotacao: ${a.observacoesInstrutor}`
                        : "Anotar sobre o aluno"}
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
