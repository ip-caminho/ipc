"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { TURMA_OPTIONS, TURMA_COLORS } from "@features/educacional/lib/constants";
import { Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils/cn";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function PresencaPage() {
  const [turma, setTurma] = useState<string | null>(null);
  const [data, setData] = useState(getToday());
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  const [professores, setProfessores] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const criancas = useQuery(
    api.educacional.queries.listCriancas,
    turma ? { turma } : "skip"
  );
  const createRelatorio = useMutation(api.educacional.mutations.createRelatorio);

  const sortedCriancas = useMemo(() => {
    if (!criancas) return [];
    return [...criancas].sort((a: any, b: any) =>
      (a.nome || "").localeCompare(b.nome || "", "pt-BR")
    );
  }, [criancas]);

  const togglePresente = (entidadeId: string) => {
    setPresentes((prev) => {
      const next = new Set(prev);
      if (next.has(entidadeId)) {
        next.delete(entidadeId);
      } else {
        next.add(entidadeId);
      }
      return next;
    });
  };

  const marcarTodos = () => {
    setPresentes(new Set(sortedCriancas.map((c: any) => c.entidadeId)));
  };

  const desmarcarTodos = () => {
    setPresentes(new Set());
  };

  const handleSalvar = async () => {
    if (!turma || presentes.size === 0) return;
    setSaving(true);
    try {
      await createRelatorio({
        turma,
        data,
        professores: professores.trim() || "Nao informado",
        presentes: Array.from(presentes) as Id<"entidades">[],
      });
      toast.success(`Presenca registrada — ${presentes.size} crianca(s)`);
      setSaved(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Tela de sucesso
  if (saved) {
    return (
      <PermissionGate permission="educacional:write">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold">Presenca registrada</h2>
          <p className="text-sm text-muted-foreground">{presentes.size} crianca(s) presentes</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setTurma(null);
              setPresentes(new Set());
              setProfessores("");
              setSaved(false);
            }}>
              Outra turma
            </Button>
            <Button asChild>
              <Link href="/educacional">Voltar</Link>
            </Button>
          </div>
        </div>
      </PermissionGate>
    );
  }

  // Selecionar turma
  if (!turma) {
    return (
      <PermissionGate permission="educacional:write">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/educacional"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-xl font-bold">Lista de Presenca</h1>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Selecione a turma</p>
          </div>

          <div className="grid gap-2">
            {TURMA_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTurma(t.value)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border text-left transition-colors hover:bg-accent/50",
                  TURMA_COLORS[t.value]?.replace("bg-", "border-") || "border-border"
                )}
              >
                <Badge className={TURMA_COLORS[t.value]}>{t.value}</Badge>
                <span className="text-base font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </PermissionGate>
    );
  }

  // Lista de presença
  const turmaLabel = TURMA_OPTIONS.find((t) => t.value === turma)?.label || turma;

  return (
    <PermissionGate permission="educacional:write">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setTurma(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Presenca — {turmaLabel}</h1>
            <p className="text-xs text-muted-foreground">{presentes.size} presente(s)</p>
          </div>
        </div>

        {/* Data */}
        <Input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="text-base"
        />

        {/* Ações rápidas */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={marcarTodos}>
            Marcar todos
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={desmarcarTodos}>
            Desmarcar todos
          </Button>
        </div>

        {/* Lista de crianças */}
        {criancas === undefined ? (
          <Skeleton className="h-48" />
        ) : sortedCriancas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma crianca nesta turma</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {sortedCriancas.map((c: any) => {
              const isPresente = presentes.has(c.entidadeId);
              return (
                <button
                  key={c.entidadeId}
                  type="button"
                  onClick={() => togglePresente(c.entidadeId)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
                    isPresente
                      ? "bg-green-50 dark:bg-green-950/30 border-2 border-green-400 dark:border-green-700"
                      : "bg-muted/50 border-2 border-transparent"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      {c.foto && <AvatarImage src={c.foto} alt={c.nome} />}
                      <AvatarFallback className="text-2xl">{c.nome?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isPresente && (
                      <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-background">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium text-center leading-tight line-clamp-2",
                    isPresente ? "text-green-800 dark:text-green-200" : ""
                  )}>
                    {c.nome}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Professores + Salvar */}
        {presentes.size > 0 && (
          <div className="space-y-3 pb-24 md:pb-4">
            <Input
              value={professores}
              onChange={(e) => setProfessores(e.target.value)}
              placeholder="Professores (ex: Ana, Bruno)"
              className="text-base"
            />
            <Button
              className="w-full"
              disabled={saving || presentes.size === 0}
              onClick={handleSalvar}
            >
              {saving ? "Salvando..." : `Registrar presenca (${presentes.size})`}
            </Button>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
