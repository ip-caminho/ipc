"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { MembroForm } from "@features/membros/components/MembroForm";
import type { MembroFormValues } from "@features/membros/lib/validations";

export default function NovoMembroPage() {
  const createMembro = useMutation(api.membros.mutations.create);
  const router = useRouter();

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

      await createMembro({
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
        role: data.role || "membro",
        rol: data.rol || undefined,
        dataMembresia: data.dataMembresia || undefined,
        formaAdmissao: data.formaAdmissao || undefined,
        cargoEclesiastico: data.cargoEclesiastico || undefined,
        dataConversao: data.dataConversao || undefined,
        dataBatismo: data.dataBatismo || undefined,
        igrejaProcedencia: data.igrejaProcedencia || undefined,
        cbcm: data.cbcm || undefined,
        atestadoAntecedentes: data.atestadoAntecedentes || undefined,
      });

      toast.success("Membro criado com sucesso");
      router.push("/secretario-executivo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar membro");
    }
  };

  return (
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
  );
}
