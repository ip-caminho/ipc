"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Play } from "lucide-react";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { MuralView } from "@features/pedidosOracao/components/MuralView";
import { MyRequestsView } from "@features/pedidosOracao/components/MyRequestsView";
import { NewRequestModal } from "@features/pedidosOracao/components/NewRequestModal";
import { cn } from "@shared/lib/utils/cn";
import { haptic } from "@shared/lib/haptic";

type Tab = "mural" | "meus";

export default function PedidosOracaoPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("mural");
  const [createOpen, setCreateOpen] = useState(false);

  // @ts-ignore Convex TS2589
  const mural = useQuery(api.pedidosOracao.queries.listMuralRequests, {});
  const qtdAtivos = (mural ?? []).filter((p: any) => p.status === "ATIVO").length;

  const goToPedido = (id: string) => router.push(`/pedidos-oracao/${id}`);

  return (
    <ModuloGuard modulo="pedidos-oracao">
      <div className="-m-4 md:-m-6 md:max-w-2xl md:mx-auto">
        <div className="flex flex-col gap-4 py-4 md:py-6">
          <header className="px-4">
            <h1 className="text-[22px] font-medium leading-none">Orar</h1>
          </header>

          {/* Sub-abas */}
          <div className="px-4">
            <div role="tablist" className="flex gap-4 border-b">
              {(["mural", "meus"] as const).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    className={cn(
                      "relative h-11 text-sm font-medium transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {t === "mural" ? "Mural" : "Meus pedidos"}
                    {active && (
                      <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-foreground rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {tab === "mural" && (
            <div className="px-4 flex flex-col gap-4">
              {/* Card: iniciar oracao guiada */}
              <button
                type="button"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = rect.left + rect.width / 2;
                  const y = rect.top + rect.height / 2;
                  sessionStorage.setItem(
                    "prayer-intro-origin",
                    JSON.stringify({ x, y }),
                  );
                  haptic(30);
                  router.push("/pedidos-oracao/guiada");
                }}
                disabled={qtdAtivos === 0}
                className="flex items-center gap-3 rounded-xl p-3.5 text-left disabled:opacity-50 disabled:cursor-not-allowed active:opacity-90 transition-opacity"
                style={{ backgroundColor: "#1a1a1a" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium tracking-wider uppercase text-white/60">
                    {qtdAtivos} {qtdAtivos === 1 ? "pedido ativo" : "pedidos ativos"}
                  </p>
                  <p className="text-sm font-medium text-white mt-0.5">
                    Iniciar oração guiada
                  </p>
                </div>
                <div className="shrink-0 h-9 w-9 rounded-full bg-white flex items-center justify-center">
                  <Play
                    className="h-4 w-4 text-black"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </div>
              </button>

              {/* Botao: compartilhar um pedido */}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 bg-secondary rounded-md px-3 h-11 text-sm text-muted-foreground active:opacity-80 transition-opacity border"
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span>Compartilhar um pedido</span>
              </button>

              <MuralView onOpenPedido={goToPedido} />
            </div>
          )}

          {tab === "meus" && (
            <div className="px-4">
              <MyRequestsView onOpenPedido={goToPedido} />
            </div>
          )}
        </div>
      </div>

      <NewRequestModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setTab("mural")}
      />
    </ModuloGuard>
  );
}
