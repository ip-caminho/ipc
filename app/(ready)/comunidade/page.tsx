"use client";

import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { SearchBar } from "@features/comunidade/components/SearchBar";
import { ContinueListeningCard } from "@features/comunidade/components/ContinueListeningCard";
import { RecentByTipo } from "@features/comunidade/components/RecentByTipo";

export default function ComunidadePage() {
  return (
    <HeaderLayout>
      <div className="-m-4 md:-m-6 md:max-w-2xl md:mx-auto">
        <div className="flex flex-col gap-5 py-4 md:py-6">
          <div className="px-4 flex flex-col gap-3">
            <PageHeader title="Gravações" subtitle="Sermões, estudos e palestras" />
            <SearchBar />
            <ContinueListeningCard />
          </div>

          <RecentByTipo titulo="Pregacoes" tipo="SERMAO" />
          <RecentByTipo titulo="Estudos" tipo="ESTUDO_BIBLICO" />
          <RecentByTipo titulo="Palestras" tipo="PALESTRA" />
        </div>
      </div>
    </HeaderLayout>
  );
}
