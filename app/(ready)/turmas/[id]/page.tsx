"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Calendar, Copy, MapPin, Users, Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { STATUS_TURMA, DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function TurmaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const turma = useQuery(api.turmas.queries.getById, { id: id as Id<"turmas"> });
  const inscricoes = useQuery(api.turmas.queries.listInscricoes, { turmaId: id as Id<"turmas"> });
  const encontros = useQuery(api.turmas.queries.listEncontros, { turmaId: id as Id<"turmas"> });
  const updateStatus = useMutation(api.turmas.mutations.updateStatus);
  const cancelarInscricao = useMutation(api.turmas.mutations.cancelarInscricao);
  const createEncontro = useMutation(api.turmas.mutations.createEncontro);
  const removeEncontro = useMutation(api.turmas.mutations.removeEncontro);
  const salvarPresencas = useMutation(api.turmas.mutations.salvarPresencas);

  const [novoEncontroData, setNovoEncontroData] = useState("");
  const [novoEncontroTitulo, setNovoEncontroTitulo] = useState("");
  const [encontroAberto, setEncontroAberto] = useState<string | null>(null);

  // Presencas do encontro aberto
  const presencas = useQuery(
    api.turmas.queries.getPresencas,
    encontroAberto ? { encontroId: encontroAberto as Id<"turmaEncontros"> } : "skip"
  );
  const [presencaLocal, setPresencaLocal] = useState<Record<string, boolean>>({});

  if (turma === undefined) return <div className="p-6">Carregando...</div>;
  if (turma === null) return <div className="p-6">Turma nao encontrada</div>;

  const statusOpt = STATUS_TURMA.find((s) => s.value === turma.status);
  const shareUrl = turma.token ? `${window.location.origin}/inscricao/${turma.token}` : "";

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await updateStatus({ id: id as Id<"turmas">, status: newStatus as "ABERTA" | "EM_ANDAMENTO" | "ENCERRADA" | "CANCELADA" });
      toast.success("Status atualizado");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleCriarEncontro() {
    if (!novoEncontroData) {
      toast.error("Informe a data");
      return;
    }
    try {
      await createEncontro({
        turmaId: id as Id<"turmas">,
        data: novoEncontroData,
        titulo: novoEncontroTitulo || undefined,
      });
      setNovoEncontroData("");
      setNovoEncontroTitulo("");
      toast.success("Encontro criado");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleRemoverEncontro(encontroId: string) {
    if (!confirm("Remover este encontro e todas as presenças?")) return;
    try {
      await removeEncontro({ id: encontroId as Id<"turmaEncontros"> });
      if (encontroAberto === encontroId) setEncontroAberto(null);
      toast.success("Encontro removido");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  function handleAbrirPresenca(encontroId: string) {
    if (encontroAberto === encontroId) {
      setEncontroAberto(null);
      return;
    }
    setEncontroAberto(encontroId);
    setPresencaLocal({});
  }

  async function handleSalvarPresencas() {
    if (!encontroAberto || !presencas) return;
    const lista = presencas.map((p) => ({
      inscricaoId: p.inscricaoId as Id<"inscricoes">,
      presente: presencaLocal[p.inscricaoId] ?? p.presente,
    }));
    try {
      await salvarPresencas({
        encontroId: encontroAberto as Id<"turmaEncontros">,
        presencas: lista,
      });
      toast.success("Presença salva");
      setEncontroAberto(null);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  return (
    <ModuloGuard modulo="turmas">
      <HeaderLayout>
      <div className="container max-w-4xl py-6 space-y-4">
        <DetailHeader backHref="/turmas" />

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-xl">{turma.nome}</CardTitle>
              <Badge variant="outline" className={statusOpt?.color ?? ""}>
                {statusOpt?.label ?? turma.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(turma.dataInicio)}
                {turma.diaSemana && ` - ${DIA_SEMANA_LABELS[turma.diaSemana] ?? turma.diaSemana}`}
                {turma.horario && ` ${turma.horario}`}
              </span>
              {turma.local && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {turma.local}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {turma.totalInscritos} inscritos
                {turma.totalListaEspera > 0 && ` (${turma.totalListaEspera} na espera)`}
              </span>
            </div>

            {turma.descricao && <p className="text-sm">{turma.descricao}</p>}

            <div className="flex gap-2 flex-wrap">
              {can("turmas:update") && (
                <Select value={turma.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_TURMA.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {shareUrl && (
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Link de inscricao
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="inscricoes">
          <TabsList>
            <TabsTrigger value="inscricoes">Inscricoes ({inscricoes?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="presenca">Presenca ({encontros?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="inscricoes" className="mt-4">
            {!inscricoes ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : inscricoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma inscricao</p>
            ) : (
              <div className="space-y-2">
                {inscricoes.map((i) => (
                  <Card key={i._id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{i.dadosSistema.nomeCompleto}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {i.dadosSistema.whatsapp && <span>{i.dadosSistema.whatsapp}</span>}
                          {i.dadosSistema.email && <span>{i.dadosSistema.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          i.status === "CONFIRMADA" ? "bg-green-100 text-green-800" :
                          i.status === "LISTA_ESPERA" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }>
                          {i.status === "CONFIRMADA" ? "Confirmada" :
                           i.status === "LISTA_ESPERA" ? "Espera" : "Cancelada"}
                        </Badge>
                        {can("turmas:manage_inscricoes") && i.status !== "CANCELADA" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-500"
                            onClick={async () => {
                              await cancelarInscricao({ id: i._id });
                              toast.success("Inscricao cancelada");
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="presenca" className="mt-4 space-y-4">
            {/* Criar encontro */}
            {can("turmas:manage_inscricoes") && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm font-medium mb-2">Novo encontro</p>
                  <div className="flex gap-2 items-end flex-wrap">
                    <div>
                      <label className="text-xs text-muted-foreground">Data</label>
                      <Input
                        type="date"
                        value={novoEncontroData}
                        onChange={(e) => setNovoEncontroData(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-xs text-muted-foreground">Titulo (opcional)</label>
                      <Input
                        value={novoEncontroTitulo}
                        onChange={(e) => setNovoEncontroTitulo(e.target.value)}
                        placeholder="Ex: Aula 1 - Introducao"
                      />
                    </div>
                    <Button size="sm" onClick={handleCriarEncontro}>
                      <Plus className="h-4 w-4 mr-1" /> Criar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de encontros */}
            {!encontros ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : encontros.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum encontro registrado</p>
            ) : (
              <div className="space-y-2">
                {encontros.map((e) => (
                  <Card key={e._id} className={encontroAberto === e._id ? "ring-2 ring-primary" : ""}>
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="cursor-pointer flex-1" onClick={() => handleAbrirPresenca(e._id)}>
                          <p className="font-medium text-sm">{formatDate(e.data)}</p>
                          {e.titulo && <p className="text-xs text-muted-foreground">{e.titulo}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {e.totalPresentes}/{e.totalPresentes + e.totalAusentes}
                          </span>
                          {can("turmas:manage_inscricoes") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAbrirPresenca(e._id)}
                              >
                                {encontroAberto === e._id ? "Fechar" : "Chamada"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoverEncontro(e._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Painel de chamada */}
                      {encontroAberto === e._id && presencas && (
                        <div className="border-t pt-3 space-y-2">
                          {presencas.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum inscrito confirmado</p>
                          ) : (
                            <>
                              {presencas.map((p) => {
                                const checked = presencaLocal[p.inscricaoId] ?? p.presente;
                                return (
                                  <label
                                    key={p.inscricaoId}
                                    className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-accent cursor-pointer"
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
                              <Button size="sm" className="w-full mt-2" onClick={handleSalvarPresencas}>
                                <Check className="h-4 w-4 mr-1" /> Salvar presenca
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
