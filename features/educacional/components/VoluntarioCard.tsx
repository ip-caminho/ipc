"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Edit, Trash2, FileText, Phone, Mail, TriangleAlert } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TURMA_COLORS,
  PAPEL_VOLUNTARIO_LABELS,
  PAPEL_VOLUNTARIO_COLORS,
  CBCM_LABELS,
  CBCM_COLORS,
} from "../lib/constants";

// Status do CAC pela validade: vencido (vermelho), a vencer em <=30d (ambar),
// valido (verde). Retorna null quando nao ha data de validade.
function cacStatus(cacValidade?: string): { label: string; color: string; alerta: boolean } | null {
  if (!cacValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = parseISO(cacValidade);
  const dias = Math.ceil((validade.getTime() - hoje.getTime()) / 86400000);
  const dataFmt = format(validade, "dd/MM/yyyy", { locale: ptBR });
  if (dias < 0) return { label: `CAC vencido (${dataFmt})`, color: "bg-red-100 text-red-800", alerta: true };
  if (dias <= 30) return { label: `CAC vence ${dataFmt}`, color: "bg-yellow-100 text-yellow-800", alerta: true };
  return { label: `CAC ate ${dataFmt}`, color: "bg-green-100 text-green-800", alerta: false };
}

interface VoluntarioCardProps {
  voluntario: {
    _id: string;
    nome: string;
    foto?: string | null;
    email?: string;
    whatsapp?: string;
    telefone?: string;
    papelEdu: string;
    turmasHabilitadas: string[];
    cbcm?: string;
    cacValidade?: string;
    certificadoCacUrl?: string;
  };
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function VoluntarioCard({
  voluntario: v,
  canManage,
  onEdit,
  onDelete,
}: VoluntarioCardProps) {
  const papelColor = PAPEL_VOLUNTARIO_COLORS[v.papelEdu] || "bg-gray-100 text-gray-800";
  const telefone = v.whatsapp || v.telefone;
  const cac = cacStatus(v.cacValidade);
  const cbcmColor = v.cbcm ? CBCM_COLORS[v.cbcm] || "bg-gray-100 text-gray-700" : "";

  return (
    <Card>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {v.foto && <AvatarImage src={v.foto} alt={v.nome} />}
            <AvatarFallback className="text-sm">{v.nome?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{v.nome}</p>
            <Badge variant="secondary" className={`mt-0.5 ${papelColor}`}>
              {PAPEL_VOLUNTARIO_LABELS[v.papelEdu] || v.papelEdu}
            </Badge>
          </div>
          {canManage && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {v.turmasHabilitadas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {v.turmasHabilitadas.map((t) => (
              <Badge
                key={t}
                variant="outline"
                className={TURMA_COLORS[t] || ""}
              >
                {t}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {v.cbcm && (
            <Badge variant="secondary" className={cbcmColor}>
              CBCM: {CBCM_LABELS[v.cbcm] || v.cbcm}
            </Badge>
          )}
          {cac && (
            <Badge variant="secondary" className={cac.color}>
              {cac.alerta && <TriangleAlert className="h-3 w-3 mr-1" />}
              {cac.label}
            </Badge>
          )}
          {v.certificadoCacUrl && (
            <Button
              variant="link"
              size="sm"
              asChild
              className="h-auto p-0 text-xs"
            >
              <a href={v.certificadoCacUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-3 w-3" />
                Certificado
              </a>
            </Button>
          )}
        </div>

        {(telefone || v.email) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {telefone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {telefone}
              </span>
            )}
            {v.email && (
              <span className="inline-flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {v.email}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
