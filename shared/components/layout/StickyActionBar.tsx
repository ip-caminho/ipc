"use client";

import type { ReactNode } from "react";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { cn } from "@shared/lib/utils/cn";

// Barra de acao primaria (Salvar/Enviar) de formularios de pagina. No mobile fica
// fixa acima da FloatingBottomBar (e acima do player quando ativo); no desktop
// vira linha normal alinhada a direita. Filhos: botoes (h-12 flex-1 no mobile).
// O conteudo da pagina deve reservar espaco (ex.: pb-28) para nao ficar sob a barra.
export function StickyActionBar({ children, className }: { children: ReactNode; className?: string }) {
  const { isActive } = useAudioPlayer();

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur",
        "[&>*]:h-12 [&>*]:flex-1",
        "md:static md:justify-end md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        "md:[&>*]:h-9 md:[&>*]:flex-none",
        className,
      )}
      style={{
        bottom: `calc(${isActive ? "10.5rem" : "6rem"} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {children}
    </div>
  );
}
