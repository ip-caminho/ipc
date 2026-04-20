"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@shared/lib/utils/cn";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Lock, Users, Shield, Globe } from "lucide-react";

type Scope = "private" | "pg" | "leaders" | "church";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: Id<"pedidosOracao">) => void;
}

const SCOPE_OPTIONS: Array<{
  value: Scope;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "private", label: "Somente eu", icon: Lock },
  { value: "pg", label: "Meu PG", icon: Users },
  { value: "leaders", label: "Líderes e pastores", icon: Shield },
  { value: "church", label: "Toda a igreja", icon: Globe },
];

const MIN_CHARS = 10;
const WARN_CHARS = 280;
const MAX_CHARS = 500;

export function NewRequestModal({ open, onOpenChange, onCreated }: Props) {
  const { membroId } = useAuth();
  const [texto, setTexto] = useState("");
  const [scope, setScope] = useState<Scope>("church");
  const [pgId, setPgId] = useState<Id<"pequenosGrupos"> | null>(null);
  const [anonimo, setAnonimo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const createMut = useMutation(api.pedidosOracao.mutations.createPrayerRequest);
  // @ts-ignore Convex TS2589
  const meusPgs = useQuery(
    api.pequenosGrupos.queries.listByMembro,
    membroId ? { membroId: membroId as Id<"membros"> } : "skip",
  );

  const trimmedLen = texto.trim().length;
  const canSubmit =
    trimmedLen >= MIN_CHARS && !submitting && (scope !== "pg" || !!pgId);

  const reset = () => {
    setTexto("");
    setScope("church");
    setPgId(null);
    setAnonimo(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const id = await createMut({
        texto: texto.trim(),
        scope,
        pgId: scope === "pg" ? pgId ?? undefined : undefined,
        anonimo: scope !== "private" && anonimo,
      });
      toast.success("Pedido compartilhado");
      onCreated?.(id);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="min-h-[70dvh] md:min-h-0">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Novo pedido de oração</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Compartilhe seu pedido de oração..."
              className="w-full text-base md:text-sm rounded-md border bg-background px-3 py-2.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={5}
              style={{ minHeight: "120px" }}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>
                {trimmedLen < MIN_CHARS
                  ? `Mínimo ${MIN_CHARS} caracteres`
                  : ""}
              </span>
              {trimmedLen > WARN_CHARS && (
                <span>
                  {trimmedLen}/{MAX_CHARS}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              Quem pode ver este pedido?
            </Label>
            <div className="flex flex-col gap-1.5">
              {SCOPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScope(opt.value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm text-left min-h-11 transition-colors",
                      active
                        ? "border-foreground bg-secondary font-medium"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {scope === "pg" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Qual PG?</Label>
              {meusPgs === undefined ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : meusPgs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Você não está em nenhum PG. Escolha outro escopo.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {meusPgs.map((pg) => {
                    const active = pgId === pg._id;
                    return (
                      <button
                        key={pg._id}
                        type="button"
                        onClick={() => setPgId(pg._id as Id<"pequenosGrupos">)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left min-h-11 transition-colors",
                          active
                            ? "border-foreground bg-secondary font-medium"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {pg.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {scope !== "private" && (
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  Compartilhar anonimamente
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Outros verão o pedido mas não saberão que foi você.
                </p>
              </div>
              <Switch checked={anonimo} onCheckedChange={setAnonimo} />
            </div>
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {submitting ? "Enviando..." : "Enviar pedido"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
