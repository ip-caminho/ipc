"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import type { Id } from "@/convex/_generated/dataModel";
import { DadosBasicosSection } from "@features/secretarioExecutivo/components/DadosBasicosSection";
import { EclesiasticoForm } from "@features/secretarioExecutivo/components/EclesiasticoForm";
import { AtosPastoraisSection } from "@features/membros/components/AtosPastoraisSection";
import { CargosHistoricoSection } from "@features/membros/components/CargosHistoricoSection";

export default function SecretarioExecutivoDetalhePage() {
  const params = useParams();
  const id = params.id as Id<"membros">;

  const membro = useQuery(api.membros.queries.getById, { id });
  const familia = useQuery(api.membros.eclesiastico.getFamily, { membroId: id });

  if (membro === undefined) {
    return (
      <HeaderLayout>
        <DetailHeader backHref="/secretario-executivo" />
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
        <DetailHeader backHref="/secretario-executivo" />
        <p className="text-muted-foreground">Membro nao encontrado.</p>
      </HeaderLayout>
    );
  }

  const entidade = membro.entidade;
  if (!entidade) {
    return (
      <HeaderLayout>
        <DetailHeader backHref="/secretario-executivo" />
        <p className="text-muted-foreground">Entidade nao encontrada.</p>
      </HeaderLayout>
    );
  }

  const camposVerificados = (entidade.camposVerificados ?? []).map((c) => ({
    campo: c.campo,
    verificadoEm: c.verificadoEm,
  }));

  return (
    <PermissionGate permission="membros:read">
      <HeaderLayout>
        <DetailHeader backHref="/secretario-executivo" />
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
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
