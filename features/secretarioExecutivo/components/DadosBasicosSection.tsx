"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { User, MapPin, Phone, Users } from "lucide-react";
import {
  STATUS_COLORS,
  FORMACAO_OPTIONS,
} from "@features/membros/lib/constants";

type Endereco = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
};

type Entidade = {
  _id: string;
  nomeCompleto?: string;
  apelido?: string;
  nomeSocial?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: string;
  estadoCivil?: string;
  pai?: string;
  mae?: string;
  profissao?: string;
  formacao?: string;
  foto?: string;
  whatsapp?: string;
  telefone?: string;
  email?: string;
  endereco?: Endereco;
  status?: string;
};

type ConjugeFilho = {
  entidadeId: string;
  nomeCompleto: string;
  foto?: string;
};

type Familia = {
  conjuge: ConjugeFilho | null;
  filhos: Array<ConjugeFilho & { dataNascimento?: string }>;
} | null | undefined;

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm">{value || "-"}</p>
    </div>
  );
}

export function DadosBasicosSection({
  entidade,
  familia,
}: {
  entidade: Entidade;
  familia: Familia;
}) {
  const end = entidade.endereco;
  const enderecoStr = end
    ? [
        end.logradouro,
        end.numero,
        end.complemento,
        end.bairro,
        end.cidade && end.estado ? `${end.cidade}/${end.estado}` : end.cidade || end.estado,
        end.cep,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const formacaoLabel = FORMACAO_OPTIONS.find((o) => o.value === entidade.formacao)?.label;
  const status = entidade.status || "ATIVO";

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={entidade.foto} />
            <AvatarFallback>
              {initials(entidade.nomeCompleto || "?")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <h2 className="text-xl font-semibold leading-tight">
              {entidade.nomeCompleto || "-"}
            </h2>
            {(entidade.nomeSocial || entidade.apelido) && (
              <p className="text-sm text-muted-foreground">
                {entidade.nomeSocial && <>Nome social: {entidade.nomeSocial}</>}
                {entidade.nomeSocial && entidade.apelido && <> &middot; </>}
                {entidade.apelido && <>&ldquo;{entidade.apelido}&rdquo;</>}
              </p>
            )}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              <Badge variant="outline" className={STATUS_COLORS[status] || ""}>
                {status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identificacao */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Identificacao (somente leitura)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="CPF" value={entidade.cpf} />
          <Row label="RG" value={entidade.rg} />
          <Row label="Data de nascimento" value={entidade.dataNascimento} />
          <Row label="Sexo" value={entidade.sexo === "M" ? "Masculino" : entidade.sexo === "F" ? "Feminino" : undefined} />
          <Row label="Estado civil" value={entidade.estadoCivil} />
          <Row label="Pai" value={entidade.pai} />
          <Row label="Mae" value={entidade.mae} />
          <Row label="Profissao" value={entidade.profissao} />
          <Row label="Formacao" value={formacaoLabel} />
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> Contato (somente leitura)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="WhatsApp" value={entidade.whatsapp} />
          <Row label="Telefone" value={entidade.telefone} />
          <Row label="Email" value={entidade.email} />
        </CardContent>
      </Card>

      {/* Endereco */}
      {enderecoStr && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Endereco (somente leitura)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{enderecoStr}</p>
          </CardContent>
        </Card>
      )}

      {/* Familia */}
      {familia && (familia.conjuge || familia.filhos.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Familia (somente leitura)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {familia.conjuge && (
              <div className="flex items-center gap-2 p-2 rounded-md border">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={familia.conjuge.foto} />
                  <AvatarFallback>
                    {initials(familia.conjuge.nomeCompleto)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm">{familia.conjuge.nomeCompleto}</p>
                  <p className="text-[10px] text-muted-foreground">Conjuge</p>
                </div>
              </div>
            )}
            {familia.filhos.map((f) => (
              <div
                key={f.entidadeId}
                className="flex items-center gap-2 p-2 rounded-md border"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={f.foto} />
                  <AvatarFallback>{initials(f.nomeCompleto)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm">{f.nomeCompleto}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Filho(a)
                    {f.dataNascimento && ` · ${f.dataNascimento}`}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
