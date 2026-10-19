import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils/cn";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
  // Botao primario: no mobile ocupa a largura toda abaixo do titulo; no desktop fica a direita.
  action?: ReactNode;
  // Mostra "Voltar" so no mobile (no desktop a sidebar basta).
  backHref?: string;
}

export function PageHeader({ title, subtitle, subtitleClassName, action, backHref }: PageHeaderProps) {
  return (
    <div className="pt-4 pb-3 md:pr-14">
      {backHref && (
        <Link
          href={backHref}
          className="md:hidden -ml-1 mb-1 flex w-fit items-center gap-1 px-1 min-h-11 text-sm text-muted-foreground active:opacity-70"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Voltar
        </Link>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className={cn("text-sm text-muted-foreground mt-1", subtitleClassName)}>{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="w-full md:w-auto md:shrink-0 [&>*]:w-full md:[&>*]:w-auto">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
