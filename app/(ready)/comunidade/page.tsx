"use client";

import { NavSectionList } from "@features/navigation/components/NavSectionList";
import { COMUNIDADE_SECTIONS } from "@shared/constants/navigation";

export default function ComunidadePage() {
  return (
    <div className="max-w-2xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-medium">Comunidade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conteúdo, pessoas e espaços da igreja
        </p>
      </header>
      <NavSectionList sections={COMUNIDADE_SECTIONS} />
    </div>
  );
}
