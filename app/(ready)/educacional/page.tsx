"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { useProfessorTurmas } from "@features/educacional/hooks/useProfessorTurmas";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Plus,
  Users,
  CalendarDays,
  ClipboardList,
  Baby,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { CriancaCard } from "@features/educacional/components/CriancaCard";
import { CriancaForm } from "@features/educacional/components/CriancaForm";
import { CriancaDetalhe } from "@features/educacional/components/CriancaDetalhe";
import { RelatorioForm } from "@features/educacional/components/RelatorioForm";
import { EscalaForm } from "@features/educacional/components/EscalaForm";

import type { CriancaFormValues } from "@features/educacional/lib/validations";
import type { RelatorioFormValues } from "@features/educacional/lib/validations";
import type { EscalaFormValues } from "@features/educacional/lib/validations";
import { TURMA_OPTIONS, TURMA_COLORS } from "@features/educacional/lib/constants";

export default function EducacionalPage() {
  const { can } = useAuth();
  const router = useRouter();
  const canRead = can("criancas:read");
  const canManage = can("criancas:manage");
  const canReadEdu = can("educacional:read");
  const canWriteEdu = can("educacional:write");
  const isCoordenador = canManage || canWriteEdu;

  // Deteccao de persona: professor escalado em turma
  const { turmas: minhasTurmas, isLoading: loadingTurmas } = useProfessorTurmas();

  // Redireciona para a turma unica quando professor tem apenas 1
  useEffect(() => {
    if (loadingTurmas) return;
    if (isCoordenador) return; // coordenador ve view completa
    if (minhasTurmas.length === 1) {
      router.replace(`/educacional/turma/${minhasTurmas[0]}`);
    }
  }, [loadingTurmas, isCoordenador, minhasTurmas, router]);

  // State
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [selectedEntidadeId, setSelectedEntidadeId] = useState<Id<"entidades"> | null>(null);
  const [criancaFormOpen, setCriancaFormOpen] = useState(false);
  const [editingCrianca, setEditingCrianca] = useState<any>(null);
  const [relatorioFormOpen, setRelatorioFormOpen] = useState(false);
  const [escalaFormOpen, setEscalaFormOpen] = useState(false);

  // Queries
  const criancas = useQuery(
    api.educacional.queries.listCriancas,
    canRead ? { turma: turmaFilter === "all" ? undefined : turmaFilter } : "skip"
  );
  const relatorios = useQuery(
    api.educacional.queries.listRelatorios,
    canReadEdu ? {} : "skip"
  );

  // Buscar o ministerio "Educacional Infantil" para escalas
  // @ts-ignore Convex TS2589
  const ministerios = useQuery(api.ministerios.queries.list, canReadEdu ? {} : "skip");
  const eduMinisterio = ministerios?.find(
    (m: any) => m.nome.toLowerCase().includes("educacional")
  );

  const escalas = useQuery(
    api.educacional.queries.listEscalas,
    canReadEdu && eduMinisterio ? { ministerioId: eduMinisterio._id } : "skip"
  );

  // Mutations
  const createCrianca = useMutation(api.educacional.mutations.createCrianca);
  const updateCrianca = useMutation(api.educacional.mutations.updateCrianca);
  const removeCrianca = useMutation(api.educacional.mutations.removeCrianca);
  const createRelatorio = useMutation(api.educacional.mutations.createRelatorio);
  const createEscala = useMutation(api.educacional.mutations.createEscala);
  const removeEscala = useMutation(api.educacional.mutations.removeEscala);

  // Handlers
  const handleCreateCrianca = async (data: CriancaFormValues) => {
    try {
      await createCrianca({
        nomeCompleto: data.nomeCompleto,
        dataNascimento: data.dataNascimento || undefined,
        sexo: data.sexo || undefined,
        turma: data.turma,
        usoImagem: data.usoImagem,
        observacoesMedicas: data.observacoesMedicas || undefined,
        observacoesFamilia: data.observacoesFamilia || undefined,
      });
      toast.success("Crianca cadastrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleEditCrianca = async (data: CriancaFormValues) => {
    if (!editingCrianca) return;
    try {
      await updateCrianca({
        entidadeId: editingCrianca.entidadeId as Id<"entidades">,
        nomeCompleto: data.nomeCompleto,
        dataNascimento: data.dataNascimento || undefined,
        sexo: data.sexo || undefined,
        turma: data.turma,
        usoImagem: data.usoImagem,
        observacoesMedicas: data.observacoesMedicas || undefined,
        observacoesFamilia: data.observacoesFamilia || undefined,
      });
      toast.success("Crianca atualizada");
      setEditingCrianca(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleDeleteCrianca = async () => {
    if (!selectedEntidadeId || !confirm("Excluir esta crianca?")) return;
    try {
      await removeCrianca({ entidadeId: selectedEntidadeId });
      toast.success("Crianca excluida");
      setSelectedEntidadeId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleCreateRelatorio = async (data: RelatorioFormValues) => {
    try {
      await createRelatorio({
        turma: data.turma,
        data: data.data,
        professores: data.professores,
        observacoes: data.observacoes || undefined,
        presentes: data.presentes as Id<"entidades">[],
      });
      toast.success("Relatorio criado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleCreateEscala = async (data: EscalaFormValues) => {
    if (!eduMinisterio) return;
    try {
      await createEscala({
        ministerioId: eduMinisterio._id as Id<"ministerios">,
        data: data.data,
        subgrupo: data.subgrupo || undefined,
        membros: data.membros.map((m) => ({
          membroId: m.membroId as Id<"membros">,
          papel: m.papel || undefined,
        })),
        observacoes: data.observacoes || undefined,
      });
      toast.success("Escala criada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  const handleRemoveEscala = async (id: string) => {
    if (!confirm("Excluir esta escala?")) return;
    try {
      await removeEscala({ id: id as Id<"ministerioEscalas"> });
      toast.success("Escala excluida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  // --- Professor com 2+ turmas: seletor ---
  if (!isCoordenador && !loadingTurmas && minhasTurmas.length > 1) {
    return (
      <ModuloGuard modulo="educacional">
        <div className="max-w-xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-medium">Educacional</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione sua turma para marcar presença
            </p>
          </div>
          <div className="space-y-2">
            {minhasTurmas.map((turma) => {
              const label = TURMA_OPTIONS.find((t) => t.value === turma)?.label || `Turma ${turma}`;
              return (
                <Link
                  key={turma}
                  href={`/educacional/turma/${turma}`}
                  className="flex items-center gap-4 rounded-xl border bg-card p-4 min-h-[64px] hover:bg-muted/50 active:bg-muted transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium">{label}</div>
                    <div className="text-sm text-muted-foreground">Marcar presença</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </ModuloGuard>
    );
  }

  // --- Sem turma atribuida e sem permissao de coordenador ---
  if (!isCoordenador && !loadingTurmas && minhasTurmas.length === 0) {
    return (
      <ModuloGuard modulo="educacional">
        <div className="max-w-md mx-auto text-center pt-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
            <Baby className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-medium">Educacional Infantil</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Você não está escalado como professor em nenhuma turma.
          </p>
        </div>
      </ModuloGuard>
    );
  }

  // --- Detalhe de crianca ---
  if (selectedEntidadeId) {
    return (
      <ModuloGuard modulo="educacional">
        <CriancaDetalhe
          entidadeId={selectedEntidadeId}
          onBack={() => setSelectedEntidadeId(null)}
          onEdit={() => {
            const c = criancas?.find((c: any) => c.entidadeId === selectedEntidadeId);
            if (c) {
              setEditingCrianca(c);
            }
          }}
          onDelete={handleDeleteCrianca}
        />
        {editingCrianca && (
          <CriancaForm
            open={!!editingCrianca}
            onOpenChange={(open) => !open && setEditingCrianca(null)}
            onSubmit={handleEditCrianca}
            defaultValues={{
              nomeCompleto: editingCrianca.nome,
              dataNascimento: editingCrianca.dataNascimento,
              sexo: editingCrianca.sexo,
              turma: editingCrianca.turma,
              usoImagem: editingCrianca.usoImagem,
              observacoesMedicas: editingCrianca.observacoesMedicas,
              observacoesFamilia: editingCrianca.observacoesFamilia,
            }}
            isEditing
          />
        )}
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="educacional">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Educacional Infantil</h1>
          {canWriteEdu && (
            <Button asChild>
              <Link href="/educacional/presenca">
                <ClipboardList className="h-4 w-4 mr-1" />
                Presenca
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue="turmas">
          <TabsList>
            <TabsTrigger value="turmas" className="gap-1.5">
              <Users className="h-4 w-4" />
              Turmas
            </TabsTrigger>
            {canReadEdu && (
              <TabsTrigger value="escala" className="gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Escala
              </TabsTrigger>
            )}
            {canReadEdu && (
              <TabsTrigger value="relatorios" className="gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Relatorios
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab: Turmas */}
          <TabsContent value="turmas" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Select
                value={turmaFilter}
                onValueChange={setTurmaFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {TURMA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PermissionGate permission="criancas:manage">
                <Button onClick={() => setCriancaFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Crianca
                </Button>
              </PermissionGate>
            </div>

            {criancas === undefined ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : criancas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma crianca encontrada</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{criancas.length} crianca{criancas.length !== 1 ? "s" : ""}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {criancas.map((c: any) => (
                    <CriancaCard
                      key={c._id}
                      crianca={c}
                      onClick={() => setSelectedEntidadeId(c.entidadeId)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab: Escala */}
          {canReadEdu && (
            <TabsContent value="escala" className="space-y-4">
              <div className="flex justify-end">
                <PermissionGate permission="educacional:write">
                  <Button
                    onClick={() => setEscalaFormOpen(true)}
                    disabled={!eduMinisterio}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Escala
                  </Button>
                </PermissionGate>
              </div>

              {!eduMinisterio && (
                <p className="text-sm text-muted-foreground">
                  Ministerio &quot;Educacional&quot; nao encontrado. Crie-o em Ministerios.
                </p>
              )}

              {escalas === undefined ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : !escalas || escalas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma escala encontrada</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {escalas.map((e: any) => (
                    <Card key={e._id}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {format(parseISO(e.data), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                            </p>
                            {e.subgrupo && (
                              <Badge
                                variant="secondary"
                                className={TURMA_COLORS[e.subgrupo] || ""}
                              >
                                Turma {e.subgrupo}
                              </Badge>
                            )}
                            <div className="mt-1 space-y-0.5">
                              {e.membros.map((m: any, i: number) => (
                                <p key={i} className="text-sm text-muted-foreground">
                                  {m.nome}{m.papel ? ` (${m.papel})` : ""}
                                </p>
                              ))}
                            </div>
                          </div>
                          {canWriteEdu && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEscala(e._id)}
                            >
                              Excluir
                            </Button>
                          )}
                        </div>
                        {e.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1">{e.observacoes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Tab: Relatorios */}
          {canReadEdu && (
            <TabsContent value="relatorios" className="space-y-4">
              <div className="flex justify-end">
                <PermissionGate permission="educacional:write">
                  <Button onClick={() => setRelatorioFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Relatorio
                  </Button>
                </PermissionGate>
              </div>

              {relatorios === undefined ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : relatorios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum relatorio encontrado</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {relatorios.map((r: any) => (
                    <Card key={r._id}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {format(parseISO(r.data), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <Badge
                              variant="secondary"
                              className={TURMA_COLORS[r.turma] || ""}
                            >
                              Turma {r.turma}
                            </Badge>
                          </div>
                          <Badge variant="outline">
                            {r.totalPresentes} presente{r.totalPresentes !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Professores: {r.professores}
                        </p>
                        {r.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1">{r.observacoes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Forms */}
        <CriancaForm
          open={criancaFormOpen}
          onOpenChange={setCriancaFormOpen}
          onSubmit={handleCreateCrianca}
        />
        <RelatorioForm
          open={relatorioFormOpen}
          onOpenChange={setRelatorioFormOpen}
          onSubmit={handleCreateRelatorio}
        />
        {eduMinisterio && (
          <EscalaForm
            open={escalaFormOpen}
            onOpenChange={setEscalaFormOpen}
            onSubmit={handleCreateEscala}
            ministerioId={eduMinisterio._id}
          />
        )}
      </div>
    </ModuloGuard>
  );
}
