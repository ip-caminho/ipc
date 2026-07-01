// Client helper: pede ao route handler para revalidar as páginas públicas
// afetadas após uma edição no painel, contornando o cache ISR/Data Cache.
// Best-effort: se falhar, o cache expira sozinho em 5–15 min.
export type RevalidarTarget =
  | "agenda"
  | "informacoes"
  | "textos"
  | "avisos"
  | "inscricoes";

export async function revalidarSite(target: RevalidarTarget): Promise<void> {
  try {
    await fetch("/api/site-publico/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
  } catch {
    // silencioso
  }
}
