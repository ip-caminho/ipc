"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVertical, Contact } from "lucide-react";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { CARGO_ECLESIASTICO_OPTIONS } from "@features/membros/lib/constants";
import { getDeterministicGradient } from "@shared/lib/utils/gradient";
import { formatPhoneInternational } from "@shared/lib/validations/brazilian";
import { getIniciais } from "@features/diretorio/lib/splitNome";
import { ProfileActionButtons } from "@features/diretorio/components/ProfileActionButtons";
import { ProfileSection } from "@features/diretorio/components/ProfileSection";
import { downloadVCard } from "@features/diretorio/lib/vcard";

function idadeLabel(data: string): string {
  try {
    const anos = differenceInYears(new Date(), parseISO(data));
    return anos === 1 ? "1 ano" : `${anos} anos`;
  } catch {
    return "";
  }
}

export default function MembroPerfilPage() {
  const params = useParams();
  const id = params.id as Id<"membros">;

  // @ts-ignore Convex TS2589
  const perfil = useQuery(api.membros.queries.getPublicProfile, { id });

  if (perfil === undefined) {
    return (
      <ModuloGuard modulo="diretorio">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-6 py-4 px-4">
          <DetailHeader backHref="/diretorio" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-5 w-48 mx-auto" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </ModuloGuard>
    );
  }

  if (!perfil) {
    return (
      <ModuloGuard modulo="diretorio">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-4 py-4 px-4">
          <DetailHeader backHref="/diretorio" />
          <p className="text-muted-foreground text-center py-12 text-sm">
            Membro não encontrado
          </p>
        </div>
      </ModuloGuard>
    );
  }

  const gradient = getDeterministicGradient(id as string);
  const iniciais = getIniciais(perfil.nome);
  const cargoLabel =
    CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === perfil.cargoEclesiastico)
      ?.label ?? null;

  const subtituloParts = [perfil.profissao, perfil.cidade].filter(Boolean);
  const subtitulo = subtituloParts.join(" · ");

  const aniversarioLine = perfil.dataNascimento
    ? `${format(parseISO(perfil.dataNascimento), "d 'de' MMMM", { locale: ptBR })} (${idadeLabel(perfil.dataNascimento)})`
    : null;

  return (
    <ModuloGuard modulo="diretorio">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-6 py-4 px-4">
        <div className="flex items-center">
          <DetailHeader backHref="/diretorio" />
          <div className="flex-1" />
          <ProfileMenu
            onSaveContact={() =>
              downloadVCard({
                nomeCompleto: perfil.nome,
                whatsapp: perfil.whatsapp,
                dataNascimento: perfil.dataNascimento,
                cidade: perfil.cidade,
                profissao: perfil.profissao,
              })
            }
          />
        </div>

        {/* Cabeçalho do perfil */}
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-24 w-24" style={{ background: gradient }}>
            {perfil.foto && <AvatarImage src={perfil.foto} alt={perfil.nome} />}
            <AvatarFallback className="text-2xl text-white font-medium bg-transparent">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-medium leading-tight">{perfil.nome}</h1>
            {subtitulo && (
              <p className="text-xs text-muted-foreground">{subtitulo}</p>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <ProfileActionButtons whatsapp={perfil.whatsapp} />

        {/* Contato */}
        <ProfileSection
          title="Contato"
          rows={[
            {
              label: "Telefone",
              value: perfil.whatsapp
                ? formatPhoneInternational(perfil.whatsapp)
                : null,
            },
          ]}
        />

        {/* Na igreja */}
        {cargoLabel && (
          <ProfileSection
            title="Na igreja"
            rows={[{ label: "Cargo", value: cargoLabel }]}
          />
        )}

        {/* Pessoal */}
        <ProfileSection
          title="Pessoal"
          rows={[
            { label: "Aniversário", value: aniversarioLine },
            { label: "Profissão", value: perfil.profissao },
            { label: "Cidade", value: perfil.cidade },
          ]}
        />
      </div>
    </ModuloGuard>
  );
}

function ProfileMenu({ onSaveContact }: { onSaveContact: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Menu"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => {
            onSaveContact();
            setOpen(false);
          }}
          className="cursor-pointer"
        >
          <Contact className="size-4" />
          Salvar contato no telefone
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
