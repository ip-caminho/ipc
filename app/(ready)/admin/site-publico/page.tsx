"use client";

import Link from "next/link";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Building2, CalendarDays, Megaphone, Users, Type, ExternalLink, ArrowRight } from "lucide-react";

// Hub de manutenção do site público. Cada card leva à edição da fonte certa;
// a visibilidade é controlada por `site_publico:manage` (papel comunicacao etc.).
const SECOES = [
  {
    href: "/admin/site-publico/informacoes",
    icon: Building2,
    titulo: "Informações",
    descricao: "Contato, endereço, horários e dados de ofertas — aparece no rodapé e na página Visite.",
  },
  {
    href: "/admin/site-publico/agenda",
    icon: CalendarDays,
    titulo: "Agenda",
    descricao: "Eventos, PGs e reuniões da agenda pública. O culto de domingo aparece automaticamente.",
  },
  {
    href: "/admin/site-publico/avisos",
    icon: Megaphone,
    titulo: "Avisos da semana",
    descricao: "Revise os avisos do último culto que aparecem em “Esta semana” na home.",
  },
  {
    href: "/admin/site-publico/inscricoes",
    icon: Users,
    titulo: "Inscrições",
    descricao: "Crie e gerencie formulários de inscrição (retiros, cursos, eventos).",
  },
  {
    href: "/admin/site-publico/textos",
    icon: Type,
    titulo: "Textos",
    descricao: "Título e subtítulo do topo da home.",
  },
];

function SitePublicoHub() {
  return (
    <HeaderLayout>
      <PageHeader title="Site público" />
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tudo que aparece no site da igreja é mantido aqui. Edite e as mudanças
          refletem no site automaticamente.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECOES.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{s.titulo}</h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.descricao}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="pt-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Ver o site
          </a>
        </div>
      </div>
    </HeaderLayout>
  );
}

export default function SitePublicoHubPage() {
  return (
    <PermissionGate
      permission="site_publico:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <SitePublicoHub />
    </PermissionGate>
  );
}
