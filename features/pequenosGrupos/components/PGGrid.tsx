"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { GripVertical, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils/cn";
import { PGCard } from "./PGCard";

interface SemGrupoItem {
  membroId: string;
  nome: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PG = any;

// Busca sem acento/caixa: casa "Joao" com "João".
function normalizeBusca(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// --- Nome arrastavel (membro sem grupo) ---

function DraggableNome({ membro }: { membro: SemGrupoItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: membro.membroId, data: { membro } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-sm select-none touch-none cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Avatar className="h-5 w-5">
        <AvatarFallback className="text-[10px]">
          {membro.nome?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span>{membro.nome}</span>
    </div>
  );
}

// Chip estatico (sem permissao de arrastar / no overlay).
function NomeChip({ membro, dragging }: { membro: SemGrupoItem; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-sm",
        dragging && "shadow-lg",
      )}
    >
      {dragging && <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <Avatar className="h-5 w-5">
        <AvatarFallback className="text-[10px]">
          {membro.nome?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span>{membro.nome}</span>
    </div>
  );
}

// --- Card como alvo de drop ---

function DroppablePGCard({
  pg,
  onOpen,
}: {
  pg: PG;
  onOpen: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: pg._id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl transition-shadow",
        isOver && "ring-2 ring-primary/60",
      )}
    >
      <PGCard pg={pg} onClick={onOpen} />
    </div>
  );
}

interface PGGridProps {
  pgs: PG[];
  disponiveis: SemGrupoItem[];
  onOpen: (id: Id<"pequenosGrupos">) => void;
  canManage: boolean;
}

export function PGGrid({ pgs, disponiveis, onOpen, canManage }: PGGridProps) {
  // @ts-ignore Convex TS2589
  const moveMembro = useMutation(api.pequenosGrupos.mutations.moveMembro);
  const [busca, setBusca] = useState("");
  const [activeMembro, setActiveMembro] = useState<SemGrupoItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const nomesFiltrados = useMemo(() => {
    const termo = normalizeBusca(busca);
    return disponiveis
      .filter((m) => !termo || normalizeBusca(m.nome).includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [disponiveis, busca]);

  function handleDragStart(event: DragStartEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { membro } = event.active.data.current as any;
    setActiveMembro(membro);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveMembro(null);
    const { over, active } = event;
    if (!over) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { membro } = active.data.current as any;
    const toPgId = over.id as Id<"pequenosGrupos">;
    try {
      await moveMembro({
        membroId: membro.membroId as Id<"membros">,
        fromPgId: undefined,
        toPgId,
      });
      toast.success(`${membro.nome} adicionado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar");
    }
  }

  const grid = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pgs.map((pg) =>
        canManage ? (
          <DroppablePGCard key={pg._id} pg={pg} onOpen={() => onOpen(pg._id)} />
        ) : (
          <PGCard key={pg._id} pg={pg} onClick={() => onOpen(pg._id)} />
        ),
      )}
    </div>
  );

  const disponiveisCard = disponiveis.length > 0 && (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Comungantes
          <Badge variant="secondary">{disponiveis.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Buscar membro pelo nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {canManage && (
          <p className="text-xs text-muted-foreground">
            Arraste um nome para cima de um grupo para adicionar.
          </p>
        )}
        {nomesFiltrados.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nenhum membro encontrado
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nomesFiltrados.map((m) =>
              canManage ? (
                <DraggableNome key={m.membroId} membro={m} />
              ) : (
                <NomeChip key={m.membroId} membro={m} />
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!canManage) {
    return (
      <>
        {grid}
        {disponiveisCard}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {grid}
      {disponiveisCard}
      <DragOverlay>
        {activeMembro ? <NomeChip membro={activeMembro} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
