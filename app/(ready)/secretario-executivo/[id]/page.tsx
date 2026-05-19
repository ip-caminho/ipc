"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
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
      <div className="p-4 md:p-6 space-y-4 max-w-4xl">
        <div className="md:hidden">
          <DetailHeader backHref="/secretario-executivo" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!membro) {
    return (
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="md:hidden">
          <DetailHeader backHref="/secretario-executivo" />
        </div>
        <p className="text-muted-foreground">Membro nao encontrado.</p>
      </div>
    );
  }

  const entidade = membro.entidade;
  if (!entidade) {
    return (
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="md:hidden">
          <DetailHeader backHref="/secretario-executivo" />
        </div>
        <p className="text-muted-foreground">Entidade nao encontrada.</p>
      </div>
    );
  }

  const camposVerificados = (entidade.camposVerificados ?? []).map((c) => ({
    campo: c.campo,
    verificadoEm: c.verificadoEm,
  }));

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6 pb-24">
      <div className="md:hidden">
        <DetailHeader backHref="/secretario-executivo" />
      </div>

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
        }}
        camposVerificados={camposVerificados}
      />
      <AtosPastoraisSection membroId={membro._id} />
      <CargosHistoricoSection membroId={membro._id} />
    </div>
  );
}
