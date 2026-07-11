"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { useProfessorTurmas } from "@features/educacional/hooks/useProfessorTurmas";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import {
  Plus,
  Users,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  Baby,
  Cake,
  Heart,
  LayoutDashboard,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { CriancaCard } from "@features/educacional/components/CriancaCard";
import { CriancaForm } from "@features/educacional/components/CriancaForm";
import { CriancaDetalhe } from "@features/educacional/components/CriancaDetalhe";
import { RelatorioForm } from "@features/educacional/components/RelatorioForm";
import { RelatorioDetalhe } from "@features/educacional/components/RelatorioDetalhe";
import { EscalaGrade } from "@features/educacional/components/EscalaGrade";
import { EscalaDiaForm } from "@features/educacional/components/EscalaDiaForm";
import { EscalaMesGenerator } from "@features/educacional/components/EscalaMesGenerator";
import { MinhaEscala } from "@features/educacional/components/MinhaEscala";
import { EducacionalResumo } from "@features/educacional/components/EducacionalResumo";
import { TurmaFilterChips } from "@features/educacional/components/TurmaFilterChips";
import { ProximosAniversarios } from "@features/educacional/components/ProximosAniversarios";
import { OvelhinhasManager } from "@features/educacional/components/OvelhinhasManager";
import { VoluntariosTab } from "@features/educacional/components/VoluntariosTab";
import { AgendaTab } from "@features/educacional/components/AgendaTab";
import { EduEmptyState } from "@features/educacional/components/EduEmptyState";

import type { CriancaFormValues } from "@features/educacional/lib/validations";
import type { RelatorioFormValues } from "@features/educacional/lib/validations";
import { agruparEscalas, particionarDias, type DiaEscala } from "@features/educacional/lib/escala";
import { shareRelatorioWhatsApp } from "@features/educacional/lib/relatorioWhatsApp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { TURMA_OPTIONS, TURMA_COLORS } from "@features/educacional/lib/constants";

