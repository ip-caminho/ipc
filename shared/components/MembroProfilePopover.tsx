"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Phone } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

const CARGO_LABELS: Record<string, string> = {
  MEMBRO_COMUNGANTE: "Membro Comungante",
  MEMBRO_NAO_COMUNGANTE: "Membro Nao Comungante",
  DIACONO: "Diacono",
  PRESBITERO: "Presbitero",
  PASTOR: "Pastor",
};

interface MembroProfilePopoverProps {
  membroId: Id<"membros">;
  children: React.ReactNode;
}

export function MembroProfilePopover({ membroId, children }: MembroProfilePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ProfileCard membroId={membroId} />
      </PopoverContent>
    </Popover>
  );
}

function ProfileCard({ membroId }: { membroId: Id<"membros"> }) {
  // @ts-ignore Convex TS2589
  const profile = useQuery(api.membros.queries.getPublicProfile, { id: membroId });

  if (profile === undefined) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-4 text-sm text-muted-foreground">Perfil nao encontrado</div>;
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {profile.foto && <AvatarImage src={profile.foto} alt={profile.nome} />}
          <AvatarFallback className="text-xl">{profile.nome?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-base">{profile.nome}</p>
          {profile.cargoEclesiastico && (
            <Badge variant="outline" className="text-xs mt-0.5">
              {CARGO_LABELS[profile.cargoEclesiastico] || profile.cargoEclesiastico}
            </Badge>
          )}
        </div>
      </div>
      {profile.whatsapp && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span>{profile.whatsapp}</span>
          </div>
        </div>
      )}
    </div>
  );
}
