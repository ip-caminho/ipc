"use client";

import { useState } from "react";
import { motion, type PanInfo } from "motion/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Heart } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";

export interface GuidedCardData {
  _id: Id<"pedidosOracao">;
  descricao: string;
  anonimo: boolean;
  autor: { nome: string; foto: string | null } | null;
  qtdOrando: number;
  euOrando: boolean;
  primeirosOrantes: { nome: string; foto: string | null }[];
}

interface Props {
  pedido: GuidedCardData;
  direction: 1 | -1;
  onAdvance: (orou: boolean) => void;
  onPrevious: () => void;
}

const IOS_EASE = [0.32, 0.72, 0, 1] as const;
const COMMIT_THRESHOLD = 80;
const COMMIT_VELOCITY = 500;

export function GuidedPrayerCard({
  pedido,
  direction,
  onAdvance,
  onPrevious,
}: Props) {
  const togglePrayer = useMutation(api.pedidosOracao.mutations.togglePrayer);
  const [submitting, setSubmitting] = useState(false);
  const [exitDir, setExitDir] = useState<1 | -1>(1);

  const nome = pedido.anonimo
    ? "Pedido anônimo"
    : pedido.autor?.nome || "Usuário";
  const foto = pedido.anonimo ? null : pedido.autor?.foto ?? null;

  const handleOrei = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!pedido.euOrando) {
        await togglePrayer({ pedidoId: pedido._id });
      }
    } catch {
      // silencioso — backend reativo mostra estado real
    } finally {
      setTimeout(() => {
        setExitDir(1);
        onAdvance(true);
      }, 400);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -COMMIT_THRESHOLD || velocity.x < -COMMIT_VELOCITY) {
      setExitDir(1);
      onAdvance(false);
    } else if (offset.x > COMMIT_THRESHOLD || velocity.x > COMMIT_VELOCITY) {
      setExitDir(-1);
      onPrevious();
    }
  };

  return (
    <motion.div
      key={pedido._id}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ x: `${direction * 100}%`, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: `${-exitDir * 100}%`, opacity: 0 }}
      transition={{ duration: 0.4, ease: IOS_EASE }}
      style={{ touchAction: "pan-x", willChange: "transform" }}
      className="guided-prayer-card absolute inset-0 flex flex-col bg-background rounded-2xl border shadow-sm p-6"
    >
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-[54px] w-[54px]">
          {foto && <AvatarImage src={foto} alt={nome} />}
          <AvatarFallback className={cn("text-lg", pedido.anonimo && "bg-secondary")}>
            {pedido.anonimo ? "🙏" : nome.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <p
          className={cn(
            "text-sm font-medium",
            pedido.anonimo && "italic text-muted-foreground",
          )}
        >
          {nome}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center my-5 overflow-y-auto">
        <p className="text-[16px] leading-[1.55] text-center whitespace-pre-wrap text-foreground">
          {pedido.descricao}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="h-px bg-border" />

        <div className="flex items-center justify-center gap-2">
          {pedido.primeirosOrantes.length > 0 && (
            <div className="flex -space-x-2">
              {pedido.primeirosOrantes.slice(0, 3).map((o, i) => (
                <Avatar key={i} className="h-6 w-6 ring-2 ring-background">
                  {o.foto && <AvatarImage src={o.foto} alt={o.nome} />}
                  <AvatarFallback className="text-[10px]">
                    {(o.nome || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {pedido.qtdOrando === 0
              ? "Seja o primeiro a orar"
              : pedido.qtdOrando === 1
                ? "1 pessoa orou por este pedido"
                : `${pedido.qtdOrando} pessoas oraram por este pedido`}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={handleOrei}
          disabled={submitting}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-foreground text-background font-medium text-[15px] min-h-[48px]"
        >
          <motion.span
            animate={submitting ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                pedido.euOrando && "fill-current",
              )}
            />
          </motion.span>
          {pedido.euOrando ? "Orei novamente" : "Orei por este pedido"}
        </motion.button>
      </div>
    </motion.div>
  );
}
