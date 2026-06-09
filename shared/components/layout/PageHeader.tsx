"use client";

import { cn } from "@shared/lib/utils/cn";
import { useSetPageTitle } from "@shared/providers/PageTitleProvider";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  // Alimenta o header global — no mobile o titulo vive na barra de cima.
  useSetPageTitle(title);

  return (
    <div
      className={cn(
        "md:pt-4 md:pb-3 md:pr-14",
        // Mobile: o titulo grande sai (fica na barra). Mostra so se houver
        // subtitulo; senao colapsa para nao deixar espaco vazio.
        subtitle ? "pt-4 pb-3" : "max-md:hidden",
      )}
    >
      <h1 className="hidden font-display text-2xl font-semibold leading-tight tracking-tight md:block">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground md:mt-1">{subtitle}</p>
      )}
    </div>
  );
}
