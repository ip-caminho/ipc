"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { loginIdFromPhone } from "@shared/lib/acesso";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

// Login simples (telefone + senha) embutido no fluxo de inscrição — não troca de
// rota. Reusa o provider "password" do Convex Auth, mesmo caminho da aba "Entrar"
// do /signin. Primeiro acesso (CPF) fica fora daqui: quem nunca acessou se
// inscreve anonimamente.
export function LoginModalInline({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const phone = fd.get("phone") as string;
    const password = fd.get("password") as string;
    try {
      await signIn("password", {
        flow: "signIn",
        email: loginIdFromPhone(phone),
        password,
      });
      // Auth atualiza reativamente; o form de inscrição reage e pré-preenche.
      onOpenChange(false);
    } catch {
      setError("Telefone ou senha incorretos.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Entrar como membro</DialogTitle>
          <DialogDescription>
            Use o telefone e a senha cadastrados na igreja para preencher mais rápido.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="login-phone">Telefone</Label>
            <Input
              id="login-phone"
              type="tel"
              name="phone"
              placeholder="11999991111"
              autoComplete="tel"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Senha</Label>
            <Input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
