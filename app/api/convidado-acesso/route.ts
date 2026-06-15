import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Registra um acesso ao link de convidado, capturando o IP real do visitante
 * (server-side, via x-forwarded-for do Vercel). A pagina /convidado chama este
 * endpoint no carregamento. O registro so persiste se o codigo for valido.
 */
export async function POST(req: NextRequest) {
  let codigo: string | undefined;
  try {
    ({ codigo } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!codigo) return NextResponse.json({ ok: false }, { status: 400 });

  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await client.mutation(api.convidado.registrarAcesso, { codigo, ip, userAgent });
  } catch {
    // Falha no registro nao deve quebrar o acesso do visitante
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
