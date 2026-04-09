"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Music, FileText, CheckSquare, MessageSquare, Upload } from "lucide-react";
import { toast } from "sonner";
import { STATUS_ARQUIVO } from "@features/multimidia/lib/constants";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function MultimidiaPage() {
  const { can } = useAuth();
  // Buscar proximo culto
  // @ts-expect-error Convex TS2589
  const cultos = useQuery(api.escalas.queries.listCultos, { limit: 10 });
  const [cultoIndex, setCultoIndex] = useState(0);

  // Encontrar proximo culto futuro
  const hoje = new Date().toISOString().split("T")[0];
  const cultosFuturos = cultos?.filter((c: any) => c.data >= hoje).sort((a: any, b: any) => a.data.localeCompare(b.data)) ?? [];
  const cultosPassados = cultos?.filter((c: any) => c.data < hoje).sort((a: any, b: any) => b.data.localeCompare(a.data)) ?? [];
  const todosOrdenados = [...cultosFuturos, ...cultosPassados];
  const cultoAtual = todosOrdenados[cultoIndex];

  const painel = useQuery(
    api.multimidia.queries.getPainelCulto,
    cultoAtual ? { cultoId: cultoAtual._id } : "skip"
  );

  const toggleChecklist = useMutation(api.multimidia.mutations.toggleChecklistItem);
  const initChecklist = useMutation(api.multimidia.mutations.initChecklist);
  const criarNota = useMutation(api.multimidia.mutations.criarNota);

  const [notaTexto, setNotaTexto] = useState("");

  if (!cultos) return <div className="p-6">Carregando...</div>;
  if (todosOrdenados.length === 0) return <div className="p-6">Nenhum culto encontrado</div>;

  async function handleInitChecklist() {
    if (!cultoAtual) return;
    await initChecklist({ cultoId: cultoAtual._id });
    toast.success("Checklist inicializado");
  }

  async function handleCriarNota() {
    if (!cultoAtual || !notaTexto.trim()) return;
    await criarNota({ cultoId: cultoAtual._id, texto: notaTexto });
    setNotaTexto("");
  }

  return (
    <ModuloGuard modulo="multimidia">
      <div className="container max-w-4xl py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Multimídia</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={cultoIndex >= todosOrdenados.length - 1}
              onClick={() => setCultoIndex((i) => i + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {cultoAtual ? formatDate(cultoAtual.data) : ""}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={cultoIndex <= 0}
              onClick={() => setCultoIndex((i) => i - 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!painel ? (
          <p className="text-sm text-muted-foreground">Carregando painel...</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Liturgia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Music className="h-4 w-4" /> Liturgia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {painel.escalas.map((e: any) => (
                  <div key={e._id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{e.funcao}</span>
                    <span className="font-medium">{e.membroNome}</span>
                  </div>
                ))}
                {painel.louvores.length > 0 && (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Louvores</p>
                    {painel.louvores.map((l: any, i: number) => (
                      <div key={l._id} className="text-sm flex justify-between">
                        <span>{i + 1}. {l.titulo}</span>
                        {l.tom && <Badge variant="outline" className="text-xs">{l.tom}</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Arquivos recebidos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Arquivos ({painel.arquivos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {painel.arquivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum arquivo recebido</p>
                ) : (
                  <div className="space-y-2">
                    {painel.arquivos.map((a: any) => {
                      const statusOpt = STATUS_ARQUIVO.find((s) => s.value === a.status);
                      return (
                        <div key={a._id} className="flex items-center justify-between text-sm p-2 border rounded">
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{a.nomeArquivo}</p>
                            <p className="text-xs text-muted-foreground">{a.tipo}</p>
                          </div>
                          <Badge variant="outline" className={statusOpt?.color ?? ""}>
                            {statusOpt?.label ?? a.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avisos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Avisos ({painel.avisos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {painel.avisos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aviso</p>
                ) : (
                  <div className="space-y-2">
                    {painel.avisos.map((a: any) => (
                      <div key={a._id} className="text-sm border-l-2 border-yellow-400 pl-2">
                        <p className="font-medium">{a.titulo}</p>
                        {a.descricao && <p className="text-xs text-muted-foreground">{a.descricao}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                {painel.checklist.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">Checklist nao inicializado</p>
                    {can("multimidia:update") && (
                      <Button size="sm" variant="outline" onClick={handleInitChecklist}>
                        Inicializar checklist
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {painel.checklist.map((item: any) => (
                      <label key={item._id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={item.concluido}
                          onCheckedChange={() => toggleChecklist({ id: item._id })}
                          disabled={!can("multimidia:update")}
                        />
                        <span className={item.concluido ? "line-through text-muted-foreground" : ""}>
                          {item.item}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notas */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Anotações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {painel.notas.map((n: any) => (
                  <div key={n._id} className="text-sm border-l-2 border-muted pl-3">
                    <p className="text-xs text-muted-foreground">{n.autorNome}</p>
                    <p>{n.texto}</p>
                  </div>
                ))}
                {can("multimidia:update") && (
                  <div className="flex gap-2">
                    <Textarea
                      value={notaTexto}
                      onChange={(e) => setNotaTexto(e.target.value)}
                      placeholder="Adicionar anotação..."
                      rows={1}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleCriarNota} disabled={!notaTexto.trim()}>
                      Enviar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ModuloGuard>
  );
}
