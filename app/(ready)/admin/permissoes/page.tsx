"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { AdminGate } from "@shared/components/auth/RoleGate";
import { PermissionMatrix } from "@features/preferencias/components/PermissionMatrix";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { toast } from "sonner";
import { Input } from "@/shared/components/ui/input";
import { Copy, Link as LinkIcon, Users, Settings, UserPlus, Search, Eye, MonitorSmartphone } from "lucide-react";
import { Switch } from "@/shared/components/ui/switch";
import type { Id } from "@/convex/_generated/dataModel";
import type { Role } from "@/types/auth";

const AVAILABLE_ROLES = ["membro", "obreiro", "secretaria", "presbitero", "pastor", "admin"] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  pastor: "Pastor",
  presbitero: "Presbitero",
  obreiro: "Obreiro",
  secretaria: "Secretaria",
  membro: "Membro",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  pastor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  presbitero: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  obreiro: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  secretaria: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  membro: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function MembrosTab() {
  // @ts-ignore Convex TS2589
  const membros = useQuery(api.preferencias.rbac.getAllMembrosWithPermissions);
  const volunteerSets = useQuery(api.preferencias.rbac.getVolunteerPermissionSets);
  const updateRole = useMutation(api.preferencias.rbac.updateMembroRole);
  const setPermission = useMutation(api.preferencias.rbac.setMembroPermission);
  const syncWithRole = useMutation(api.preferencias.rbac.syncMembroWithRole);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!membros) return undefined;
    return membros
      .filter((m: any) => {
        if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [membros, search]);

  if (!membros) return <Skeleton className="h-64" />;

  const handleRoleChange = async (membroId: string, role: string) => {
    try {
      await updateRole({ membroId: membroId as Id<"membros">, role });
      toast.success(`Papel atualizado para ${ROLE_LABELS[role]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleTogglePermission = async (membroId: string, permission: string, grant: boolean) => {
    try {
      await setPermission({ membroId: membroId as Id<"membros">, permission, hasPermission: grant });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {filtered && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum membro encontrado</p>
      ) : (
      <div className="border rounded-md divide-y">
        {(filtered || []).map((m: any) => {
          const isAdmin = m.role === "admin";
          return (
            <div key={m._id} className="flex items-center gap-3 p-3">
              {/* Nome */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                {m.hasCustomPermissions && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[10px] h-4">personalizado</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-4 px-1"
                      onClick={async () => {
                        await syncWithRole({ membroId: m._id as Id<"membros"> });
                        toast.success("Resetado para padrao do papel");
                      }}
                    >
                      resetar
                    </Button>
                  </div>
                )}
              </div>

              {/* Role */}
              {isAdmin ? (
                <Badge className={ROLE_COLORS.admin}>Admin</Badge>
              ) : (
                <Select
                  value={m.role}
                  onValueChange={(v) => handleRoleChange(m._id, v)}
                >
                  <SelectTrigger className="w-[120px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Voluntário badges com popover */}
              {!isAdmin && volunteerSets && (
                <div className="hidden md:flex flex-wrap gap-0.5">
                  {volunteerSets.map((vs: any) => {
                    const permsInSet = vs.permissions as string[];
                    const activeCount = permsInSet.filter((p: string) => m.permissions.includes(p)).length;
                    const hasAny = activeCount > 0;
                    const hasAll = activeCount === permsInSet.length;
                    const shortLabel = vs.label
                      .replace("Voluntario ", "")
                      .replace("Lider ", "L.")
                      .replace("Facilitador ", "F.")
                      .replace("Organizador ", "O.");
                    return (
                      <Popover key={vs.key}>
                        <PopoverTrigger asChild>
                          <Badge
                            variant={hasAll ? "default" : hasAny ? "secondary" : "outline"}
                            className="text-[10px] cursor-pointer"
                          >
                            {shortLabel}
                            {hasAny && !hasAll && ` (${activeCount}/${permsInSet.length})`}
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="end">
                          <p className="text-xs font-medium mb-2">{vs.label}</p>
                          <div className="space-y-1.5">
                            {permsInSet.map((perm: string) => {
                              const checked = m.permissions.includes(perm);
                              return (
                                <label
                                  key={perm}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) =>
                                      handleTogglePermission(m._id, perm, !!v)
                                    }
                                  />
                                  <span className="text-xs">{perm}</span>
                                </label>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function ConvitesTab() {
  const generateInvite = useMutation(api.membros.convites.generateInvite);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleGenerateInvite = async (role?: string) => {
    try {
      const token = await generateInvite({ role });
      const link = `${window.location.origin}/convite/${token}`;
      setInviteLink(link);
      toast.success("Convite gerado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar convite");
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Link copiado!");
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-lg">Gerar Convite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Para novos membros que nao tem cadastro. Membros ja cadastrados com WhatsApp sao vinculados automaticamente no login.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => handleGenerateInvite("membro")}>Convite Membro</Button>
          <Button variant="outline" onClick={() => handleGenerateInvite("secretaria")}>Convite Secretaria</Button>
        </div>
        {inviteLink && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <LinkIcon className="h-4 w-4 shrink-0" />
            <code className="text-xs flex-1 truncate">{inviteLink}</code>
            <Button variant="ghost" size="icon" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModoTab() {
  // @ts-ignore Convex TS2589
  const config = useQuery(api.appConfig.queries.get);
  const setModoQuiosque = useMutation(api.appConfig.mutations.setModoQuiosque);

  const ativo = !!config?.modoQuiosque;

  const handleToggle = async (proximoValor: boolean) => {
    try {
      await setModoQuiosque({ ativo: proximoValor });
      toast.success(
        proximoValor
          ? "Modo quiosque ativado — usuarios nao-admin so verao os sermoes"
          : "Modo quiosque desativado",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar modo");
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Modo Quiosque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Quando ativado, todos os usuarios <strong>exceto admin</strong> veem
          apenas a tela de sermoes — sem sidebar, sem outras paginas. Util para
          terminais publicos da igreja ou para limitar o acesso a um experimento
          minimalista.
        </p>
        <div className="flex items-center gap-3 rounded-md border p-3">
          <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Limitar usuarios a tela de sermoes</p>
            <p className="text-xs text-muted-foreground">
              Admin continua com acesso completo
            </p>
          </div>
          <Switch
            checked={ativo}
            onCheckedChange={handleToggle}
            disabled={config === undefined}
            aria-label="Ativar modo quiosque"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SimularSelect() {
  const { impersonate } = useAuth();
  return (
    <Select onValueChange={(v) => impersonate(v as Role)}>
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          <SelectValue placeholder="Simular como..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_ROLES.filter((r) => r !== "admin").map((r) => (
          <SelectItem key={r} value={r} className="text-xs">
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function PermissoesPage() {
  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito a administradores</p>}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl font-bold">Permissoes</h1>
          <SimularSelect />
        </div>

        <Tabs defaultValue="membros">
          <TabsList className="w-full grid grid-cols-3 sm:inline-flex sm:w-auto">
            <TabsTrigger value="membros" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Membros
            </TabsTrigger>
            <TabsTrigger value="papeis" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Configurar </span>Papeis
            </TabsTrigger>
            <TabsTrigger value="convites" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Convites
            </TabsTrigger>
            <TabsTrigger value="modo" className="gap-1.5">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              Modo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="membros" className="mt-4">
            <MembrosTab />
          </TabsContent>

          <TabsContent value="papeis" className="mt-4">
            <PermissionMatrix />
          </TabsContent>

          <TabsContent value="convites" className="mt-4">
            <ConvitesTab />
          </TabsContent>

          <TabsContent value="modo" className="mt-4">
            <ModoTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  );
}
