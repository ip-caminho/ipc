import { BookMarked } from "lucide-react";

export default function SecretarioExecutivoPage() {
  return (
    <div className="hidden md:flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center space-y-3 text-muted-foreground">
        <BookMarked className="h-10 w-10 mx-auto opacity-60" aria-hidden />
        <p className="text-sm">
          Selecione um membro na lista ao lado para consultar os dados e
          editar campos eclesiasticos.
        </p>
        <p className="text-xs">
          Dados pessoais (nome, contato, endereco) sao apenas para consulta.
          Cargo, rol, datas sacramentais, admissao, demissao, atos pastorais
          e cargos podem ser editados.
        </p>
      </div>
    </div>
  );
}
