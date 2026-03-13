"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MembroForm } from "@features/membros/components/MembroForm";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
        foto: data.foto || undefined,
        cpf: data.cpf || undefined,
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
      });

      toast.success("Membro criado com sucesso");
      router.push("/membros");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar membro");
    }
  };

  return (
    <div className="max-w-4xl">
      <MembroForm onSubmit={handleSubmit} />
    </div>
  );
}
