"use client";

import { useQueryState, parseAsStringLiteral } from "nuqs";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Building2, CalendarDays, Megaphone, Users, Type, ExternalLink } from "lucide-react";
import { InformacoesPanel } from "@features/site-publico/components/paineis/InformacoesPanel";
import { AgendaPanel } from "@features/site-publico/components/paineis/AgendaPanel";
import { AvisosPanel } from "@features/site-publico/components/paineis/AvisosPanel";
import { InscricoesPanel } from "@features/site-publico/components/paineis/InscricoesPanel";
import { TextosPanel } from "@features/site-publico/components/paineis/TextosPanel";

// Hub de manutenção do site público. Uma página com abas — cada seção edita a
// fonte certa inline, sem navegar. Visibilidade por `site_publico:manage`.
const SECOES = [
  { key: "informacoes", label: "Informações", icon: Building2, Panel: InformacoesPanel },
  { key: "agenda", label: "Agenda", icon: CalendarDays, Panel: AgendaPanel },
  { key: "avisos", label: "Avisos", icon: Megaphone, Panel: AvisosPanel },
  { key: "inscricoes", label: "Inscrições", icon: Users, Panel: InscricoesPanel },
  { key: "textos", label: "Textos", icon: Type, Panel: TextosPanel },
] as const;

const SECAO_KEYS = SECOES.map((s) => s.key);

function SitePublicoHub() {
  const [secao, setSecao] = useQueryState(
    "secao",
    parseAsStringLiteral(SECAO_KEYS).withDefault("informacoes"),
  );

  return (
    <HeaderLayout>
      <PageHeader title="Site público" />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Tudo que aparece no site da igreja é mantido aqui. Ao salvar, o site reflete
            a mudança em segundos.
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> Ver o site
          </a>
        </div>

        <Tabs value={secao} onValueChange={(v) => setSecao(v as (typeof SECAO_KEYS)[number])}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:w-auto">
            {SECOES.map((s) => (
              <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
                <s.icon className="h-4 w-4" />
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SECOES.map(({ key, Panel }) => (
            <TabsContent key={key} value={key} className="mt-4">
              <Panel />
            </TabsContent>
          ))}
        </Tabs>
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
