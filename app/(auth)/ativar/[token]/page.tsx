"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Church } from "lucide-react";

export default function AtivarPage() {
  const { token } = useParams<{ token: string }>();
  const { signIn } = useAuthActions();
  const router = useRouter();
  const dados = useQuery(api.membros.acesso.getAtivacaoByToken, { token });
  const concluir = useMutation(api.membros.acesso.concluirAtivacao);
  const logLogin = useMutation(api.audit.mutations.logLogin);

  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (dados === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton className="h-80 w-full max-w-sm" />
      </div>
    );
  }

  if (dados.status !== "valido") {
    const msg =
      dados.status === "expirado"
        ? "Este link expirou. Peca um novo a secretaria."
        : dados.status === "ja_ativado"
          ? "Este acesso ja foi ativado. Va para a tela de login e entre com sua senha."
          : "Link invalido.";
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Church className="h-10 w-10" />
          </div>
          <CardTitle>Ativar acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{msg}</p>
          <Button variant="outline" className="w-full" onClick={() => router.push("/signin")}>
            Ir para login
          </Button>
        </CardContent>
      </Card>
    );
  }

  const loginId = dados.loginId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres");
      return;
    }
    if (senha !== confirma) {
      setError("As senhas nao conferem");
      return;
    }

    setLoading(true);
    try {
      await signIn("password", { flow: "signUp", email: loginId, password: senha });
      await concluir({ token });
      try {
        await logLogin({ method: "primeiro-acesso" });
      } catch {
        /* silent */
      }
      setTimeout(() => router.push("/dashboard"), 400);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      if (m.toLowerCase().includes("already") || m.includes("exists")) {
        setError("Este acesso ja foi ativado. Entre com sua senha na tela de login.");
      } else {
        setError(m || "Erro ao ativar acesso");
      }
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Church className="h-10 w-10" />
        </div>
        <CardTitle>Ola, {dados.nome.split(" ")[0]}</CardTitle>
        <CardDescription>Crie uma senha para acessar o sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Minimo 8 caracteres"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirma">Confirmar senha</Label>
            <Input
              id="confirma"
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Ativando..." : "Ativar acesso"}
          </Button>
        </form>
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 mt-4">
            <p className="text-destructive text-xs">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
