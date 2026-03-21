"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Plus, Church } from "lucide-react";
import { toast } from "sonner";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";

import { PedidoOracaoListCard } from "@features/pedidosOracao/components/PedidoOracaoListCard";
import { PedidoOracaoDetalhe } from "@features/pedidosOracao/components/PedidoOracaoDetalhe";

function PedidosList({
  pedidos,
  onSelect,
  emptyMsg,
  onCreateClick,
}: {
  pedidos: any[] | undefined;
  onSelect: (id: Id<"pedidosOracao">) => void;
  emptyMsg: string;
  onCreateClick?: () => void;
}) {
  if (pedidos === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (pedidos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMsg}</p>
        {onCreateClick && (
          <Button
            variant="outline"
            className="mt-3"
            onClick={onCreateClick}
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar pedido
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pedidos.map((p: any) => (
        <PedidoOracaoListCard
          key={p._id}
          pedido={p}
          onClick={() => onSelect(p._id)}
        />
      ))}
    </div>
  );
}

export default function PedidosOracaoPage() {
  // @ts-ignore Convex TS2589
  const meusPedidos = useQuery(api.pedidosOracao.queries.listPublicos, {
    filtro: "MEUS",
  });
  // @ts-ignore Convex TS2589
  const pedidosPG = useQuery(api.pedidosOracao.queries.listPublicos, {
    filtro: "MEU_PG",
  });
  // @ts-ignore Convex TS2589
  const todosPedidos = useQuery(api.pedidosOracao.queries.listPublicos, {
    filtro: "TODOS",
  });

  const createPedido = useMutation(api.pedidosOracao.mutations.create);

  const [selectedId, setSelectedId] = useState<Id<"pedidosOracao"> | null>(
    null
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [compartilhar, setCompartilhar] = useState(false);
  const [creating, setCreating] = useState(false);

  // Detail view
  if (selectedId) {
    return (
      <ModuloGuard modulo="pedidos-oracao">
      <PedidoOracaoDetalhe
        pedidoId={selectedId}
        onBack={() => setSelectedId(null)}
      />
      </ModuloGuard>
    );
  }

  const handleCreate = async () => {
    if (!novaDescricao.trim()) return;
    setCreating(true);
    try {
      await createPedido({
        descricao: novaDescricao.trim(),
        compartilhadoIgreja: compartilhar,
      });
      toast.success("Pedido de oracao enviado");
      setNovaDescricao("");
      setCompartilhar(false);
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    } finally {
      setCreating(false);
    }
  };

  const count = (list: any[] | undefined) =>
    list && list.length > 0 ? ` (${list.length})` : "";

  return (
    <ModuloGuard modulo="pedidos-oracao">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos de Oracao</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo pedido
        </Button>
      </div>

      <Tabs defaultValue="meus">
        <TabsList>
          <TabsTrigger value="meus">
            Meus pedidos{count(meusPedidos)}
          </TabsTrigger>
          <TabsTrigger value="pg">
            Meu PG{count(pedidosPG)}
          </TabsTrigger>
          <TabsTrigger value="todos">
            Todos{count(todosPedidos)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meus" className="space-y-3">
          <PedidosList
            pedidos={meusPedidos}
            onSelect={setSelectedId}
            emptyMsg="Voce ainda nao tem pedidos de oracao"
            onCreateClick={() => setCreateOpen(true)}
          />
        </TabsContent>

        <TabsContent value="pg" className="space-y-3">
          <PedidosList
            pedidos={pedidosPG}
            onSelect={setSelectedId}
            emptyMsg="Nenhum pedido no seu Pequeno Grupo"
          />
        </TabsContent>

        <TabsContent value="todos" className="space-y-3">
          <PedidosList
            pedidos={todosPedidos}
            onSelect={setSelectedId}
            emptyMsg="Nenhum pedido de oracao"
          />
        </TabsContent>
      </Tabs>

      {/* Dialog: Novo pedido */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Oracao</DialogTitle>
            <DialogDescription>
              Compartilhe seu pedido para que outros orem por voce.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Compartilhe seu pedido de oracao..."
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Church className="h-4 w-4 text-muted-foreground" />
                <Label
                  htmlFor="compartilhar-igreja"
                  className="text-sm cursor-pointer"
                >
                  Compartilhar com a igreja
                </Label>
              </div>
              <Switch
                id="compartilhar-igreja"
                checked={compartilhar}
                onCheckedChange={setCompartilhar}
              />
            </div>
            {compartilhar && (
              <p className="text-xs text-muted-foreground -mt-2 ml-1">
                Este pedido sera apresentado no momento de oracao do culto.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!novaDescricao.trim() || creating}
            >
              {creating ? "Enviando..." : "Enviar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ModuloGuard>
  );
}
