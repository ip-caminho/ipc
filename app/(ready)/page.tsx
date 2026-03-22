"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Church, Cake, HandHeart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { AvisosWidget } from "@features/gravacoes/components/AvisosWidget";
import { FrasesCarrossel } from "@features/gravacoes/components/FrasesCarrossel";
import { EducacionalPaisWidget } from "@features/educacional/components/EducacionalPaisWidget";
import { MinhaEscalaWidget } from "@features/escalas/components/MinhaEscalaWidget";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";
import Link from "next/link";

function formatWhatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

function BootstrapForm() {
  // @ts-ignore Convex TS2589
  const bootstrap = useMutation(api.membros.bootstrap.bootstrapAdmin);
  const relinkAdmin = useMutation(api.debug.relinkAdmin);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await bootstrap({
        nomeCompleto: formData.get("nomeCompleto") as string,
        whatsapp: (formData.get("whatsapp") as string) || undefined,
      });
      toast.success("Admin criado! Recarregando...");
      // Force page reload to pick up new permissions
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar admin"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Church className="h-10 w-10" />
          </div>
          <CardTitle>Configuracao Inicial</CardTitle>
          <CardDescription>
            Crie o primeiro administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nomeCompleto">Seu Nome Completo *</Label>
              <Input id="nomeCompleto" name="nomeCompleto" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                placeholder="11999991111"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Criando..." : "Criar Admin e Entrar"}
            </Button>
          </form>
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await relinkAdmin({});
                  toast.success("Admin religado! Recarregando...");
                  window.location.reload();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Erro");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Ja sou admin (religar sessao)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated } = useConvexAuth();
  const { name, isLoading, role, can } = useAuth();
  const meusPedidos = useQuery(
    api.pastoreio.queries.listPedidosOracao,
    can("pedidos_oracao:read") ? { status: "ATIVO" } : "skip"
  );
  const aniversariantesMes = useQuery(api.membros.queries.birthdaysThisMonth, {});

  // If authenticated but no membro linked (role is null), show bootstrap form
  if (!isLoading && isAuthenticated && !role) {
    return <BootstrapForm />;
  }

  const primeiroNome = name?.split(" ")[0] || "Usuario";
  const dataHoje = format(new Date(), "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Saudacao */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-medium text-foreground">
          Bem-vindo, {primeiroNome}
        </h1>
        <span className="text-sm text-muted-foreground">&middot; {dataHoje}</span>
      </div>

      {/* Grid principal: Avisos + Aniversariantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AvisosWidget />

        {/* Aniversariantes do mes */}
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cake size={13} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Aniversariantes do mes</span>
            </div>
            {aniversariantesMes && aniversariantesMes.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {aniversariantesMes.length} este mes
              </span>
            )}
          </div>
          {!aniversariantesMes ? (
            <p className="text-xs text-muted-foreground py-2">Carregando...</p>
          ) : aniversariantesMes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhum aniversariante este mes.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {aniversariantesMes.map((a: any) => {
                const nome = a.entidade?.apelido || a.entidade?.nomeCompleto;
                return (
                  <div key={a._id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {a.entidade?.foto && <AvatarImage src={a.entidade.foto} />}
                        <AvatarFallback className="text-xs">
                          {nome?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.entidade?.dataNascimento
                            ? format(parseISO(a.entidade.dataNascimento), "dd 'de' MMMM", { locale: ptBR })
                            : ""}
                        </p>
                      </div>
                    </div>
                    {a.entidade?.whatsapp && (
                      <a
                        href={formatWhatsappLink(a.entidade.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 flex-shrink-0"
                      >
                        Enviar mensagem
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Citacao do sermao */}
      <FrasesCarrossel />

      {/* Grid secundario: Pedidos + Escala + Educacional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pedidos de Oracao */}
        {can("pedidos_oracao:read") && (
          <div className="bg-background border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HandHeart size={13} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Pedidos de Oracao</span>
              </div>
              {meusPedidos && meusPedidos.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  {meusPedidos.length} ativo{meusPedidos.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {!meusPedidos ? (
              <p className="text-xs text-muted-foreground py-2">Carregando...</p>
            ) : meusPedidos.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum pedido ativo</p>
            ) : (
              <div>
                {meusPedidos.slice(0, 3).map((p: any) => (
                  <div key={p._id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-foreground line-clamp-1">{p.descricao}</span>
                  </div>
                ))}
                <Link
                  href="/pedidos-oracao"
                  className="text-xs text-muted-foreground underline underline-offset-2 mt-2 block transition-colors duration-150 hover:text-foreground"
                >
                  Ver todos
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Minha Escala */}
        <MinhaEscalaWidget />
      </div>

      {/* Educacional (pais) */}
      <EducacionalPaisWidget />
    </div>
  );
}
