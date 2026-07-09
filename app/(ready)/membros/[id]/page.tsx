"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { useAuth } from "@shared/providers/PermissionsProvider";
import type { Id } from "@/convex/_generated/dataModel";
import type { MembroFormValues } from "@features/membros/lib/validations";
import { mapFormToEntidadeData } from "@features/membros/lib/mappers";
import { MembroForm } from "@features/membros/components/MembroForm";
import { AcessoSection } from "@features/membros/components/AcessoSection";
import { DadosBasicosSection } from "@features/secretarioExecutivo/components/DadosBasicosSection";
import { EclesiasticoForm } from "@features/secretarioExecutivo/components/EclesiasticoForm";
import { AtosPastoraisSection } from "@features/membros/components/AtosPastoraisSection";
import { CargosHistoricoSection } from "@features/membros/components/CargosHistoricoSection";

export default function SecretarioExecutivoDetalhePage() {
  const params = useParams();
  const id = params.id as Id<"membros">;

  const { can } = useAuth();
  const membro = useQuery(api.membros.queries.getById, { id });
  const familia = useQuery(api.membros.eclesiastico.getFamily, { membroId: id });
  const updateMembro = useMutation(api.membros.mutations.update);
  const [editOpen, setEditOpen] = useState(false);

  if (membro === undefined) {
    return (
      <HeaderLayout>
        <DetailHeader backHref="/membros" />
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </HeaderLayout>
    );
  }

  if (!membro) {
    return (
      <HeaderLayout>
        <DetailHeader backHref="/membros" />
        <p className="text-muted-foreground">Membro nao encontrado.</p>
      </HeaderLayout>
    );
  }

  const entidade = membro.entidade;
  if (!entidade) {
    return (
      <HeaderLayout>
        <DetailHeader backHref="/membros" />
        <p className="text-muted-foreground">Entidade nao encontrada.</p>
      </HeaderLayout>
    );
  }

  const camposVerificados = (entidade.camposVerificados ?? []).map((c) => ({
    campo: c.campo,
    verificadoEm: c.verificadoEm,
  }));

  const defaultValues: Partial<MembroFormValues> = {
    foto: entidade.foto || "",
    nomeCompleto: entidade.nomeCompleto || "",
    apelido: entidade.apelido || "",
    cpf: entidade.cpf || "",
    tipoDocumento: entidade.tipoDocumento as MembroFormValues["tipoDocumento"],
    rg: entidade.rg || "",
    dataNascimento: entidade.dataNascimento || "",
    sexo: entidade.sexo as MembroFormValues["sexo"],
    estadoCivil: entidade.estadoCivil as MembroFormValues["estadoCivil"],
    nacionalidade: entidade.nacionalidade || "",
    pai: entidade.pai || "",
    mae: entidade.mae || "",
    profissao: entidade.profissao || "",
    formacao: entidade.formacao as MembroFormValues["formacao"],
    whatsapp: entidade.whatsapp || "",
    telefone: entidade.telefone || "",
    email: entidade.email || "",
    logradouro: entidade.endereco?.logradouro || "",
    numero: entidade.endereco?.numero || "",
    complemento: entidade.endereco?.complemento || "",
    bairro: entidade.endereco?.bairro || "",
    cidade: entidade.endereco?.cidade || "",
    estado: entidade.endereco?.estado || "",
    cep: entidade.endereco?.cep || "",
    vinculoIgreja: entidade.vinculoIgreja as MembroFormValues["vinculoIgreja"],
    cbcm: entidade.cbcm as MembroFormValues["cbcm"],
  };

  const handlePersonalSubmit = async (data: MembroFormValues) => {
    try {
      await updateMembro({ id, entidadeData: mapFormToEntidadeData(data) });
      toast.success("Dados pessoais atualizados");
      setEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    }
  };

  return (
    <ModuloGuard modulo="membros">
    <PermissionGate permission="rol:read">
      <HeaderLayout>
        <DetailHeader backHref="/membros" />
        <div className="max-w-4xl space-y-6 pb-24">
          <DadosBasicosSection
            entidade={{
              _id: entidade._id,
              nomeCompleto: entidade.nomeCompleto,
              apelido: entidade.apelido,
              nomeSocial: entidade.nomeSocial,
              cpf: entidade.cpf,
              rg: entidade.rg,
              dataNascimento: entidade.dataNascimento,
              sexo: entidade.sexo,
              estadoCivil: entidade.estadoCivil,
              pai: entidade.pai,
              mae: entidade.mae,
              profissao: entidade.profissao,
              formacao: entidade.formacao,
              foto: entidade.foto,
              whatsapp: entidade.whatsapp,
              telefone: entidade.telefone,
              email: entidade.email,
              endereco: entidade.endereco,
              status: entidade.status,
            }}
            familia={familia}
            onEditar={can("membros:update") ? () => setEditOpen(true) : undefined}
          />

          <PermissionGate permission="rol:update">
            <EclesiasticoForm
              membroId={membro._id}
              entidadeId={entidade._id}
              initial={{
                cargoEclesiastico: membro.cargoEclesiastico,
                rol: membro.rol,
                tipoRolOverride: membro.tipoRolOverride,
                numeroMatricula: membro.numeroMatricula,
                dataConversao: membro.dataConversao,
                dataBatismo: membro.dataBatismo,
                dataMembresia: membro.dataMembresia,
                formaAdmissao: membro.formaAdmissao,
                igrejaProcedencia: membro.igrejaProcedencia,
                observacoesPastorais: membro.observacoesPastorais,
                formaDemissao: membro.formaDemissao,
                dataDemissao: membro.dataDemissao,
                igrejaDestino: membro.igrejaDestino,
                dataFalecimento: membro.dataFalecimento,
                cartaTransferencia: membro.cartaTransferencia,
                motivoDemissao: membro.motivoDemissao,
                motivoDemissaoObs: membro.motivoDemissaoObs,
              }}
              camposVerificados={camposVerificados}
            />
            <AtosPastoraisSection membroId={membro._id} />
            <CargosHistoricoSection membroId={membro._id} />
          </PermissionGate>

          <PermissionGate permission="acesso:manage">
            <AcessoSection membroId={membro._id} />
          </PermissionGate>
        </div>

        <Drawer open={editOpen} onOpenChange={setEditOpen}>
          <DrawerContent className="max-h-[92vh]">
            <DrawerHeader>
              <DrawerTitle>Editar dados pessoais</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-8">
              <MembroForm
                personalOnly
                isEditing
                entityId={entidade._id}
                defaultValues={defaultValues}
                onSubmit={handlePersonalSubmit}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </HeaderLayout>
    </PermissionGate>
    </ModuloGuard>
  );
}
