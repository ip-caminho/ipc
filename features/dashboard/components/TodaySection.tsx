"use client";

import { forwardRef, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Megaphone, type LucideIcon } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { AvisosWidget } from "@features/gravacoes/components/AvisosWidget";

interface TodayCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const TodayCard = forwardRef<HTMLButtonElement, TodayCardProps>(
  function TodayCard({ icon: Icon, title, subtitle, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        className="flex h-full flex-col items-start gap-1.5 rounded-md bg-secondary px-2.5 py-3 min-h-[92px] text-left active:opacity-80 transition-opacity"
      >
        <Icon className="h-4 w-4 text-secondary-foreground/70" aria-hidden />
        <span className="text-sm font-medium leading-tight">{title}</span>
        <span className="text-xs text-muted-foreground leading-tight">
          {subtitle}
        </span>
      </button>
    );
  },
);

export function TodaySection() {
  const [avisosOpen, setAvisosOpen] = useState(false);

  // @ts-expect-error Convex TS2589
  const avisosData = useQuery(api.gravacoes.queries.getLatestAvisos);
  // @ts-expect-error Convex TS2589
  const avisosNaoLidos = useQuery(api.gravacoes.avisosLeituras.countNaoLidos);
  const marcarComoLido = useMutation(api.gravacoes.avisosLeituras.marcarComoLido);

  useEffect(() => {
    if (!avisosOpen) return;
    if (!avisosData?.gravacaoId) return;
    if (!avisosNaoLidos || avisosNaoLidos === 0) return;
    marcarComoLido({ gravacaoId: avisosData.gravacaoId }).catch(() => {});
  }, [avisosOpen, avisosData?.gravacaoId, avisosNaoLidos, marcarComoLido]);

  const avisosSubtitle = (() => {
    if (avisosNaoLidos === undefined) return "Carregando...";
    if (avisosNaoLidos === 0) return "Nenhum novo";
    return `${avisosNaoLidos} ${avisosNaoLidos === 1 ? "novo" : "novos"}`;
  })();

  return (
    <div className="grid grid-cols-1 gap-2">
      <Drawer open={avisosOpen} onOpenChange={setAvisosOpen}>
        <DrawerTrigger asChild>
          <TodayCard
            icon={Megaphone}
            title="Avisos"
            subtitle={avisosSubtitle}
          />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-base">Avisos</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 h-[60vh] flex flex-col">
            <AvisosWidget variant="drawer" />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
