"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

interface Orante {
  nome: string;
  foto: string | null;
}

interface PrayerAvatarStackProps {
  orantes: Orante[];
  total: number;
  euOrando: boolean;
}

/** Stack de ate 3 avatares sobrepostos + contador textual. */
export function PrayerAvatarStack({ orantes, total, euOrando }: PrayerAvatarStackProps) {
  const primeiros = orantes.slice(0, 3);
  const extras = Math.max(0, total - primeiros.length);

  let label = "";
  if (total === 0) {
    label = "Seja o primeiro a orar";
  } else if (euOrando && total === 1) {
    label = "Você está orando";
  } else if (euOrando) {
    label = `Você e +${total - 1}`;
  } else {
    label = total === 1 ? "1 pessoa orando" : `${total} orando`;
  }

  return (
    <div className="flex items-center gap-2">
      {primeiros.length > 0 && (
        <div className="flex -space-x-2">
          {primeiros.map((o, i) => (
            <Avatar
              key={i}
              className="h-5 w-5 ring-2 ring-background"
            >
              {o.foto && <AvatarImage src={o.foto} alt={o.nome} />}
              <AvatarFallback className="text-[9px]">
                {(o.nome || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {extras > 0 && (
            <div className="h-5 w-5 rounded-full bg-secondary text-secondary-foreground text-[9px] font-medium flex items-center justify-center ring-2 ring-background">
              +{extras}
            </div>
          )}
        </div>
      )}
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
