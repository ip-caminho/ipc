"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FileText } from "lucide-react";
import { format, isSunday, nextSunday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/shared/lib/utils/cn";

export function BoletimCard() {
  // @ts-ignore Convex TS2589
  const status = useQuery(api.boletim.queries.getLiveStatus);

  const fallbackLabel = useMemo(() => {
    const now = new Date();
    const proximo = isSunday(now) ? now : nextSunday(now);
    return format(proximo, "EEEE',' HH'h'", { locale: ptBR });
  }, []);

  const proximoCultoLabel = useMemo(() => {
    if (!status?.proximoCulto) return fallbackLabel;
    const data = parseISO(status.proximoCulto.data);
    const horario = status.proximoCulto.horario;
    if (horario) {
      return `${format(data, "EEEE", { locale: ptBR })}, ${horario}`;
    }
    return format(data, "EEEE',' HH'h'", { locale: ptBR });
  }, [status?.proximoCulto, fallbackLabel]);

  const isLive = status?.isLive ?? false;

  if (isLive) {
    return (
      <Link
        href="/boletim"
        aria-label="Boletim dominical, ao vivo agora"
        className="flex items-center gap-3 rounded-xl p-4 min-h-[72px] bg-[#1a1a1a] text-white active:opacity-90 transition-opacity"
      >
        <FileText className="h-6 w-6 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium">Boletim dominical</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#ff4444]">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff4444] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff4444]" />
            </span>
            Ao vivo agora
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/boletim"
      aria-label={`Próximo culto, ${proximoCultoLabel}`}
      className={cn(
        "flex items-center gap-3 rounded-xl p-4 min-h-[72px]",
        "bg-secondary text-secondary-foreground active:opacity-90 transition-opacity",
      )}
    >
      <FileText className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium">Próximo culto</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">
          {proximoCultoLabel}
        </p>
      </div>
    </Link>
  );
}
