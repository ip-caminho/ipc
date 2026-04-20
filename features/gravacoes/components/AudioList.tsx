"use client";

import { useState } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AudioListItem, type AudioListItemData } from "./AudioListItem";

const PAGE_SIZE = 20;

interface AudioListProps {
  audios: AudioListItemData[] | undefined;
}

export function AudioList({ audios }: AudioListProps) {
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-base font-medium">Nenhum áudio encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tente outra categoria ou termo de busca
        </p>
      </div>
    );
  }

  const shown = audios.slice(0, visible);
  const hasMore = audios.length > visible;

  return (
    <div className="flex flex-col gap-3">
      {shown.map((a) => (
        <AudioListItem key={a._id} audio={a} />
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
