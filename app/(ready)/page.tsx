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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Bem-vindo, {name || "Usuario"}!
        </h1>
      </div>

      {/* Avisos + Aniversariantes lado a lado */}
      <div className="grid gap-6 md:grid-cols-2">
        <AvisosWidget />

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Cake className="h-4 w-4" />
                Aniversariantes do mes
              </CardTitle>
              {aniversariantesMes && aniversariantesMes.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {aniversariantesMes.length}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Clique no <MessageCircle className="h-3 w-3 inline text-green-600" /> para enviar uma mensagem
            </p>
          </CardHeader>
          <CardContent>
            {!aniversariantesMes ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : aniversariantesMes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aniversariante este mes</p>
            ) : (
              <ul className="space-y-3">
                {aniversariantesMes.map((a: any) => {
                  const nome = a.entidade?.apelido || a.entidade?.nomeCompleto;
                  return (
                    <li key={a._id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {a.entidade?.foto && <AvatarImage src={a.entidade.foto} />}
                        <AvatarFallback className="text-sm">
                          {nome?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{nome}</span>
                          {a.entidade?.whatsapp && (
                            <a
                              href={formatWhatsappLink(a.entidade.whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 transition-colors shrink-0"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {a.entidade?.dataNascimento
                            ? format(parseISO(a.entidade.dataNascimento), "dd 'de' MMMM", { locale: ptBR })
                            : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meus Pedidos de Oracao */}
      {can("pedidos_oracao:read") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HandHeart className="h-4 w-4" />
              Meus Pedidos de Oracao
            </CardTitle>
            {meusPedidos && meusPedidos.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {meusPedidos.length} ativo{meusPedidos.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {!meusPedidos ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : meusPedidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pedido ativo
              </p>
            ) : (
              <ul className="space-y-2">
                {meusPedidos.slice(0, 3).map((p: any) => (
                  <li key={p._id} className="text-sm">
                    {p.descricao}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="link" className="px-0 mt-2" asChild>
              <Link href="/pedidos-oracao">Ver todos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Widget educacional para pais */}
      <EducacionalPaisWidget />

      {/* Frases dos sermoes */}
      <FrasesCarrossel />
    </div>
  );
}
