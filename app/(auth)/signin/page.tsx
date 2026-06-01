"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { loginIdFromPhone } from "@shared/lib/acesso";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Church } from "lucide-react";

function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, "");
  if (!p.startsWith("+")) p = "+55" + p;
  return p;
}

export default function SignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // modo whatsapp (mantido como opcao secundaria)
  const [waStep, setWaStep] = useState<null | "phone" | { phone: string }>(null);

  const bypassMode = process.env.NEXT_PUBLIC_AUTH_BYPASS_MODE === "true";
  const logLogin = useMutation(api.audit.mutations.logLogin);
  const verificarAcessoDireto = useMutation(api.membros.acesso.verificarAcessoDireto);

  // ----- Bypass dev: login direto por telefone -----
  async function handleBypass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const phone = normalizePhone(new FormData(e.currentTarget).get("phone") as string);
    try {
      const email = `${phone}@bypass.local`;
      try {
        await signIn("password", { flow: "signIn", email, password: phone });
      } catch {
        await signIn("password", { flow: "signUp", email, password: phone });
      }
      try {
        await logLogin({ method: "bypass" });
      } catch {
        /* silent */
      }
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setLoading(false);
    }
  }

  // ----- Login com senha (re-login) -----
  async function handleSenha(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const phone = normalizePhone(fd.get("phone") as string);
    const password = fd.get("password") as string;
    try {
      await signIn("password", { flow: "signIn", email: loginIdFromPhone(phone), password });
      try {
        await logLogin({ method: "password" });
      } catch {
        /* silent */
      }
      setTimeout(() => router.push("/dashboard"), 500);
    } catch {
      setError("Telefone ou senha incorretos");
      setLoading(false);
    }
  }

  // ----- Primeiro acesso: telefone + 5 digitos do CPF -----
  async function handlePrimeiroAcesso(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const telefone = fd.get("phone") as string;
    const cpfPrefix = (fd.get("cpf") as string).replace(/\D/g, "");
    try {
      const { token } = await verificarAcessoDireto({ telefone, cpfPrefix });
      router.push(`/ativar/${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel verificar");
      setLoading(false);
    }
  }

  // ----- WhatsApp OTP (secundario) -----
  async function handleWaPhone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const phone = normalizePhone(new FormData(e.currentTarget).get("phone") as string);
    try {
      const fd = new FormData();
      fd.set("phone", phone);
      try {
        await signIn("whatsapp-otp", fd);
      } catch (err) {
        if (!(err instanceof TypeError && err.message.includes("null"))) throw err;
      }
      setWaStep({ phone });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleWaCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (typeof waStep === "object" && waStep) fd.set("phone", waStep.phone);
    try {
      try {
        await signIn("whatsapp-otp", fd);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!(msg.includes("redirect") || (err instanceof TypeError && msg.includes("null")))) {
          throw err;
        }
      }
      try {
        await logLogin({ method: "whatsapp-otp" });
      } catch {
        /* silent */
      }
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Church className="h-10 w-10" />
        </div>
        <CardTitle>IPC</CardTitle>
        <CardDescription>
          {bypassMode ? "Login direto (modo dev)" : "Acesso ao sistema"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bypassMode ? (
          <>
            <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200 mb-4">
              Modo de bypass ativo - login sem verificacao
            </p>
            <form className="flex flex-col gap-4" onSubmit={handleBypass}>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" type="tel" name="phone" placeholder="11999991111" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Aguarde..." : "Entrar"}
              </Button>
            </form>
          </>
        ) : waStep !== null ? (
          // Fluxo WhatsApp OTP
          typeof waStep === "object" ? (
            <form className="flex flex-col gap-4" onSubmit={handleWaCode}>
              <p className="text-sm text-muted-foreground">
                Digite o codigo enviado para {waStep.phone}
              </p>
              <div className="space-y-2">
                <Label htmlFor="code">Codigo</Label>
                <Input id="code" type="tel" name="code" placeholder="000000" maxLength={6} required />
              </div>
              <input name="phone" value={waStep.phone} type="hidden" />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Verificando..." : "Verificar"}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground underline hover:no-underline cursor-pointer"
                onClick={() => setWaStep(null)}
              >
                Voltar
              </button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleWaPhone}>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" type="tel" name="phone" placeholder="11999991111" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Aguarde..." : "Enviar codigo"}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground underline hover:no-underline cursor-pointer"
                onClick={() => setWaStep(null)}
              >
                Voltar
              </button>
            </form>
          )
        ) : (
          <Tabs defaultValue="senha" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="senha">Entrar</TabsTrigger>
              <TabsTrigger value="primeiro">Primeiro acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="senha">
              <form className="flex flex-col gap-4" onSubmit={handleSenha}>
                <div className="space-y-2">
                  <Label htmlFor="phone-s">Telefone</Label>
                  <Input id="phone-s" type="tel" name="phone" placeholder="11999991111" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" name="password" autoComplete="current-password" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="primeiro">
              <form className="flex flex-col gap-4" onSubmit={handlePrimeiroAcesso}>
                <p className="text-sm text-muted-foreground">
                  Primeiro acesso: informe seu telefone e os 5 primeiros digitos do seu CPF.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="phone-p">Telefone</Label>
                  <Input id="phone-p" type="tel" name="phone" placeholder="11999991111" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">5 primeiros digitos do CPF</Label>
                  <Input
                    id="cpf"
                    type="tel"
                    name="cpf"
                    placeholder="12345"
                    maxLength={5}
                    inputMode="numeric"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Verificando..." : "Continuar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {!bypassMode && waStep === null && (
          <button
            type="button"
            className="mt-4 w-full text-center text-xs text-muted-foreground underline hover:no-underline cursor-pointer"
            onClick={() => setWaStep("phone")}
          >
            Entrar com codigo por WhatsApp
          </button>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 mt-4">
            <p className="text-destructive text-xs">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
