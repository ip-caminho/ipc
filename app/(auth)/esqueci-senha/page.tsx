"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Logo } from "@shared/components/layout/Logo";

const MENSAGENS: Record<string, string> = {
  nao_confere: "Os dados não conferem com o cadastro. Verifique e tente de novo.",
  bloqueado: "Muitas tentativas com este telefone. Tente de novo em 1 hora ou procure a secretaria.",
  procure_secretaria: "Seu cadastro não está ativo. Procure a secretaria.",
  primeiro_acesso: "Você ainda não ativou seu acesso. Volte ao login e use a aba Primeiro acesso.",
  procure_admin: "Por segurança, esta conta só pode ter a senha trocada por um administrador. Procure a secretaria.",
};

function mascararData(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Barra na tela o que nem existe no calendario, para nao gastar tentativa. */
function dataValida(valor: string): boolean {
  if (valor.length !== 10) return false;
  const [dia, mes, ano] = valor.split("/").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return (
    ano >= 1900 &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia &&
    data.getTime() <= Date.now()
  );
}

function dataParaIso(valor: string): string {
  const [dia, mes, ano] = valor.split("/");
  return `${ano}-${mes}-${dia}`;
}

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  // @ts-ignore Convex TS2589
  const solicitar = useMutation(api.membros.recuperarSenha.solicitarRecuperacao);
  const redefinir = useAction(api.membros.recuperarSenha.redefinirSenha);
  const logLogin = useMutation(api.audit.mutations.logLogin);

  const [token, setToken] = useState<string | null>(null);
  const [nascimento, setNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerificar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!dataValida(nascimento)) {
      setError("Informe uma data de nascimento válida (dd/mm/aaaa).");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await solicitar({
        telefone: fd.get("phone") as string,
        cpf: fd.get("cpf") as string,
        dataNascimento: dataParaIso(nascimento),
      });
      if (res.status === "ok") {
        setToken(res.token);
      } else {
        setError(MENSAGENS[res.status]);
      }
    } catch {
      setError("Não foi possível verificar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRedefinir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return;
    if (senha.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const res = await redefinir({ token, novaSenha: senha });
      if (res.status !== "ok") {
        if (res.status === "expirado") {
          setToken(null);
          setSenha("");
          setConfirma("");
          setError("O tempo para trocar a senha acabou. Confirme seus dados de novo.");
        } else {
          setError("A senha deve ter entre 8 e 128 caracteres.");
        }
        setLoading(false);
        return;
      }

      try {
        await signIn("password", { flow: "signIn", email: res.loginId, password: senha });
      } catch {
        // Senha ja foi trocada: basta entrar manualmente
        router.push("/signin");
        return;
      }
      try {
        await logLogin({ method: "recuperacao-senha" });
      } catch {
        /* silent */
      }
      router.push("/dashboard");
    } catch {
      setError("Não foi possível trocar a senha. Confirme seus dados e tente de novo.");
      setToken(null);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Logo className="h-12" />
        </div>
        <CardTitle>{token ? "Crie uma nova senha" : "Esqueci minha senha"}</CardTitle>
        <CardDescription>
          {token
            ? "Depois de salvar, você já entra no sistema."
            : "Confirme os dados do seu cadastro para criar uma nova senha."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <form key="redefinir" className="flex flex-col gap-4" onSubmit={handleRedefinir}>
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirma">Confirmar nova senha</Label>
              <Input
                id="confirma"
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                autoComplete="new-password"
                className="h-11"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? "Salvando..." : "Salvar e entrar"}
            </Button>
          </form>
        ) : (
          <form key="verificar" className="flex flex-col gap-4" onSubmit={handleVerificar}>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="11999991111"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                inputMode="numeric"
                placeholder="Somente números"
                maxLength={14}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nascimento">Data de nascimento</Label>
              <Input
                id="nascimento"
                inputMode="numeric"
                value={nascimento}
                onChange={(e) => setNascimento(mascararData(e.target.value))}
                placeholder="dd/mm/aaaa"
                autoComplete="bday"
                className="h-11"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? "Verificando..." : "Continuar"}
            </Button>
          </form>
        )}

        {error && (
          <div role="alert" className="bg-destructive/10 border border-destructive/30 rounded-md p-2 mt-4">
            <p className="text-destructive text-xs">{error}</p>
          </div>
        )}

        <Button asChild variant="ghost" className="mt-2 h-11 w-full">
          <Link href="/signin">Voltar ao login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
