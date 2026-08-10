"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import type { NavItem } from "@shared/constants/navigation";

/**
 * Regra unica de visibilidade de item de menu, usada pelo sidebar (desktop) e
 * pelo MoreSheet (mobile). Estava duplicada nos dois: com a visibilidade por
 * vinculo entrando, a divergencia significaria o item aparecer no celular para
 * quem nao deveria ve-lo.
 */
export function useNavItemVisible() {
  const { can, hasAnyRole } = useAuth();
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);
  // Turmas em que o usuario e instrutor — a mesma leitura do card do dashboard.
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const turmasComoInstrutor = useQuery(api.turmas.instrutor.minhasTurmas, {});

  return (item: NavItem): boolean => {
    if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) return false;
    if (item.permission && !can(item.permission)) return false;
    if (item.roles && !hasAnyRole(item.roles)) return false;
    if (item.vinculo === "instrutor" && !(turmasComoInstrutor ?? []).length) return false;
    return true;
  };
}
