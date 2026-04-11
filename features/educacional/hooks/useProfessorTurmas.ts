"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";

export function useProfessorTurmas() {
  const { membroId } = useAuth();
  // @ts-ignore Convex TS2589
  const ministerios = useQuery(api.ministerios.queries.list, {});
  const eduMinisterio = useMemo(
    () =>
      ministerios?.find((m: any) =>
        m.nome.toLowerCase().includes("educacional")
      ) ?? null,
    [ministerios]
  );

  const escalas = useQuery(
    // @ts-ignore Convex TS2589
    api.educacional.queries.listEscalas,
    eduMinisterio ? { ministerioId: eduMinisterio._id } : "skip"
  );

  const turmas = useMemo<string[]>(() => {
    if (!membroId || !escalas) return [];
    const hoje = new Date().toISOString().slice(0, 10);
    const futuras = escalas.filter((e: any) => e.data >= hoje);
    const minhas = futuras.filter((e: any) =>
      e.membros?.some(
        (m: any) => m.membroId === membroId && m.papel === "Professor"
      )
    );
    const subgrupos = minhas
      .map((e: any) => e.subgrupo)
      .filter((s: any): s is string => typeof s === "string" && s.length > 0);
    return [...new Set(subgrupos)];
  }, [membroId, escalas]);

  const isLoading =
    ministerios === undefined ||
    (eduMinisterio && escalas === undefined);

  return {
    turmas,
    isLoading: !!isLoading,
    hasEduMinisterio: !!eduMinisterio,
  };
}
