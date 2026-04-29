export function SemPermissaoFallback({
  mensagem = "Você não tem permissão para acessar esta página.",
}: {
  mensagem?: string;
}) {
  return (
    <div className="max-w-md mx-auto text-center pt-12">
      <h1 className="text-xl font-medium">Sem acesso</h1>
      <p className="text-sm text-muted-foreground mt-2">{mensagem}</p>
    </div>
  );
}
