import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { createHash } from "node:crypto";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Recebe a submissão do formulário público do acampamento. Mesmo padrão do
 * /api/inscricoes/responder: captura o IP server-side e envia só o hash com
 * segredo; propaga o token de auth p/ a mutation resolver o membroId.
 */
export async function POST(req: NextRequest) {
  // Tipagem estrutural do payload; a validacao de verdade acontece nos
  // validators da mutation Convex (argumento invalido -> 400 no catch).
  let body: {
    slug?: string;
    responsavel?: { nome: string; whatsapp: string };
    participantes?: { nome: string; dataNascimento: string; participaPalestras: boolean; membroId?: string }[];
    hospedagem?: { quartosDuplos: number; quartosTriplos: number; camasExtras: number; pets: number };
    extras?: { colegaDeQuarto?: string; berco?: boolean; necessidadesEspeciais?: string; observacao?: string };
    pagamentoPreferido?: { forma: "A_VISTA" | "PARCELADO"; parcelas?: number; cpfPagante?: string };
    lgpdConsentimento?: boolean;
    website?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }

  if (!body?.slug) {
    return NextResponse.json({ ok: false, error: "Acampamento não informado" }, { status: 400 });
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
    const result = await client.mutation(api.public.acampamento.responder, {
      slug: body.slug!,
      responsavel: body.responsavel!,
      // membroId é apenas hint; a mutation revalida contra a família do usuário
      participantes: (body.participantes ?? []).map((p) => ({
        ...p,
        membroId: p.membroId as Id<"membros"> | undefined,
      })),
      hospedagem: body.hospedagem!,
      extras: body.extras,
      pagamentoPreferido: body.pagamentoPreferido!,
      lgpdConsentimento: Boolean(body.lgpdConsentimento),
      website: typeof body.website === "string" ? body.website : undefined,
      ipHash,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro ao enviar inscrição";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}
