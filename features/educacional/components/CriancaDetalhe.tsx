"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { ArrowLeft, Trash2, Edit, Users, ClipboardList } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { TURMA_COLORS, USO_IMAGEM_COLORS, TIPO_RESPONSAVEL_LABELS } from "../lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CriancaDetalheProps {
  entidadeId: Id<"entidades">;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function calcularIdade(dataNascimento: string): string {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  const diff = hoje.getTime() - nascimento.getTime();
  const anos = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  if (anos < 1) {
    const meses = Math.floor(diff / (30.44 * 24 * 60 * 60 * 1000));
    return `${meses} meses`;
  }
  return `${anos} ano${anos !== 1 ? "s" : ""}`;
}

export function CriancaDetalhe({ entidadeId, onBack, onEdit, onDelete }: CriancaDetalheProps) {
  const { can } = useAuth();
  const canManage = can("criancas:manage");

  const crianca = useQuery(api.educacional.queries.getCrianca, { entidadeId });

  if (crianca === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (!crianca) {
    return <p className="text-sm text-muted-foreground">Crianca nao encontrada</p>;
  }

  const turmaColor = TURMA_COLORS[crianca.turma] || "bg-gray-100 text-gray-800";
  const usoColor = USO_IMAGEM_COLORS[crianca.usoImagem] || "bg-gray-100 text-gray-800";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div className="flex-1" />
        {canManage && (
          <>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {crianca.nome}
            <Badge variant="secondary" className={turmaColor}>
              Turma {crianca.turma}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {crianca.dataNascimento && (
              <div>
                <p className="text-muted-foreground">Nascimento</p>
                <p>
                  {format(parseISO(crianca.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}
                  {" "}({calcularIdade(crianca.dataNascimento)})
                </p>
              </div>
            )}
            {crianca.sexo && (
              <div>
                <p className="text-muted-foreground">Sexo</p>
                <p>{crianca.sexo === "M" ? "Masculino" : "Feminino"}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Uso de imagem</p>
              <Badge variant="outline" className={usoColor}>
                {crianca.usoImagem === "AUTORIZADO"
                  ? "Autorizado"
                  : crianca.usoImagem === "NAO_AUTORIZADO"
                    ? "Nao autorizado"
                    : "Pendente"}
              </Badge>
            </div>
            {crianca.ovelhinhaNome && (
              <div>
                <p className="text-muted-foreground">Ovelhinha</p>
                <p>{crianca.ovelhinhaNome}</p>
              </div>
            )}
          </div>

          {crianca.observacoesMedicas && (
            <div>
              <p className="text-sm text-muted-foreground">Observacoes medicas</p>
              <p className="text-sm whitespace-pre-wrap">{crianca.observacoesMedicas}</p>
            </div>
          )}
          {crianca.observacoesFamilia && (
            <div>
              <p className="text-sm text-muted-foreground">Observacoes da familia</p>
              <p className="text-sm whitespace-pre-wrap">{crianca.observacoesFamilia}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsaveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Responsaveis
            <Badge variant="secondary">{crianca.responsaveis.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {crianca.responsaveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum responsavel cadastrado</p>
          ) : (
            <ul className="space-y-2">
              {crianca.responsaveis.map((r: any) => (
                <li key={r._id} className="text-sm flex items-center gap-2">
                  <span className="font-medium">{r.nome}</span>
                  <Badge variant="outline">
                    {TIPO_RESPONSAVEL_LABELS[r.tipo] || r.tipo}
                  </Badge>
                  {r.principal && <Badge variant="secondary">Principal</Badge>}
                  {r.whatsapp && (
                    <span className="text-xs text-muted-foreground">{r.whatsapp}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Historico de presenca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Presencas
            <Badge variant="secondary">{crianca.presencas.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {crianca.presencas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma presenca registrada</p>
          ) : (
            <ul className="space-y-1">
              {crianca.presencas.slice(-10).reverse().map((p: any, i: number) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span>{format(parseISO(p.data), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <Badge variant="outline">{p.turma}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
