"use client";

import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils/cn";

const ROLE_LABELS: Record<string, string> = {
  pastor: "Pastor",
  presbitero: "Presbitero",
  secretaria: "Secretaria",
  membro: "Membro",
};

const ROLE_COLORS: Record<string, string> = {
  pastor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  presbitero: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  secretaria: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  membro: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const VISIBLE_ROLES = ["membro", "secretaria", "presbitero", "pastor"];

type PermissionOption = {
  key: string;
  label: string;
  module: string;
  description: string;
};

type MembroWithPermissions = {
  _id: Id<"membros">;
  name: string;
  role: string;
  permissions: string[];
  hasCustomPermissions: boolean;
};

type GroupedPermissions = Record<string, PermissionOption[]>;

function groupPermissions(permissions: PermissionOption[] | undefined): GroupedPermissions {
  if (!permissions) return {};
  return permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as GroupedPermissions);
}

function MembroPermissionPopover({
  permission,
  membros,
  rolePermsMap,
  onToggle,
  getCheckboxState,
  isPending,
}: {
  permission: string;
  membros: MembroWithPermissions[];
  rolePermsMap: Map<string, Set<string>>;
  onToggle: (membroId: Id<"membros">, permission: string, hasIt: boolean) => void;
  getCheckboxState: (membroId: string, permission: string, realValue: boolean) => boolean;
  isPending: (membroId: string, permission: string) => boolean;
}) {
  const activeMembros = membros.filter((m) => m.role !== "admin");

  const membrosWithCustomPermission = activeMembros.filter((m) => {
    const hasPermission = m.permissions.includes(permission);
    const roleHasPermission = m.role ? rolePermsMap.get(m.role)?.has(permission) ?? false : false;
    return hasPermission !== roleHasPermission;
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex gap-1 flex-wrap cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 min-h-[24px] items-center">
          {membrosWithCustomPermission.length === 0 ? (
            <span className="text-muted-foreground text-xs">&mdash;</span>
          ) : membrosWithCustomPermission.length <= 2 ? (
            membrosWithCustomPermission.map((m) => {
              const hasIt = m.permissions.includes(permission);
              return (
                <Badge
                  key={m._id}
                  variant={hasIt ? "secondary" : "outline"}
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    !hasIt && "line-through text-muted-foreground"
                  )}
                >
                  {m.name?.split(" ")[0] ?? "?"}
                </Badge>
              );
            })
          ) : (
            <>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {membrosWithCustomPermission[0].name?.split(" ")[0] ?? "?"}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{membrosWithCustomPermission.length - 1}
              </Badge>
            </>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Membros</span>
          </div>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {activeMembros.map((m) => {
              const realHasPermission = m.permissions.includes(permission);
              const hasPermission = getCheckboxState(m._id, permission, realHasPermission);
              const isCheckboxPending = isPending(m._id, permission);
              return (
                <div
                  key={m._id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50",
                    isCheckboxPending && "opacity-50"
                  )}
                >
                  <Checkbox
                    checked={hasPermission}
                    onCheckedChange={(checked) =>
                      onToggle(m._id, permission, !!checked)
                    }
                    disabled={isCheckboxPending}
                  />
                  <span className="flex-1 text-sm truncate">{m.name}</span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5", ROLE_COLORS[m.role])}
                  >
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                </div>
              );
            })}
            {activeMembros.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-4">
                Nenhum membro ativo
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function PermissionMatrix() {
  const rolesWithPermissions = useQuery(api.preferencias.rbac.getAllRolesWithPermissions);
  const permissionOptions = useQuery(api.preferencias.rbac.getAllPermissionOptions);
  const membrosWithPermissions = useQuery(api.preferencias.rbac.getAllMembrosWithPermissions);
  const updateRolePermissions = useMutation(api.preferencias.rbac.updateRolePermissions);
  const setMembroPermission = useMutation(api.preferencias.rbac.setMembroPermission);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pendingToggles, setPendingToggles] = useState<Map<string, boolean>>(new Map());

  const rolePermsMap = useMemo(() => {
    if (!rolesWithPermissions) return new Map<string, Set<string>>();
    return new Map(
      rolesWithPermissions.map((r) => [r.role, new Set(r.permissions)])
    );
  }, [rolesWithPermissions]);

  const grouped = useMemo(
    () => groupPermissions(permissionOptions),
    [permissionOptions]
  );

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRoleToggle = async (role: string, permissionKey: string) => {
    const key = `role:${role}:${permissionKey}`;
    const currentPerms = rolePermsMap.get(role) ?? new Set();
    const wasChecked = currentPerms.has(permissionKey);
    const newValue = !wasChecked;

    setPendingToggles((prev) => new Map(prev).set(key, newValue));

    const roleData = rolesWithPermissions?.find((r) => r.role === role);
    if (!roleData) {
      setPendingToggles((prev) => { const n = new Map(prev); n.delete(key); return n; });
      return;
    }

    const newPermissions = wasChecked
      ? roleData.permissions.filter((p) => p !== permissionKey)
      : [...roleData.permissions, permissionKey];

    try {
      await updateRolePermissions({ role, permissions: newPermissions });
      toast.success("Permissao atualizada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar permissao");
    } finally {
      setPendingToggles((prev) => { const n = new Map(prev); n.delete(key); return n; });
    }
  };

  const handleMembroToggle = async (
    membroId: Id<"membros">,
    permission: string,
    hasIt: boolean
  ) => {
    const key = `membro:${membroId}:${permission}`;
    setPendingToggles((prev) => new Map(prev).set(key, hasIt));

    try {
      await setMembroPermission({ membroId, permission, hasPermission: hasIt });
      toast.success("Permissao atualizada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar permissao");
    } finally {
      setPendingToggles((prev) => { const n = new Map(prev); n.delete(key); return n; });
    }
  };

  const getRoleCheckboxState = (role: string, permissionKey: string): boolean => {
    const key = `role:${role}:${permissionKey}`;
    if (pendingToggles.has(key)) return pendingToggles.get(key)!;
    return rolePermsMap.get(role)?.has(permissionKey) ?? false;
  };

  const isRoleCheckboxPending = (role: string, permissionKey: string): boolean => {
    return pendingToggles.has(`role:${role}:${permissionKey}`);
  };

  const getMembroCheckboxState = (membroId: string, permission: string, realValue: boolean): boolean => {
    const key = `membro:${membroId}:${permission}`;
    if (pendingToggles.has(key)) return pendingToggles.get(key)!;
    return realValue;
  };

  const isMembroCheckboxPending = (membroId: string, permission: string): boolean => {
    return pendingToggles.has(`membro:${membroId}:${permission}`);
  };

  if (!rolesWithPermissions || !permissionOptions || !membrosWithPermissions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const moduleEntries = Object.entries(grouped);

  return (
    <TooltipProvider>
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[200px]">
                Permissao
              </TableHead>
              {VISIBLE_ROLES.map((role) => (
                <TableHead key={role} className="text-center w-24 px-2">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] px-1.5", ROLE_COLORS[role])}
                  >
                    {ROLE_LABELS[role]}
                  </Badge>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-[120px] px-2">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">Personalizado</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moduleEntries.map(([module, perms]) => {
              const isCollapsed = collapsed.has(module);

              return (
                <Fragment key={`module-${module}`}>
                  <TableRow
                    className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleCollapse(module)}
                  >
                    <TableCell
                      colSpan={VISIBLE_ROLES.length + 2}
                      className="sticky left-0 bg-muted/30 hover:bg-muted/50 font-bold"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="uppercase tracking-wide text-sm">
                          {module}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {!isCollapsed &&
                    perms.map((perm) => (
                      <TableRow key={perm.key} className="hover:bg-muted/20">
                        <TableCell className="sticky left-0 bg-background pl-8">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{perm.label}</span>
                            {perm.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  {perm.description}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        {VISIBLE_ROLES.map((role) => {
                          const isChecked = getRoleCheckboxState(role, perm.key);
                          const pending = isRoleCheckboxPending(role, perm.key);
                          return (
                            <TableCell key={`${perm.key}-${role}`} className="text-center">
                              <div className={cn(pending && "opacity-50")}>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleRoleToggle(role, perm.key)}
                                  disabled={pending}
                                />
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="px-2">
                          <MembroPermissionPopover
                            permission={perm.key}
                            membros={membrosWithPermissions}
                            rolePermsMap={rolePermsMap}
                            onToggle={handleMembroToggle}
                            getCheckboxState={getMembroCheckboxState}
                            isPending={isMembroCheckboxPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
