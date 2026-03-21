"use client";

import { useQuery, useMutation } from "convex/react";
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
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";

// --- Types ---

interface MembroItem {
  _id?: string; // pgMembros _id (only for members already in a PG)
  membroId: string;
  nome: string;
}

// --- Draggable member chip ---

function DraggableMembro({
  membro,
  containerId,
}: {
  membro: MembroItem;
  containerId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${containerId}::${membro.membroId}`,
      data: { membro, fromContainerId: containerId },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm select-none touch-none"
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-[10px]">
          {membro.nome?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{membro.nome || "—"}</span>
    </div>
  );
}

// --- Overlay (shown while dragging) ---

function MemberOverlay({ membro }: { membro: MembroItem }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm shadow-lg">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-[10px]">
          {membro.nome?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{membro.nome || "—"}</span>
    </div>
  );
}

// --- Droppable column ---

function DroppableColumn({
  id,
  title,
  membros,
  count,
}: {
  id: string;
  title: string;
  membros: MembroItem[];
  count?: number;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <Card
      ref={setNodeRef}
      className={`min-w-[220px] flex flex-col transition-colors ${
        isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
      }`}
    >
      <CardHeader className="pb-2 space-y-0">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="truncate">{title}</span>
          <Badge variant="secondary" className="ml-2 shrink-0">
            {count ?? membros.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-1.5 min-h-[60px]">
        {membros.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Arraste membros para ca
          </p>
        ) : (
          membros.map((m) => (
            <DraggableMembro key={m.membroId} membro={m} containerId={id} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// --- Main component ---

export function PGRemanejamento() {
  // @ts-ignore Convex TS2589
  const data = useQuery(api.pequenosGrupos.queries.listAllWithMembros, {});
  const moveMembro = useMutation(api.pequenosGrupos.mutations.moveMembro);

  const [activeMembro, setActiveMembro] = useState<MembroItem | null>(null);
  const [activeFromContainer, setActiveFromContainer] = useState<string | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  if (data === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Sem dados</p>;
  }

  const SEM_GRUPO_ID = "__sem_grupo__";

  function handleDragStart(event: DragStartEvent) {
    const { membro, fromContainerId } = event.active.data.current as any;
    setActiveMembro(membro);
    setActiveFromContainer(fromContainerId);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveMembro(null);
    setActiveFromContainer(null);

    const { over, active } = event;
    if (!over) return;

    const { membro, fromContainerId } = active.data.current as any;

    // Determine target container
    // over.id can be a column id or another draggable id ("containerId::membroId")
    let toContainerId = over.id as string;
    if (toContainerId.includes("::")) {
      // Dropped on a member → use that member's container
      toContainerId = toContainerId.split("::")[0];
    }

    if (fromContainerId === toContainerId) return;

    const fromPgId =
      fromContainerId === SEM_GRUPO_ID
        ? undefined
        : (fromContainerId as Id<"pequenosGrupos">);
    const toPgId =
      toContainerId === SEM_GRUPO_ID
        ? undefined
        : (toContainerId as Id<"pequenosGrupos">);

    try {
      await moveMembro({
        membroId: membro.membroId as Id<"membros">,
        fromPgId,
        toPgId,
      });
      toast.success(`${membro.nome} movido`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao mover");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Coluna: Sem grupo */}
        <div className="shrink-0 w-[260px]">
          <DroppableColumn
            id={SEM_GRUPO_ID}
            title="Sem grupo"
            membros={data.semGrupo}
          />
        </div>

        {/* Colunas dos PGs */}
        {data.pgs.map((pg) => (
          <div key={pg._id} className="shrink-0 w-[260px]">
            <DroppableColumn
              id={pg._id}
              title={pg.nome}
              membros={pg.membros}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeMembro ? <MemberOverlay membro={activeMembro} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
