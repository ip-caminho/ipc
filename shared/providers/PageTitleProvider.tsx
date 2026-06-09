"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Ctx = { title: string | null; setTitle: (t: string | null) => void };

const PageTitleContext = createContext<Ctx>({ title: null, setTitle: () => {} });

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitleState] = useState<string | null>(null);
  const setTitle = useCallback((t: string | null) => setTitleState(t), []);
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

/** Le o titulo da pagina atual (para o header global). */
export function usePageTitle(): string | null {
  return useContext(PageTitleContext).title;
}

/**
 * Registra o titulo da pagina atual no contexto (consumido pelo header mobile).
 * Limpa ao desmontar.
 */
export function useSetPageTitle(title: string | null) {
  const { setTitle } = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}
