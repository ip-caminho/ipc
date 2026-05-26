"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface DetailHeaderProps {
  title?: string;
  backHref?: string;
}

export function DetailHeader({ title, backHref }: DetailHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 pt-4 pb-3">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push(backHref || "/");
          }
        }}
        className="flex items-center gap-1 text-sm text-muted-foreground -ml-1 px-1 min-h-11 active:opacity-70"
        aria-label="Voltar"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Voltar
      </button>
      {title && (
        <h1 className="text-lg font-medium truncate flex-1 min-w-0">
          {title}
        </h1>
      )}
    </div>
  );
}
