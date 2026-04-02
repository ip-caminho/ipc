"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { HandHeart, PlusCircle, Heart, Church, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { PedidoOracaoDetalhe } from "@features/pedidosOracao/components/PedidoOracaoDetalhe";
import { OrarExperiencia } from "@features/pedidosOracao/components/OrarExperiencia";
import { cn } from "@shared/lib/utils/cn";

function PedidoCard({ pedido, onClick }: { pedido: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/30 active:bg-muted transition-colors min-h-[56px]"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          {pedido.membroFoto && <AvatarImage src={pedido.membroFoto} />}
          <AvatarFallback className="text-xs">
            {pedido.membroNome?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{pedido.membroNome}</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{pedido.descricao}</p>
          <div className="flex items-center gap-3 mt-2">
            {pedido.qtdIntercessores > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="h-3 w-3" />
                {pedido.qtdIntercessores} orando
              </span>
            )}
            {pedido.compartilhadoIgreja && (
              <Church className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function PedidosOracaoPage() {
  // @ts-ignore Convex TS2589
  const todosPedidos = useQuery(api.pedidosOracao.queries.listPublicos, {
    filtro: "TODOS",
  });
  // @ts-ignore Convex TS2589
  const meusPedidos = useQuery(api.pedidosOracao.queries.listPublicos, {
    filtro: "MEUS",
  });

  const createPedido = useMutation(api.pedidosOracao.mutations.create);

  const [selectedId, setSelectedId] = useState<Id<"pedidosOracao"> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [orarMode, setOrarMode] = useState(false);
  const [meusPedidosOpen, setMeusPedidosOpen] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [compartilhar, setCompartilhar] = useState(false);
  const [creating, setCreating] = useState(false);

  const pedidosAtivos = (todosPedidos || []).filter((p: any) => p.status === "ATIVO");

  // Orar experience — full screen
  if (orarMode) {
    return (
      <OrarExperiencia
        pedidos={pedidosAtivos}
        onClose={() => setOrarMode(false)}
      />
    );
  }

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
      toast.success("Pedido de oração enviado");
      setNovaDescricao("");
      setCompartilhar(false);
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro");
    } finally {
      setCreating(false);
    }
  };

  const meusPedidosAtivos = (meusPedidos || []).filter((p: any) => p.status === "ATIVO");

  return (
    <ModuloGuard modulo="pedidos-oracao">
      <div className="flex flex-col justify-between" style={{ height: "calc(100dvh - 10rem)" }}>
        {/* Título no topo */}
        <div>
          <h1 className="text-2xl font-bold">Orar</h1>
        </div>

        {/* Botões na parte inferior — thumb zone */}
        <div className="space-y-3 pb-2">
          {/* Linha 1: Meus pedidos + Pedir oração */}
          <div className="grid grid-cols-2 gap-3">
            {/* Meus pedidos */}
            <Drawer open={meusPedidosOpen} onOpenChange={setMeusPedidosOpen}>
              <DrawerTrigger
                onClick={() => setMeusPedidosOpen(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-5 hover:bg-muted/50 active:bg-muted transition-colors min-h-[100px]"
              >
                <Heart className="h-8 w-8 text-muted-foreground" />
                <span className="text-base font-medium">Meus pedidos</span>
                {meusPedidosAtivos.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {meusPedidosAtivos.length} ativo{meusPedidosAtivos.length !== 1 ? "s" : ""}
                  </span>
                )}
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="text-base">Meus pedidos</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto space-y-2">
                  {!meusPedidos || meusPedidos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Você ainda não tem pedidos de oração
                    </p>
                  ) : (
                    meusPedidos.map((p: any) => (
                      <PedidoCard
                        key={p._id}
                        pedido={p}
                        onClick={() => { setMeusPedidosOpen(false); setSelectedId(p._id); }}
                      />
                    ))
                  )}
                </div>
              </DrawerContent>
            </Drawer>

            {/* Pedir oração */}
            <Drawer open={createOpen} onOpenChange={setCreateOpen}>
              <DrawerTrigger
                onClick={() => setCreateOpen(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-5 hover:bg-violet-100 dark:hover:bg-violet-950/50 active:bg-violet-200 transition-colors min-h-[100px]"
              >
                <PlusCircle className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                <span className="text-base font-medium text-violet-700 dark:text-violet-300">Pedir oração</span>
              </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="text-base">Novo pedido de oração</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-4">
                <Textarea
                  placeholder="Compartilhe seu pedido de oração..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  rows={4}
                  className="text-base min-h-[120px]"
                />
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Church className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="compartilhar-igreja" className="text-sm cursor-pointer">
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
                    Este pedido será apresentado no momento de oração do culto.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 min-h-[44px]"
                    onClick={handleCreate}
                    disabled={!novaDescricao.trim() || creating}
                  >
                    {creating ? "Enviando..." : "Enviar pedido"}
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
          </div>

          {/* Linha 2: Iniciar oração */}
          <button
            onClick={() => setOrarMode(true)}
            className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5 hover:bg-blue-100 dark:hover:bg-blue-950/50 active:bg-blue-200 transition-colors min-h-[72px]"
          >
            <HandHeart className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-base font-medium text-blue-700 dark:text-blue-300">Iniciar oração</span>
          </button>
        </div>
      </div>
    </ModuloGuard>
  );
}
