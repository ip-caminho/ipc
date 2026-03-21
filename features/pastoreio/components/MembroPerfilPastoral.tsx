"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Cake,
  Heart,
  Users,
  ClipboardList,
  HandHeart,
  FileText,
  Headphones,
  CalendarDays,
  Briefcase,
  Church,
} from "lucide-react";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TIPO_VISITA_COLORS,
  STATUS_PEDIDO_COLORS,
} from "../lib/constants";

interface MembroPerfilPastoralProps {
  membroId: Id<"membros">;
  onBack: () => void;
}

const CARGO_LABELS: Record<string, string> = {
  MEMBRO_COMUNGANTE: "Membro Comungante",
  MEMBRO_NAO_COMUNGANTE: "Membro Nao Comungante",
  DIACONO: "Diacono",
  PRESBITERO: "Presbitero",
  PASTOR: "Pastor",
};

const ADMISSAO_LABELS: Record<string, string> = {
  BATISMO: "Batismo",
  PROFISSAO_FE: "Profissao de Fe",
  TRANSFERENCIA: "Transferencia",
  JURISDICAO: "Jurisdicao",
};

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  SOLTEIRO: "Solteiro(a)",
  CASADO: "Casado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO: "Viuvo(a)",
  UNIAO_ESTAVEL: "Uniao Estavel",
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return format(parseISO(d), "dd/MM/yyyy");
  } catch {
    return d;
  }
}

function calcAge(d: string | null | undefined): string {
  if (!d) return "";
  try {
    const age = differenceInYears(new Date(), parseISO(d));
    return `(${age} anos)`;
  } catch {
    return "";
  }
}

