"use client";

import { useCallback, useEffect, useReducer } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { criarTreino, IDS_LICAO, reduzirTreino } from "../lib/licoes";
import type { AcaoMesa } from "../lib/simulador";

const CHAVE_FEITAS = "mesa-som-feitas";
const ESPERA_CERTO_MS = 520;
const ESPERA_BOOT_MS = 2500;
const PARSER_LICAO = parseAsStringLiteral(IDS_LICAO).withDefault(IDS_LICAO[0]);

function lerFeitas(): string[] {
  try {
    const lidas: unknown = JSON.parse(localStorage.getItem(CHAVE_FEITAS) ?? "[]");
    return Array.isArray(lidas) ? lidas.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useTreino() {
  const [licaoId, setLicaoId] = useQueryState("licao", PARSER_LICAO);
  const [treino, despachar] = useReducer(reduzirTreino, licaoId, (id) => criarTreino(id, 0, []));

  const agir = useCallback((acao: AcaoMesa) => despachar({ tipo: "mesa", acao, agora: Date.now() }), []);
  const recomecar = useCallback(() => despachar({ tipo: "abrir", id: treino.licaoId, agora: Date.now() }), [treino.licaoId]);
  const pular = useCallback(() => despachar({ tipo: "pular" }), []);

  // A URL só é lida ao abrir a página; depois ela apenas acompanha a lição aberta
  const abrirLicao = useCallback((id: string) => {
    despachar({ tipo: "abrir", id, agora: Date.now() });
    void setLicaoId(id);
  }, [setLicaoId]);

  useEffect(() => {
    despachar({ tipo: "feitas", ids: lerFeitas() });
  }, []);
  useEffect(() => {
    if (!treino.feitas.length) return;
    try {
      localStorage.setItem(CHAVE_FEITAS, JSON.stringify(treino.feitas));
    } catch {
      // Sem armazenamento, o progresso vale só até fechar a página
    }
  }, [treino.feitas]);

  // Mostra "Certo." por um instante antes de passar ao próximo passo
  const { aguardando, passo } = treino;
  useEffect(() => {
    if (!aguardando) return;
    const id = setTimeout(() => despachar({ tipo: "avancar" }), ESPERA_CERTO_MS);
    return () => clearTimeout(id);
    // `passo` também: o passo seguinte pode já nascer cumprido, e `aguardando` nem chega a mudar
  }, [aguardando, passo]);

  const { boot } = treino.s;
  useEffect(() => {
    if (!boot) return;
    const id = setTimeout(() => agir({ tipo: "fimBoot" }), ESPERA_BOOT_MS);
    return () => clearTimeout(id);
  }, [boot, agir]);

  return { treino, agir, recomecar, pular, abrirLicao };
}
