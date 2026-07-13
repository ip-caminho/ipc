import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Purga diária do cache das páginas públicas relativas à data.
// As listas de agenda/avisos são filtradas por "hoje" (fuso SP) no backend e
// cacheadas (ISR + Data Cache, 5–15 min). Num site de baixo tráfego o cache não
// refresca sozinho na virada do dia: na madrugada ninguém dispara a regeneração,
// então o primeiro visitante da manhã vê a agenda de ontem (evento já passado).
// Este cron (00:05 SP) força o purge, garantindo agenda correta no começo do dia.
//
// Acionado por Vercel Cron (GET), autenticado pelo header
// `Authorization: Bearer <CRON_SECRET>` que a Vercel injeta automaticamente
// quando a env var CRON_SECRET está definida no projeto.

// Tags de Data Cache cujo conteúdo depende de "hoje" (agenda/avisos) ou de
// janelas de abertura/fechamento (retiros — inscricoesAbrem/Fecham).
const TAGS = ["public-agenda", "public-avisos-ultimo-culto", "public-retiros"];
const PATHS = ["/", "/agenda", "/inscricoes"];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  for (const tag of TAGS) revalidateTag(tag, "max");
  for (const path of PATHS) revalidatePath(path);

  return NextResponse.json({ ok: true, revalidated: TAGS });
}
