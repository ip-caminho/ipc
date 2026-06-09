"use client";

import { SidebarTrigger } from "@/shared/components/ui/sidebar";

export function Header() {
  // No mobile nao ha header de topo: o conteudo usa todo o espaco e o menu do
  // usuario (perfil, tema, sair) vive no "Mais" da barra de baixo (MoreSheet).
  // No desktop mantem a barra com o gatilho da sidebar.
  return (
    <header className="hidden md:flex sticky top-0 z-40 h-12 shrink-0 items-center border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
    </header>
  );
}
