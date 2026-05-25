"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
} from "@/shared/components/ui/responsive-dialog";
import { toast } from "sonner";

const VERSAO = "1.0";

/**
 * Modal LGPD obrigatorio na primeira atualizacao pos-campanha.
 * Lei 13.709/2018 Arts 5o II (dado pessoal) e 11 (dado sensivel,
 * inclui conviccao religiosa).
 *
 * O modal abre automaticamente quando:
 * - O membro tem login (esta autenticado e via /meu-perfil)
 * - Nao existe consentimento ativo da finalidade CADASTRO_BASICO na versao atual
 */
export function LgpdConsentDialog() {
  const consentimentos = useQuery(api.lgpd.index.meusConsentimentos);
  const aceitar = useMutation(api.lgpd.index.aceitar);

  const [aceiteBasico, setAceiteBasico] = useState(false);
  const [aceiteMensageria, setAceiteMensageria] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Carregando ou nao autenticado
  if (consentimentos === undefined) return null;

  const temBasico = consentimentos.some(
    (c) => c.finalidade === "CADASTRO_BASICO" && c.versaoTexto === VERSAO && !c.revogadoEm
  );
  if (temBasico) return null;

  const handleAceitar = async () => {
    if (!aceiteBasico) {
      toast.error("E necessario aceitar o consentimento de cadastro basico");
      return;
    }
    setSalvando(true);
    try {
      await aceitar({ finalidade: "CADASTRO_BASICO" });
      if (aceiteMensageria) {
        await aceitar({ finalidade: "MENSAGERIA" });
      }
      toast.success("Consentimento registrado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar consentimento");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ResponsiveDialog open={true}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Termo de Consentimento (LGPD)</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Lei 13.709/2018 (Lei Geral de Protecao de Dados)
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <p>
            A IPC trata seus dados pessoais para fins de cadastro de membros, exercicio das
            atividades eclesiasticas e comunicacao pastoral, conforme Arts 5o II e 11 da
            LGPD (que reconhece dados de conviccao religiosa como sensiveis).
          </p>
          <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md border hover:bg-muted/50">
            <Checkbox
              checked={aceiteBasico}
              onCheckedChange={(v) => setAceiteBasico(!!v)}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium">Cadastro basico (obrigatorio)</p>
              <p className="text-xs text-muted-foreground">
                Concordo que a IPC mantenha meus dados pessoais (nome, contato, endereco,
                familia, dados eclesiasticos) para fins de cadastro de membro e exercicio
                pastoral.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md border hover:bg-muted/50">
            <Checkbox
              checked={aceiteMensageria}
              onCheckedChange={(v) => setAceiteMensageria(!!v)}
              className="mt-0.5"
            />
            <div>
              <p className="font-medium">Comunicacao via WhatsApp (opcional)</p>
              <p className="text-xs text-muted-foreground">
                Aceito receber comunicados, lembretes e mensagens pastorais pelo numero
                cadastrado. Posso revogar a qualquer momento.
              </p>
            </div>
          </label>
          <p className="text-xs text-muted-foreground">
            Voce pode revogar seus consentimentos a qualquer momento entrando em contato
            com a secretaria. Versao do termo: {VERSAO}.
          </p>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button onClick={handleAceitar} disabled={salvando || !aceiteBasico}>
            {salvando ? "Salvando..." : "Aceitar e continuar"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
