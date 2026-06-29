import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { createHash } from "node:crypto";
import { api } from "@/convex/_generated/api";

/**
 * Recebe a submissão do formulário público de inscrição.
 * Captura o IP real do visitante (x-forwarded-for, server-side) e o transforma
 * num hash com segredo — o IP cru nunca chega ao Convex. Propaga o token de
 * auth (se o inscrito logou) para que a mutation resolva o membroId.
 */
export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    dadosSistema?: Record<string, string>;
    dadosCustom?: Record<string, unknown>;
    lgpdConsentimento?: boolean;
    website?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }

  if (!body?.slug) {
    return NextResponse.json({ ok: false, error: "Inscrição não informada" }, { status: 400 });
  }

  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "0.0.0.0";
  const salt = process.env.INSCRICOES_IP_SALT || "ipc-dev-salt";
  const ipHash = createHash("sha256").update(`${ip}${salt}`).digest("hex");

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return NextResponse.json({ ok: false, error: "Serviço indisponível" }, { status: 503 });
  }

  try {
    const client = new ConvexHttpClient(url);
    const token = await convexAuthNextjsToken();
    if (token) client.setAuth(token);

    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    const result = await client.mutation(api.public.inscricoesEvento.responder, {
      slug: body.slug,
      dadosSistema: body.dadosSistema,
      dadosCustom: body.dadosCustom ?? {},
      lgpdConsentimento: Boolean(body.lgpdConsentimento),
      website: typeof body.website === "string" ? body.website : undefined,
      ipHash,
    });

    return NextResponse.json({ ok: true, status: result.status });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro ao enviar inscrição";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}
