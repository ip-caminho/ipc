"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { ArrowLeft, Check, X, Minus, Send } from "lucide-react";
import { TURMA_OPTIONS } from "@features/educacional/lib/constants";
import { toast } from "sonner";
import { format } from "date-fns";
import { useProfessorTurmas } from "@features/educacional/hooks/useProfessorTurmas";

type PresencaStatus = "presente" | "ausente" | "pendente";

export default function TurmaProfessorPage() {
  const params = useParams<{ id: string }>();
  const turmaId = decodeURIComponent(params.id);
  const router = useRouter();
  const { name, can } = useAuth();
  const { turmas: minhasTurmas, isLoading: loadingTurmas } = useProfessorTurmas();

  const canRead = can("criancas:read") || can("educacional:read");
  const canWrite = can("educacional:write");

  const criancas = useQuery(
    api.educacional.queries.listCriancas,
    canRead ? { turma: turmaId } : "skip"
  );

  const createRelatorio = useMutation(api.educacional.mutations.createRelatorio);

  const [presencas, setPresencas] = useState<Record<string, PresencaStatus>>({});
  const [submitting, setSubmitting] = useState(false);

  const turmaLabel = useMemo(
    () => TURMA_OPTIONS.find((t) => t.value === turmaId)?.label || `Turma ${turmaId}`,
    [turmaId]
  );

  // Se usuario nao eh professor desta turma E nao tem permissao de escrita → bloqueia
  const isProfessorDestaTurma = minhasTurmas.includes(turmaId);
  const temAcesso = isProfessorDestaTurma || canWrite;

  const togglePresenca = (entidadeId: string) => {
    setPresencas((prev) => {
      const atual = prev[entidadeId] ?? "pendente";
      const proximo: PresencaStatus =
        atual === "pendente" ? "presente" : atual === "presente" ? "ausente" : "pendente";
      return { ...prev, [entidadeId]: proximo };
    });
  };

  const totalCriancas = criancas?.length ?? 0;
  const marcadas = useMemo(
    () =>
      criancas?.filter(
        (c: any) =>
          presencas[c.entidadeId] === "presente" || presencas[c.entidadeId] === "ausente"
      ).length ?? 0,
    [criancas, presencas]
  );
  const todasMarcadas = totalCriancas > 0 && marcadas === totalCriancas;

  const handleEnviarRelatorio = async () => {
    if (!criancas || !todasMarcadas) return;
    setSubmitting(true);
    try {
      const presentes = criancas
        .filter((c: any) => presencas[c.entidadeId] === "presente")
        .map((c: any) => c.entidadeId as Id<"entidades">);
      await createRelatorio({
        turma: turmaId,
        data: format(new Date(), "yyyy-MM-dd"),
        professores: name || "",
        presentes,
      });
      toast.success("Relatório enviado");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar relatório");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTurmas || criancas === undefined) {
    return (
      <ModuloGuard modulo="educacional">
        <div className="max-w-xl mx-auto pt-12 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      </ModuloGuard>
    );
  }

  if (!temAcesso) {
    return (
      <ModuloGuard modulo="educacional">
        <div className="max-w-md mx-auto text-center pt-12">
          <h1 className="text-xl font-medium">Sem acesso</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Você não está escalado como professor desta turma.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.replace("/educacional")}
          >
            Voltar
          </Button>
        </div>
      </ModuloGuard>
    );
  }

  return (
    <ModuloGuard modulo="educacional">
      <div className="max-w-xl mx-auto w-full pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.replace("/educacional")}
            className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-medium leading-tight">{turmaLabel}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM")} · {marcadas}/{totalCriancas} marcadas
            </p>
          </div>
        </div>

        {/* Lista de criancas */}
        {criancas.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma criança cadastrada nesta turma.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {criancas.map((c: any) => {
              const status: PresencaStatus = presencas[c.entidadeId] ?? "pendente";
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => togglePresenca(c.entidadeId)}
                  className={`w-full flex items-center gap-4 rounded-xl border p-4 min-h-[72px] transition-colors ${
                    status === "presente"
                      ? "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800"
                      : status === "ausente"
                      ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800"
                      : "bg-card border-border hover:bg-muted/50"
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    {c.foto && <AvatarImage src={c.foto} alt={c.nome} />}
                    <AvatarFallback>
                      {c.nome?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-base font-medium truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {status}
                    </div>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      status === "presente"
                        ? "bg-green-600 text-white"
                        : status === "ausente"
                        ? "bg-red-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status === "presente" ? (
                      <Check className="h-5 w-5" />
                    ) : status === "ausente" ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Minus className="h-5 w-5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Botao enviar relatorio — fixo no bottom, aparece so quando todas marcadas */}
        {todasMarcadas && criancas.length > 0 && canWrite && (
          <div className="fixed bottom-[76px] md:bottom-6 inset-x-0 px-4 z-40 pointer-events-none">
            <div className="max-w-xl mx-auto pointer-events-auto">
              <Button
                size="lg"
                className="w-full shadow-lg"
                onClick={handleEnviarRelatorio}
                disabled={submitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Enviando..." : "Enviar relatório"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModuloGuard>
  );
}