export default function EducacionalPage() {
  const { can } = useAuth();
  const router = useRouter();
  const canRead = can("criancas:read");
  const canManage = can("criancas:manage");
  const canReadEdu = can("educacional:read");
  const canWriteEdu = can("educacional:write");
  const canReadVol = can("voluntarios_edu:read");
  const isCoordenador = canManage || canWriteEdu;
  const convex = useConvex();

  // Atalho do card: busca o relatório completo sob demanda (a lista é enxuta)
  // e dispara o compartilhamento no WhatsApp.
  const handleShareRelatorio = async (
    e: React.MouseEvent,
    id: Id<"eduRelatorios">
  ) => {
    e.stopPropagation();
    try {
      const rel = await convex.query(api.educacional.queries.getRelatorio, {
        id,
      });
      if (!rel) {
        toast.error("Relatorio nao encontrado");
        return;
      }
      await shareRelatorioWhatsApp(rel);
    } catch {
      toast.error("Erro ao preparar a mensagem");
    }
  };

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
  const [activeTab, setActiveTab] = useState("resumo");
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [selectedEntidadeId, setSelectedEntidadeId] = useState<Id<"entidades"> | null>(null);
  const [criancaFormOpen, setCriancaFormOpen] = useState(false);
  const [editingCrianca, setEditingCrianca] = useState<any>(null);
  const [relatorioFormOpen, setRelatorioFormOpen] = useState(false);
  const [editingRelatorio, setEditingRelatorio] = useState<Partial<RelatorioFormValues> | null>(null);
  const [removeRelatorioTarget, setRemoveRelatorioTarget] = useState<Id<"eduRelatorios"> | null>(null);
  const [escalaDiaFormOpen, setEscalaDiaFormOpen] = useState(false);
  const [editingDia, setEditingDia] = useState<DiaEscala | null>(null);
  const [mesGeneratorOpen, setMesGeneratorOpen] = useState(false);
  const [removeDiaTarget, setRemoveDiaTarget] = useState<string | null>(null);
  const [ovelhinhasManagerOpen, setOvelhinhasManagerOpen] = useState(false);
  const [selectedRelatorioId, setSelectedRelatorioId] = useState<Id<"eduRelatorios"> | null>(null);

  // Queries — busca todas as crianças; filtro/contagem no client (chips e grid
  // sempre consistentes).
  const criancas = useQuery(
    api.educacional.queries.listCriancas,
    canRead ? {} : "skip"
  );
  const aniversarios = useQuery(
    api.educacional.queries.proximosAniversarios,
    canRead ? {} : "skip"
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
  const voluntariosEscala = useQuery(
    api.educacional.queries.voluntariosParaEscala,
    canReadEdu ? {} : "skip"
  );
  const minhaEscalaItens = useQuery(
    api.educacional.queries.minhaEscala,
    canReadEdu && eduMinisterio ? { ministerioId: eduMinisterio._id } : "skip"
  );

  // Escalas agrupadas por domingo, separadas em próximos × anteriores.
  const dias = useMemo(
    () => agruparEscalas((escalas ?? []) as any),
    [escalas]
  );
  const hoje = new Date().toISOString().slice(0, 10);
  const { proximos, passados } = useMemo(
    () => particionarDias(dias, hoje),
    [dias, hoje]
  );

  // Crianças: filtro e contagem por turma no client (consistência chips ↔ grid).
  const criancasFiltradas = useMemo(
    () =>
      turmaFilter === "all"
        ? criancas
        : criancas?.filter((c: any) => c.turma === turmaFilter),
    [criancas, turmaFilter]
  );
  const countPorTurma = useMemo(() => {
    const m: Record<string, number> = {};
    criancas?.forEach((c: any) => {
      m[c.turma] = (m[c.turma] ?? 0) + 1;
    });
    return m;
  }, [criancas]);

  // Métricas do Resumo (tudo derivado das queries já buscadas).
  const proximoDomingo = proximos[0] ?? null;
  const lacunasProximo = proximoDomingo
    ? proximoDomingo.turmas.filter((t) => t.semProfessor).length
    : null;
  const aniversariantesSemana = useMemo(
    () => (aniversarios ?? []).filter((a: any) => a.diasAteAniversario <= 7).length,
    [aniversarios]
  );
  const limite30 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const cacAtencao = useMemo(
    () =>
      (voluntariosEscala ?? []).filter(
        (v: any) => v.cacValidade && v.cacValidade <= limite30
      ).length,
    [voluntariosEscala, limite30]
  );

  // Crianças agrupadas por turma (aba Turmas, visão "Todas").
  const criancasPorTurma = useMemo(() => {
    const grupos = new Map<string, any[]>();
    (criancasFiltradas ?? []).forEach((c: any) => {
      const arr = grupos.get(c.turma) ?? [];
      arr.push(c);
      grupos.set(c.turma, arr);
    });
    return TURMA_OPTIONS.map((t) => ({
      turma: t.value,
      label: t.label,
      criancas: grupos.get(t.value) ?? [],
    })).filter((g) => g.criancas.length > 0);
  }, [criancasFiltradas]);

  // Mutations
  const createCrianca = useMutation(api.educacional.mutations.createCrianca);
  const updateCrianca = useMutation(api.educacional.mutations.updateCrianca);
  const removeCrianca = useMutation(api.educacional.mutations.removeCrianca);
  const createRelatorio = useMutation(api.educacional.mutations.createRelatorio);
  const removeRelatorio = useMutation(api.educacional.mutations.removeRelatorio);
  const removeEscalaDia = useMutation(api.educacional.mutations.removeEscalaDia);

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
        ovelhinhaId: (data.ovelhinhaId as Id<"membros">) || undefined,
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
        ovelhinhaId: data.ovelhinhaId ? (data.ovelhinhaId as Id<"membros">) : null,
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
      const toLines = (s?: string) =>
        s
          ? s.split("\n").map((l) => l.trim()).filter(Boolean)
          : undefined;
      const numeroParsed = data.numero ? parseInt(data.numero, 10) : NaN;
      await createRelatorio({
        turma: data.turma,
        data: data.data,
        voluntarios: data.voluntarios.map((v) => ({
          membroId: v.membroId as Id<"membros">,
          papel: v.papel,
        })),
        observacoes: data.observacoes || undefined,
        numero: Number.isNaN(numeroParsed) ? undefined : numeroParsed,
        tema: data.tema || undefined,
        textosBase: toLines(data.textosBaseText),
        passagemMemorizar: data.passagemMemorizar || undefined,
        historia: data.historia || undefined,
        aplicacao: data.aplicacao || undefined,
        licaoDeCasa: data.licaoDeCasa || undefined,
        visitantes: toLines(data.visitantesText),
      });
      toast.success(editingRelatorio ? "Relatorio atualizado" : "Relatorio criado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    }
  };

  // Abre o formulário pré-preenchido para editar. Turma+data ficam travadas.
  const handleEditRelatorio = (rel: any) => {
    setEditingRelatorio({
      turma: rel.turma,
      data: rel.data,
      numero: rel.numero != null ? String(rel.numero) : "",
      tema: rel.tema ?? "",
      textosBaseText: (rel.textosBase ?? []).join("\n"),
      passagemMemorizar: rel.passagemMemorizar ?? "",
      historia: rel.historia ?? "",
      aplicacao: rel.aplicacao ?? "",
      licaoDeCasa: rel.licaoDeCasa ?? "",
      visitantesText: (rel.visitantes ?? []).join("\n"),
      observacoes: rel.observacoes ?? "",
      voluntarios: (rel.voluntarios ?? []).map((v: any) => ({
        membroId: String(v.membroId),
        papel: v.papel,
      })),
    });
    setSelectedRelatorioId(null);
    setRelatorioFormOpen(true);
  };

  const handleNovoRelatorio = () => {
    setEditingRelatorio(null);
    setRelatorioFormOpen(true);
  };

  const handleRemoveRelatorio = async () => {
    if (!removeRelatorioTarget) return;
    try {
      await removeRelatorio({ id: removeRelatorioTarget });
      toast.success("Relatorio excluido");
      setSelectedRelatorioId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    } finally {
      setRemoveRelatorioTarget(null);
    }
  };

  const handleNovaEscala = () => {
    setEditingDia(null);
    setEscalaDiaFormOpen(true);
  };

  const handleEditDia = (dia: DiaEscala) => {
    setEditingDia(dia);
    setEscalaDiaFormOpen(true);
  };

  const handleRemoveDia = async () => {
    if (!removeDiaTarget || !eduMinisterio) return;
    try {
      await removeEscalaDia({
        ministerioId: eduMinisterio._id as Id<"ministerios">,
        data: removeDiaTarget,
      });
      toast.success("Escala do dia excluída");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    } finally {
      setRemoveDiaTarget(null);
    }
  };

  // --- Professor com 2+ turmas: seletor ---
  if (!isCoordenador && !loadingTurmas && minhasTurmas.length > 1) {
    return (
      <ModuloGuard modulo="educacional">
        <HeaderLayout>
        <div className="max-w-xl mx-auto space-y-6">
          <PageHeader
            title="Educacional"
            subtitle="Selecione sua turma para marcar presença"
          />
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
        </HeaderLayout>
      </ModuloGuard>
    );
  }

  // --- Sem turma atribuida e sem permissao de coordenador ---
  if (!isCoordenador && !loadingTurmas && minhasTurmas.length === 0) {
    return (
      <ModuloGuard modulo="educacional">
        <HeaderLayout>
        <div className="max-w-md mx-auto text-center pt-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
            <Baby className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-medium">Educacional Infantil</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Você não está escalado como professor em nenhuma turma.
          </p>
        </div>
        </HeaderLayout>
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
              ovelhinhaId: editingCrianca.ovelhinhaId,
            }}
            isEditing
          />
        )}
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="educacional">
      <HeaderLayout>
      <div className="space-y-4">
        <PageHeader
          title="Educacional Infantil"
          subtitle="Turmas, voluntarios, licoes e agenda do departamento"
        />
        <div className="flex items-center justify-end">
          {canWriteEdu && (
            <Button asChild>
              <Link href="/educacional/presenca">
                <ClipboardList className="h-4 w-4 mr-1" />
                Presenca
              </Link>
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Scroll horizontal no mobile: as tabs nao cabem em 390px */}
          <div className="overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max">
            <TabsTrigger value="resumo" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="turmas" className="gap-1.5">
              <Users className="h-4 w-4" />
              Turmas
            </TabsTrigger>
            <TabsTrigger value="aniversarios" className="gap-1.5">
              <Cake className="h-4 w-4" />
              Aniversarios
            </TabsTrigger>
            {canReadVol && (
              <TabsTrigger value="voluntarios" className="gap-1.5">
                <Heart className="h-4 w-4" />
                Voluntarios
              </TabsTrigger>
            )}
            {canReadEdu && (
              <TabsTrigger value="agenda" className="gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Agenda
              </TabsTrigger>
            )}
            {canReadEdu && (
              <TabsTrigger value="escala" className="gap-1.5">
                <CalendarCheck className="h-4 w-4" />
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
          </div>

          {/* Tab: Resumo */}
          <TabsContent value="resumo" className="space-y-4">
            <EducacionalResumo
              totalCriancas={criancas?.length ?? 0}
              countPorTurma={countPorTurma}
              proximoDomingoData={proximoDomingo?.data ?? null}
              lacunasProximo={lacunasProximo}
              aniversariantesSemana={aniversariantesSemana}
              totalVoluntarios={voluntariosEscala?.length ?? 0}
              cacAtencao={cacAtencao}
              showVoluntarios={canReadVol}
              onVerCriancas={() => setActiveTab("turmas")}
              onVerEscala={() => setActiveTab("escala")}
              onVerAniversarios={() => setActiveTab("aniversarios")}
              onVerVoluntarios={() => setActiveTab("voluntarios")}
            />
            {minhaEscalaItens && minhaEscalaItens.length > 0 && (
              <MinhaEscala itens={minhaEscalaItens as any} />
            )}
          </TabsContent>

          {/* Tab: Turmas */}
          <TabsContent value="turmas" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TurmaFilterChips
                value={turmaFilter}
                onChange={setTurmaFilter}
                counts={countPorTurma}
                total={criancas?.length ?? 0}
              />
              <PermissionGate permission="criancas:manage">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOvelhinhasManagerOpen(true)}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Ovelhinhas
                  </Button>
                  <Button onClick={() => setCriancaFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Crianca
                  </Button>
                </div>
              </PermissionGate>
            </div>

            {criancas === undefined ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (criancasFiltradas?.length ?? 0) === 0 ? (
              <EduEmptyState
                icon={Baby}
                title="Nenhuma crianca"
                description={
                  turmaFilter === "all"
                    ? "Cadastre as criancas do departamento infantil."
                    : "Nenhuma crianca nesta turma."
                }
                action={
                  canManage && turmaFilter === "all" ? (
                    <Button onClick={() => setCriancaFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Crianca
                    </Button>
                  ) : undefined
                }
              />
            ) : turmaFilter === "all" ? (
              <div className="space-y-6">
                {criancasPorTurma.map((grupo) => (
                  <div key={grupo.turma} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={TURMA_COLORS[grupo.turma] || ""}
                      >
                        {grupo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {grupo.criancas.length} crianca
                        {grupo.criancas.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {grupo.criancas.map((c: any) => (
                        <CriancaCard
                          key={c._id}
                          crianca={c}
                          onClick={() => setSelectedEntidadeId(c.entidadeId)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {criancasFiltradas!.length} crianca
                  {criancasFiltradas!.length !== 1 ? "s" : ""}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {criancasFiltradas!.map((c: any) => (
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

          {/* Tab: Aniversarios */}
          <TabsContent value="aniversarios" className="space-y-4">
            <ProximosAniversarios />
          </TabsContent>

          {/* Tab: Voluntarios */}
          {canReadVol && (
            <TabsContent value="voluntarios" className="space-y-4">
              <VoluntariosTab />
            </TabsContent>
          )}

          {/* Tab: Agenda */}
          {canReadEdu && (
            <TabsContent value="agenda" className="space-y-4">
              <AgendaTab ministerioId={eduMinisterio?._id} />
            </TabsContent>
          )}

          {/* Tab: Escala */}
          {canReadEdu && (
            <TabsContent value="escala" className="space-y-4">
              <div className="flex flex-wrap justify-end gap-2">
                <PermissionGate permission="educacional:write">
                  <Button
                    variant="outline"
                    onClick={() => setMesGeneratorOpen(true)}
                    disabled={!eduMinisterio}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Gerar mês
                  </Button>
                  <Button onClick={handleNovaEscala} disabled={!eduMinisterio}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova escala
                  </Button>
                </PermissionGate>
              </div>

              {!eduMinisterio && (
                <p className="text-sm text-muted-foreground">
                  Ministerio &quot;Educacional&quot; nao encontrado. Crie-o em Ministerios.
                </p>
              )}

              {minhaEscalaItens && minhaEscalaItens.length > 0 && (
                <MinhaEscala itens={minhaEscalaItens as any} />
              )}

              {escalas === undefined ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : dias.length === 0 ? (
                <EduEmptyState
                  icon={CalendarDays}
                  title="Nenhuma escala"
                  description="Monte a escala de professores e auxiliares por data e turma, ou gere os domingos do mês."
                />
              ) : (
                <div className="space-y-6">
                  {proximos.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Próximos
                      </h3>
                      <EscalaGrade
                        dias={proximos}
                        canWrite={canWriteEdu}
                        onEditDia={handleEditDia}
                        onRemoveDia={setRemoveDiaTarget}
                      />
                    </div>
                  )}
                  {passados.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Anteriores
                      </h3>
                      <EscalaGrade
                        dias={passados}
                        canWrite={canWriteEdu}
                        onEditDia={handleEditDia}
                        onRemoveDia={setRemoveDiaTarget}
                      />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          )}

          {/* Tab: Relatorios */}
          {canReadEdu && (
            <TabsContent value="relatorios" className="space-y-4">
              <div className="flex justify-end">
                <PermissionGate permission="educacional:write">
                  <Button onClick={handleNovoRelatorio}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Relatorio
                  </Button>
                </PermissionGate>
              </div>

              {relatorios === undefined ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : relatorios.length === 0 ? (
                <EduEmptyState
                  icon={ClipboardList}
                  title="Nenhuma licao registrada"
                  description="Registre as licoes com tema, historia, aplicacao e presenca."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {relatorios.map((r: any) => (
                    <Card
                      key={r._id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedRelatorioId(r._id)}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {r.numero != null ? `Licao ${r.numero} · ` : ""}
                              {format(parseISO(r.data), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <Badge
                              variant="secondary"
                              className={TURMA_COLORS[r.turma] || ""}
                            >
                              Turma {r.turma}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline">
                              {r.totalPresentes} presente{r.totalPresentes !== 1 ? "s" : ""}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-green-600"
                              onClick={(e) => handleShareRelatorio(e, r._id)}
                              aria-label="Compartilhar no WhatsApp"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {r.tema && (
                          <p className="text-xs font-medium mt-1">{r.tema}</p>
                        )}
                        {r.equipeLabel && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Equipe: {r.equipeLabel}
                          </p>
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
          onOpenChange={(open) => {
            setRelatorioFormOpen(open);
            if (!open) setEditingRelatorio(null);
          }}
          onSubmit={handleCreateRelatorio}
          defaultValues={editingRelatorio ?? undefined}
          isEditing={!!editingRelatorio}
        />
        {eduMinisterio && (
          <>
            <EscalaDiaForm
              open={escalaDiaFormOpen}
              onOpenChange={setEscalaDiaFormOpen}
              ministerioId={eduMinisterio._id}
              voluntarios={(voluntariosEscala ?? []) as any}
              initialDia={editingDia}
            />
            <EscalaMesGenerator
              open={mesGeneratorOpen}
              onOpenChange={setMesGeneratorOpen}
              ministerioId={eduMinisterio._id}
            />
          </>
        )}
        <AlertDialog
          open={!!removeDiaTarget}
          onOpenChange={(open) => !open && setRemoveDiaTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir escala do dia?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeDiaTarget &&
                  `Todas as turmas de ${format(parseISO(removeDiaTarget), "dd/MM/yyyy", { locale: ptBR })} serão removidas. Esta ação não pode ser desfeita.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveDia}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <OvelhinhasManager
          open={ovelhinhasManagerOpen}
          onOpenChange={setOvelhinhasManagerOpen}
        />
        <RelatorioDetalhe
          id={selectedRelatorioId}
          onOpenChange={(open) => !open && setSelectedRelatorioId(null)}
          canWrite={canWriteEdu}
          onEdit={handleEditRelatorio}
          onDelete={setRemoveRelatorioTarget}
        />
        <AlertDialog
          open={!!removeRelatorioTarget}
          onOpenChange={(open) => !open && setRemoveRelatorioTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir relatorio?</AlertDialogTitle>
              <AlertDialogDescription>
                O relatorio e a presenca vinculada serao removidos. Esta acao nao
                pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveRelatorio}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
