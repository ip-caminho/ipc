"use client";

import { useState } from "react";
import { motion, type PanInfo } from "motion/react";
import { useMutation } from "convex/react";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Heart } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { haptic } from "@shared/lib/haptic";

function timeAgo(ts: number): string {
  try {
    return formatDistanceToNow(fromUnixTime(ts / 1000), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return "";
  }
}

export interface GuidedCardData {
  _id: Id<"pedidosOracao">;
  descricao: string;
  anonimo: boolean;
  autor: { nome: string; foto: string | null } | null;
  qtdOrando: number;
  euOrando: boolean;
  primeirosOrantes: { nome: string; foto: string | null }[];
  atualizacoes: {
    _id: string;
    texto: string;
    tipo: "ATUALIZACAO" | "REFORCO" | "TESTEMUNHO";
    criadoEm: number;
  }[];
}

const TIPO_DOT: Record<GuidedCardData["atualizacoes"][number]["tipo"], string> = {
  ATUALIZACAO: "bg-blue-500",
  REFORCO: "bg-amber-500",
  TESTEMUNHO: "bg-emerald-500",
};

const TIPO_LABEL: Record<GuidedCardData["atualizacoes"][number]["tipo"], string> = {
  ATUALIZACAO: "Atualização",
  REFORCO: "Pedido continua",
  TESTEMUNHO: "Testemunho",
};

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
    haptic(20);
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
      haptic(15);
      setExitDir(1);
      onAdvance(false);
    } else if (offset.x > COMMIT_THRESHOLD || velocity.x > COMMIT_VELOCITY) {
      haptic(15);
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
      initial={
        direction === 1
          ? { x: 0, opacity: 1, scale: 0.96 }
          : { x: "-100%", opacity: 0, scale: 1 }
      }
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: `${-exitDir * 100}%`, opacity: 0 }}
      transition={{ duration: 0.35, ease: IOS_EASE }}
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

      <div className="flex-1 my-5 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center gap-4">
          <p className="text-[16px] leading-[1.55] text-center whitespace-pre-wrap text-foreground">
            {pedido.descricao}
          </p>
          {pedido.atualizacoes.length > 0 && (
            <div className="border-t pt-4 flex flex-col gap-3">
              {pedido.atualizacoes.map((a) => (
                <div key={a._id} className="flex gap-2.5">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full mt-1.5 shrink-0",
                      TIPO_DOT[a.tipo],
                    )}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {TIPO_LABEL[a.tipo]}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 truncate">
                        {timeAgo(a.criadoEm)}
                      </p>
                    </div>
                    <p className="text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap mt-0.5">
                      {a.texto}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
