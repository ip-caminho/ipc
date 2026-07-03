"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { MembroForm } from "@features/membros/components/MembroForm";
import type { MembroFormValues } from "@features/membros/lib/validations";
import { mapFormToEntidadeData } from "@features/membros/lib/mappers";

export default function NovoMembroPage() {
  const createMembro = useMutation(api.membros.mutations.create);
  const router = useRouter();

  const handleSubmit = async (data: MembroFormValues) => {
    try {
      await createMembro({
        // dados pessoais (entidade) — mapeamento compartilhado com a edicao
        ...mapFormToEntidadeData(data),
        // dados eclesiasticos (membro)
        role: data.role || "membro",
        rol: data.rol || undefined,
        dataMembresia: data.dataMembresia || undefined,
        formaAdmissao: data.formaAdmissao || undefined,
        cargoEclesiastico: data.cargoEclesiastico || undefined,
        dataConversao: data.dataConversao || undefined,
        dataBatismo: data.dataBatismo || undefined,
        igrejaProcedencia: data.igrejaProcedencia || undefined,
      });

      toast.success("Membro criado com sucesso");
      router.push("/secretario-executivo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar membro");
    }
  };

  return (
    <ModuloGuard modulo="membros">
    <PermissionGate
      permission="membros:create"
      fallback={
        <HeaderLayout>
          <p className="text-muted-foreground">Sem permissão para criar membros.</p>
        </HeaderLayout>
      }
    >
      <HeaderLayout>
        <DetailHeader title="Novo membro" backHref="/secretario-executivo" />
        <div className="max-w-4xl">
          <MembroForm onSubmit={handleSubmit} />
        </div>
      </HeaderLayout>
    </PermissionGate>
    </ModuloGuard>
  );
}
