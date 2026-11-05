import { cn } from "@/shared/lib/utils/cn";

type Props = { disponiveis: number; total: number; className?: string };

/** Situação em forma e texto, sem depender só da cor. Nunca diz com quem está o livro. */
export function Disponibilidade({ disponiveis, total, className }: Props) {
  const livre = disponiveis > 0;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", livre ? "text-emerald-300" : "text-slate-300", className)}>
      <span
        aria-hidden
        className={cn("h-2 w-2 rounded-full", livre ? "bg-current" : "border-2 border-current")}
      />
      {livre ? "Disponível" : "Indisponível"}
      {total > 1 && <span className="font-normal text-muted-foreground">· {disponiveis} de {total} exemplares</span>}
    </span>
  );
}
