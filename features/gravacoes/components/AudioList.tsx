"use client";

import { useState } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/components/ui/empty";
import { AudioListItem, type AudioListItemData } from "./AudioListItem";

const PAGE_SIZE = 20;

interface AudioListProps {
  audios: AudioListItemData[] | undefined;
  hideType?: boolean;
}

export function AudioList({ audios, hideType }: AudioListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (audios === undefined) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (audios.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Nenhum áudio encontrado</EmptyTitle>
          <EmptyDescription>
            Tente outra categoria ou termo de busca
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const shown = audios.slice(0, visible);
  const hasMore = audios.length > visible;

  return (
    <div className="flex flex-col gap-3">
      {shown.map((a) => (
        <AudioListItem key={a._id} audio={a} hideType={hideType} />
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mt-2 self-center rounded-full border px-4 py-2 text-xs font-medium text-muted-foreground active:opacity-70 min-h-11"
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}
