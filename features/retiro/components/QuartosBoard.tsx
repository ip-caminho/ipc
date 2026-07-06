"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { GripVertical, Plus, Trash2, Wand2, BedDouble, Pencil, X } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";

type OcupanteInfo = {
  inscricaoId: Id<"inscricoesRetiro">;
  participanteIndex: number;
  nome: string;
  responsavel: string;
};

function chave(o: { inscricaoId: string; participanteIndex: number }): string {
  return `${o.inscricaoId}:${o.participanteIndex}`;
}

function PessoaChip({ nome, hint, arrastavel = true }: { nome: string; hint?: string; arrastavel?: boolean }) {
  return (
    <div className="flex min-h-[44px] items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm">
      {arrastavel && <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0">
        <p className="truncate font-medium">{nome}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function Arrastavel({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      {children}
    </div>
  );
}

function QuartoCard({
  quarto,
  onRemoverQuarto,
  onRenomear,
  onDesalocar,
}: {
  quarto: {
    _id: Id<"quartosRetiro">;
    tipo: "DUPLO" | "TRIPLO";
    identificacao?: string;
    capacidade: number;
    ocupantes: OcupanteInfo[];
  };
  onRemoverQuarto: () => void;
  onRenomear: (nome: string) => void;
  onDesalocar: (o: OcupanteInfo) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: quarto._id });
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(quarto.identificacao ?? "");
  const lotado = quarto.ocupantes.length >= quarto.capacidade;

  return (
    <Card ref={setNodeRef} className={cn("transition-colors", isOver && "ring-2 ring-primary")}>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-1.5">
            <BedDouble className="h-4 w-4 shrink-0 text-muted-foreground" />
            {editando ? (
              <Input
                value={nome}
                autoFocus
                className="h-7"
                onChange={(e) => setNome(e.target.value)}
                onBlur={() => {
                  setEditando(false);
                  onRenomear(nome);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            ) : (
              <button
                type="button"
                className="flex min-w-0 items-center gap-1 hover:underline"
                onClick={() => setEditando(true)}
              >
                <span className="truncate">{quarto.identificacao || "Sem nome"}</span>
                <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Badge variant={lotado ? "secondary" : "outline"}>
              {quarto.tipo === "DUPLO" ? "Duplo" : "Triplo"} · {quarto.ocupantes.length}/
              {quarto.capacidade}
            </Badge>
            {quarto.ocupantes.length === 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                aria-label="Remover quarto"
                onClick={onRemoverQuarto}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 p-3 pt-1.5">
        {quarto.ocupantes.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            Arraste pessoas para cá
          </p>
        )}
        {quarto.ocupantes.map((o) => (
          <div key={chave(o)} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <Arrastavel id={chave(o)}>
                <PessoaChip nome={o.nome} hint={o.responsavel !== o.nome ? `insc. ${o.responsavel}` : undefined} />
              </Arrastavel>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              aria-label={`Tirar ${o.nome} do quarto`}
              onClick={() => onDesalocar(o)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function QuartosBoard({ retiroId }: { retiroId: Id<"retiros"> }) {
  // @ts-ignore Convex TS2589
  const dados = useQuery(api.retiro.quartos.listarQuartos, { retiroId });
  const gerar = useMutation(api.retiro.quartos.gerarQuartosDoPedido);
  const criar = useMutation(api.retiro.quartos.criarQuarto);
  const remover = useMutation(api.retiro.quartos.removerQuarto);
  const renomear = useMutation(api.retiro.quartos.renomearQuarto);
  const mover = useMutation(api.retiro.quartos.moverOcupante);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const [arrastando, setArrastando] = useState<string | null>(null);

  const { setNodeRef: semQuartoRef, isOver: sobreSemQuarto } = useDroppable({ id: "__sem_quarto__" });

  if (dados === undefined) return <Skeleton className="h-64 w-full" />;

  const todos = new Map<string, OcupanteInfo>();
  for (const qd of dados.quartos) for (const o of qd.ocupantes) todos.set(chave(o), o);
  for (const p of dados.semQuarto) todos.set(chave(p), p);

  async function acao(fn: () => Promise<unknown>, ok?: string) {
    try {
      const r = await fn();
      if (ok) toast.success(ok);
      return r;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  function onDragStart(e: DragStartEvent) {
    setArrastando(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setArrastando(null);
    const alvo = e.over?.id;
    if (!alvo) return;
    const [inscricaoId, idxStr] = String(e.active.id).split(":");
    const quartoId = alvo === "__sem_quarto__" ? null : (String(alvo) as Id<"quartosRetiro">);
    await acao(() =>
      mover({
        retiroId,
        inscricaoId: inscricaoId as Id<"inscricoesRetiro">,
        participanteIndex: Number(idxStr),
        quartoId,
      }),
    );
  }

  const pessoaArrastada = arrastando ? todos.get(arrastando) : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={async () => {
              const r = (await acao(() => gerar({ retiroId }))) as { criados: number } | undefined;
              if (r) {
                toast.success(
                  r.criados > 0
                    ? `${r.criados} quarto(s) gerado(s) a partir dos pedidos`
                    : "Nada a gerar — inscrições já alocadas",
                );
              }
            }}
          >
            <Wand2 className="mr-1 h-4 w-4" /> Gerar dos pedidos
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 md:h-9">
                <Plus className="mr-1 h-4 w-4" /> Novo quarto
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => acao(() => criar({ retiroId, tipo: "DUPLO" }), "Quarto duplo criado")}
              >
                Duplo (2)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => acao(() => criar({ retiroId, tipo: "TRIPLO" }), "Quarto triplo criado")}
              >
                Triplo (3)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Sem quarto (tambem e alvo de drop p/ desalocar) */}
          <div
            ref={semQuartoRef}
            className={cn(
              "h-fit rounded-lg border bg-muted/30 p-3 transition-colors",
              sobreSemQuarto && "ring-2 ring-primary",
            )}
          >
            <p className="mb-2 text-sm font-semibold">
              Sem quarto <Badge variant="secondary">{dados.semQuarto.length}</Badge>
            </p>
            {dados.semQuarto.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todo mundo alocado 🎉</p>
            ) : (
              <div className="space-y-1.5">
                {dados.semQuarto.map((p) => (
                  <Arrastavel key={chave(p)} id={chave(p)}>
                    <PessoaChip
                      nome={p.nome}
                      hint={[p.pediu, p.colegaDeQuarto ? `quer: ${p.colegaDeQuarto}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </Arrastavel>
                ))}
              </div>
            )}
          </div>

          {/* Quartos */}
          {dados.quartos.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum quarto ainda. Use “Gerar dos pedidos” para criar a partir das inscrições.
            </div>
          ) : (
            <div className="grid h-fit gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dados.quartos.map((qd) => (
                <QuartoCard
                  key={qd._id}
                  quarto={qd}
                  onRemoverQuarto={() => acao(() => remover({ quartoId: qd._id }), "Quarto removido")}
                  onRenomear={(nome) => acao(() => renomear({ quartoId: qd._id, identificacao: nome }))}
                  onDesalocar={(o) =>
                    acao(
                      () =>
                        mover({
                          retiroId,
                          inscricaoId: o.inscricaoId,
                          participanteIndex: o.participanteIndex,
                          quartoId: null,
                        }),
                      "Pessoa desalocada",
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {pessoaArrastada && <PessoaChip nome={pessoaArrastada.nome} arrastavel={false} />}
      </DragOverlay>
    </DndContext>
  );
}
