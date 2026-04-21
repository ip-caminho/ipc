"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MembroForm } from "@features/membros/components/MembroForm";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { MembroFormValues } from "@features/membros/lib/validations";
import type { Id } from "@/convex/_generated/dataModel";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";

export default function MembroDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const membro = useQuery(api.membros.queries.getById, { id: id as Id<"membros"> });
  const updateMembro = useMutation(api.membros.mutations.update);

  if (membro === undefined) {
    return (
      <HeaderLayout>
        <DetailHeader backHref="/membros" />
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </HeaderLayout>
    );
  }

  if (!membro) {
    return (
      <HeaderLayout>
        <DetailHeader backHref="/membros" />
        <p className="text-muted-foreground">Membro nao encontrado</p>
      </HeaderLayout>
    );
  }

  const defaultValues: Partial<MembroFormValues> = {
    foto: membro.entidade?.foto || "",
    nomeCompleto: membro.entidade?.nomeCompleto || "",
    apelido: membro.entidade?.apelido || "",
    cpf: membro.entidade?.cpf || "",
    tipoDocumento: membro.entidade?.tipoDocumento as any,
    rg: membro.entidade?.rg || "",
    dataNascimento: membro.entidade?.dataNascimento || "",
    sexo: membro.entidade?.sexo as any,
    estadoCivil: membro.entidade?.estadoCivil as any,
    nacionalidade: membro.entidade?.nacionalidade || "",
    pai: membro.entidade?.pai || "",
    mae: membro.entidade?.mae || "",
    profissao: membro.entidade?.profissao || "",
    formacao: membro.entidade?.formacao as any,
    whatsapp: membro.entidade?.whatsapp || "",
    telefone: membro.entidade?.telefone || "",
    email: membro.entidade?.email || "",
    logradouro: membro.entidade?.endereco?.logradouro || "",
    numero: membro.entidade?.endereco?.numero || "",
    complemento: membro.entidade?.endereco?.complemento || "",
    bairro: membro.entidade?.endereco?.bairro || "",
    cidade: membro.entidade?.endereco?.cidade || "",
    estado: membro.entidade?.endereco?.estado || "",
    cep: membro.entidade?.endereco?.cep || "",
    role: membro.role,
    rol: membro.rol || "",
    dataMembresia: membro.dataMembresia || "",
    formaAdmissao: membro.formaAdmissao as any,
    cargoEclesiastico: membro.cargoEclesiastico as any,
    dataConversao: membro.dataConversao || "",
    dataBatismo: membro.dataBatismo || "",
    igrejaProcedencia: membro.igrejaProcedencia || "",
    cbcm: membro.entidade?.cbcm as any,
    atestadoAntecedentes: membro.entidade?.atestadoAntecedentes || "",
  };

  const handleSubmit = async (data: MembroFormValues) => {
    try {
      const endereco =
        data.logradouro || data.cidade
          ? {
              logradouro: data.logradouro || "",
              numero: data.numero || "",
              complemento: data.complemento,
              bairro: data.bairro || "",
              cidade: data.cidade || "",
              estado: data.estado || "",
              cep: data.cep || "",
            }
          : undefined;

      await updateMembro({
        id: id as Id<"membros">,
        entidadeData: {
          nomeCompleto: data.nomeCompleto,
          apelido: data.apelido || undefined,
          foto: data.foto || undefined,
          cpf: data.cpf || undefined,
          tipoDocumento: data.tipoDocumento || undefined,
          rg: data.rg || undefined,
          dataNascimento: data.dataNascimento || undefined,
          sexo: data.sexo || undefined,
          estadoCivil: data.estadoCivil || undefined,
          nacionalidade: data.nacionalidade || undefined,
          pai: data.pai || undefined,
          mae: data.mae || undefined,
          profissao: data.profissao || undefined,
          formacao: data.formacao || undefined,
          whatsapp: data.whatsapp || undefined,
          telefone: data.telefone || undefined,
          email: data.email || undefined,
          endereco,
          cbcm: data.cbcm || undefined,
          atestadoAntecedentes: data.atestadoAntecedentes || undefined,
        },
        membroData: {
          role: data.role,
          rol: data.rol || undefined,
          dataMembresia: data.dataMembresia || undefined,
          formaAdmissao: data.formaAdmissao || undefined,
          cargoEclesiastico: data.cargoEclesiastico || undefined,
          dataConversao: data.dataConversao || undefined,
          dataBatismo: data.dataBatismo || undefined,
          igrejaProcedencia: data.igrejaProcedencia || undefined,
        },
      });

      toast.success("Membro atualizado com sucesso");
      router.push("/membros");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar membro");
    }
  };

  return (
    <HeaderLayout>
      <DetailHeader backHref="/membros" />
      <div className="max-w-4xl">
        <MembroForm defaultValues={defaultValues} onSubmit={handleSubmit} isEditing entityId={membro.entidadeId} />
      </div>
    </HeaderLayout>
  );
}