function formatDateLong(d: string): string {
  try {
    return format(parseISO(d), "dd 'de' MMM yyyy", { locale: ptBR });
  } catch {
    return d;
  }
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: any;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
          {count !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {count}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MembroPerfilPastoral({
  membroId,
  onBack,
}: MembroPerfilPastoralProps) {
  // @ts-ignore Convex TS2589
  const perfil = useQuery(api.pastoreio.queries.getMembroPerfil, {
    membroId,
  });

  if (perfil === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (!perfil) {
    return <p className="text-sm text-muted-foreground">Membro nao encontrado</p>;
  }

  const { membro, entidade, conjuge } = perfil;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-12 w-12">
          {entidade.foto && <AvatarImage src={entidade.foto} />}
          <AvatarFallback>
            {entidade.nomeCompleto?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{entidade.nomeCompleto}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {membro.cargoEclesiastico && (
              <Badge variant="outline">
                {CARGO_LABELS[membro.cargoEclesiastico] || membro.cargoEclesiastico}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={
                entidade.status === "ATIVO"
                  ? "border-green-500 text-green-700"
                  : ""
              }
            >
              {entidade.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Dados Pessoais + Contato */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Dados Pessoais" icon={Users}>
          <div className="space-y-2 text-sm">
            {entidade.dataNascimento && (
              <p className="flex items-center gap-2">
                <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(entidade.dataNascimento)}{" "}
                <span className="text-muted-foreground">
                  {calcAge(entidade.dataNascimento)}
                </span>
              </p>
            )}
            {entidade.estadoCivil && (
              <p>
                <span className="text-muted-foreground">Estado civil:</span>{" "}
                {ESTADO_CIVIL_LABELS[entidade.estadoCivil] || entidade.estadoCivil}
              </p>
            )}
            {entidade.profissao && (
              <p className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                {entidade.profissao}
              </p>
            )}
            {entidade.whatsapp && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {entidade.whatsapp}
              </p>
            )}
            {entidade.telefone && entidade.telefone !== entidade.whatsapp && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {entidade.telefone}
              </p>
            )}
            {entidade.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {entidade.email}
              </p>
            )}
            {entidade.endereco && (
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>
                  {entidade.endereco.logradouro}, {entidade.endereco.numero}
                  {entidade.endereco.complemento
                    ? ` - ${entidade.endereco.complemento}`
                    : ""}
                  <br />
                  {entidade.endereco.bairro} — {entidade.endereco.cidade}/
                  {entidade.endereco.estado}
                </span>
              </p>
            )}
          </div>
        </Section>

        <Section title="Dados Eclesiasticos" icon={Church}>
          <div className="space-y-2 text-sm">
            {membro.rol && (
              <p>
                <span className="text-muted-foreground">Rol:</span> {membro.rol}
              </p>
            )}
            {membro.dataMembresia && (
              <p>
                <span className="text-muted-foreground">Membresia:</span>{" "}
                {formatDate(membro.dataMembresia)}
              </p>
            )}
            {membro.formaAdmissao && (
              <p>
                <span className="text-muted-foreground">Admissao:</span>{" "}
                {ADMISSAO_LABELS[membro.formaAdmissao] || membro.formaAdmissao}
              </p>
            )}
            {membro.dataBatismo && (
              <p>
                <span className="text-muted-foreground">Batismo:</span>{" "}
                {formatDate(membro.dataBatismo)}
              </p>
            )}
            {membro.dataConversao && (
              <p>
                <span className="text-muted-foreground">Conversao:</span>{" "}
                {formatDate(membro.dataConversao)}
              </p>
            )}
            {membro.igrejaProcedencia && (
              <p>
                <span className="text-muted-foreground">Procedencia:</span>{" "}
                {membro.igrejaProcedencia}
              </p>
            )}
            {perfil.pgs.length > 0 && (
              <div>
                <span className="text-muted-foreground">PG:</span>{" "}
                {perfil.pgs.map((pg) => pg.nome).join(", ")}
              </div>
            )}
            {perfil.funcoes.length > 0 && (
              <div>
                <span className="text-muted-foreground">Serve como:</span>{" "}
                {perfil.funcoes.join(", ")}
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Familia */}
      {(conjuge || (membro.filhos && membro.filhos.length > 0)) && (
        <Section title="Familia" icon={Heart}>
          <div className="space-y-2 text-sm">
            {conjuge && (
              <div>
                <p className="font-medium">
                  Conjuge: {conjuge.nome}
                </p>
                {conjuge.dataNascimento && (
                  <p className="text-muted-foreground text-xs">
                    Nascimento: {formatDate(conjuge.dataNascimento)}{" "}
                    {calcAge(conjuge.dataNascimento)}
                  </p>
                )}
                {conjuge.whatsapp && (
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {conjuge.whatsapp}
                  </p>
                )}
              </div>
            )}
            {membro.filhos && membro.filhos.length > 0 && (
              <div>
                <p className="font-medium mb-1">
                  Filhos ({membro.filhos.length}):
                </p>
                <ul className="space-y-1 ml-2">
                  {membro.filhos.map((f: any, i: number) => (
                    <li key={i} className="text-muted-foreground">
                      {f.nome}
                      {f.dataNascimento && (
                        <span>
                          {" — "}
                          {formatDate(f.dataNascimento)}{" "}
                          {calcAge(f.dataNascimento)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Visitas + Pedidos + Anotacoes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Visitas */}
        <Section
          title="Visitas Pastorais"
          icon={ClipboardList}
          count={perfil.totalVisitas}
        >
          {perfil.visitas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma visita</p>
          ) : (
            <ul className="space-y-2">
              {perfil.visitas.map((v: any) => (
                <li key={v._id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {formatDateLong(v.data)}
                    </span>
                    <Badge
                      className={`text-[10px] ${TIPO_VISITA_COLORS[v.tipo] || ""}`}
                    >
                      {v.tipo}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Por {v.visitanteNome}
                  </p>
                  {v.observacoes && (
                    <p className="text-xs mt-0.5">{v.observacoes}</p>
                  )}
                  <Separator className="mt-2" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Pedidos de Oracao */}
        <Section
          title="Pedidos de Oracao"
          icon={HandHeart}
          count={perfil.totalPedidos}
        >
          {perfil.pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido</p>
          ) : (
            <ul className="space-y-2">
              {perfil.pedidos.map((p: any) => (
                <li key={p._id} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1">{p.descricao}</p>
                    <Badge
                      className={`shrink-0 text-[10px] ${STATUS_PEDIDO_COLORS[p.status] || ""}`}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                  <Separator className="mt-2" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Anotacoes */}
        <Section
          title="Anotacoes Pastorais"
          icon={FileText}
          count={perfil.totalAnotacoes}
        >
          {perfil.anotacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma anotacao</p>
          ) : (
            <ul className="space-y-2">
              {perfil.anotacoes.map((a: any) => (
                <li key={a._id} className="text-sm">
                  <p className="whitespace-pre-wrap">{a.texto}</p>
                  <p className="text-xs text-muted-foreground">
                    Por {a.autorNome} —{" "}
                    {new Date(a.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                  <Separator className="mt-2" />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Escalas + Escutas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Onde serve */}
        <Section title="Escalas Recentes" icon={CalendarDays}>
          {perfil.escalas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma escala registrada
            </p>
          ) : (
            <ul className="space-y-1.5">
              {perfil.escalas.map((e: any, i: number) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{e.funcao}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateLong(e.cultoData)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Escutas */}
        <Section
          title="Gravacoes Escutadas"
          icon={Headphones}
          count={perfil.totalEscutas}
        >
          <p className="text-xs text-muted-foreground mb-2">
            {perfil.escutasCompletas} completas de {perfil.totalEscutas}
          </p>
          {perfil.escutas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma escuta</p>
          ) : (
            <ul className="space-y-1.5">
              {perfil.escutas.map((e: any, i: number) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="truncate flex-1">{e.titulo}</span>
                    <Badge
                      variant={e.completou ? "default" : "outline"}
                      className="ml-2 shrink-0 text-[10px]"
                    >
                      {e.completou ? "Completo" : `${e.progresso}%`}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
