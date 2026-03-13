"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Church } from "lucide-react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"phone" | { phone: string }>("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const bypassMode = process.env.NEXT_PUBLIC_AUTH_BYPASS_MODE === "true";
  const logLogin = useMutation(api.audit.mutations.logLogin);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Church className="h-10 w-10" />
        </div>
        <CardTitle>IPC</CardTitle>
        <CardDescription>
          {bypassMode ? "Login direto (modo dev)" : "Login via WhatsApp"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bypassMode && (
          <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200 mb-4">
            Modo de bypass ativo - login sem verificacao
          </p>
        )}

        {step === "phone" ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);

              const formData = new FormData(e.target as HTMLFormElement);
              const phone = formData.get("phone") as string;

              try {
                let normalizedPhone = phone.replace(/[^\d+]/g, "");
                if (!normalizedPhone.startsWith("+")) {
                  normalizedPhone = "+55" + normalizedPhone;
                }

                if (bypassMode) {
                  const bypassEmail = `${normalizedPhone}@bypass.local`;
                  const bypassPassword = normalizedPhone;

                  try {
                    await signIn("password", {
                      flow: "signIn",
                      email: bypassEmail,
                      password: bypassPassword,
                    });
                  } catch {
                    await signIn("password", {
                      flow: "signUp",
                      email: bypassEmail,
                      password: bypassPassword,
                    });
                  }

                  try {
                    await logLogin({ method: "bypass" });
                  } catch {
                    /* silent */
                  }

                  setTimeout(() => router.push("/"), 500);
                } else {
                  formData.set("phone", normalizedPhone);
                  try {
                    await signIn("whatsapp-otp", formData);
                  } catch (err: unknown) {
                    if (
                      !(
                        err instanceof TypeError &&
                        err.message.includes("null")
                      )
                    ) {
                      throw err;
                    }
                  }
                  setStep({ phone: normalizedPhone });
                }
              } catch (error: unknown) {
                setError(
                  error instanceof Error ? error.message : "Erro desconhecido",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                name="phone"
                placeholder="11999991111"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "Aguarde..."
                : bypassMode
                  ? "Entrar"
                  : "Enviar Codigo"}
            </Button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);

              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("phone", step.phone);

              try {
                try {
                  await signIn("whatsapp-otp", formData);
                } catch (err: unknown) {
                  const errorMessage =
                    err instanceof Error ? err.message : String(err);
                  if (
                    !(
                      errorMessage.includes("redirect") ||
                      (err instanceof TypeError &&
                        errorMessage.includes("null"))
                    )
                  ) {
                    throw err;
                  }
                }

                try {
                  await logLogin({ method: "whatsapp-otp" });
                } catch {
                  /* silent */
                }

                setTimeout(() => router.push("/"), 500);
              } catch (error: unknown) {
                setError(
                  error instanceof Error ? error.message : "Erro desconhecido",
                );
                setLoading(false);
              }
            }}
          >
            <p className="text-sm text-muted-foreground">
              Digite o codigo enviado para {step.phone}
            </p>
            <div className="space-y-2">
              <Label htmlFor="code">Codigo</Label>
              <Input
                id="code"
                type="tel"
                name="code"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <input name="phone" value={step.phone} type="hidden" />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Verificando..." : "Verificar"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline hover:no-underline cursor-pointer"
              onClick={() => setStep("phone")}
            >
              Alterar numero
            </button>
          </form>
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
