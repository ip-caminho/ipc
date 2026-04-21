"use client";

import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { SearchBar } from "@features/comunidade/components/SearchBar";
import { ContinueListeningCard } from "@features/comunidade/components/ContinueListeningCard";
import { RecentSermonsScroll } from "@features/comunidade/components/RecentSermonsScroll";
import { UpcomingEventsScroll } from "@features/comunidade/components/UpcomingEventsScroll";
import { CurrentRepertoire } from "@features/comunidade/components/CurrentRepertoire";
import { ExploreGrid } from "@features/comunidade/components/ExploreGrid";

export default function ComunidadePage() {
  return (
    <HeaderLayout>
      <div className="-m-4 md:-m-6 md:max-w-2xl md:mx-auto">
        <div className="flex flex-col gap-5 py-4 md:py-6">
          <div className="px-4 flex flex-col gap-3">
            <PageHeader title="Comunidade" subtitle="O que está fresco na IPC" />
            <SearchBar />
            <ContinueListeningCard />
          </div>

          <RecentSermonsScroll />
          <UpcomingEventsScroll />
          <CurrentRepertoire />
          <ExploreGrid />
        </div>
      </div>
    </HeaderLayout>
  );
}
