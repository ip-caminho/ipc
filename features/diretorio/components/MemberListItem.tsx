"use client";

import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { getDeterministicGradient } from "@shared/lib/utils/gradient";
import { getIniciais } from "../lib/splitNome";

export interface MemberListItemData {
  _id: Id<"membros">;
  nomeCompleto: string;
  foto: string | null;
}

interface Props {
  membro: MemberListItemData;
}

export function MemberListItem({ membro }: Props) {
  const router = useRouter();
  const gradient = getDeterministicGradient(membro._id);
  const iniciais = getIniciais(membro.nomeCompleto);

  return (
    <button
      type="button"
      onClick={() => router.push(`/diretorio/${membro._id}`)}
      className="flex items-center gap-2.5 py-2 border-b w-full text-left active:opacity-80 transition-opacity"
    >
      <Avatar className="h-9 w-9 shrink-0" style={{ background: gradient }}>
        {membro.foto && <AvatarImage src={membro.foto} alt={membro.nomeCompleto} />}
        <AvatarFallback className="text-[11px] text-white font-medium bg-transparent">
          {iniciais}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{membro.nomeCompleto}</p>
      </div>
    </button>
  );
}
