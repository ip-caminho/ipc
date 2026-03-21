import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useFuncoes() {
  // @ts-ignore Convex TS2589
  const funcoes = useQuery(api.escalas.funcoes.list);
  return funcoes;
}

export function useFuncoesAll() {
  // @ts-ignore Convex TS2589
  const funcoes = useQuery(api.escalas.funcoes.listAll);
  return funcoes;
}
