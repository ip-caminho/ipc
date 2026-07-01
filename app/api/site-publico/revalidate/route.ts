import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

// Revalidação on-demand das páginas públicas após edição no painel.
// As páginas do site usam ISR (Full Route Cache) + unstable_cache (Data Cache),
// ambos com janela de 5–15 min. Sem isto, uma edição só apareceria no próximo
// ciclo de cache — daí a sensação de "salvei e o site não mudou".
// Cada alvo invalida a(s) tag(s) do Data Cache + as rotas afetadas.
const TARGETS: Record<string, { tags: string[]; paths: string[] }> = {
  agenda: { tags: ["public-agenda"], paths: ["/agenda", "/"] },
  informacoes: { tags: ["public-igreja-info"], paths: ["/visite", "/"] },
  textos: { tags: ["public-site-textos"], paths: ["/"] },
  avisos: { tags: ["public-avisos-ultimo-culto"], paths: ["/"] },
  inscricoes: { tags: ["public-inscricoes-ativas"], paths: ["/inscricoes", "/"] },
};

export async function POST(req: NextRequest) {
  // Só usuário autenticado dispara (evita abuso do custo de revalidação).
  const token = await convexAuthNextjsToken();
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { target?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }

  const alvo = body?.target ? TARGETS[body.target] : undefined;
  if (!alvo) {
    return NextResponse.json({ ok: false, error: "Alvo inválido" }, { status: 400 });
  }

  // "max" = invalidação imediata da tag (substituto recomendado pelo Next 16
  // para o revalidateTag de 1 argumento, agora depreciado). Invalida o Data
  // Cache (unstable_cache); revalidatePath invalida o Full Route Cache da rota.
  for (const tag of alvo.tags) revalidateTag(tag, "max");
  for (const path of alvo.paths) revalidatePath(path);

  return NextResponse.json({ ok: true });
}
