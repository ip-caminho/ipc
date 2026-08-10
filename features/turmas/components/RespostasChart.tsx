"use client";

/**
 * Contagem de respostas por opcao. Uma serie so (quantidade), entao: barras
 * horizontais, uma cor unica (nao ha identidade a codificar), valor rotulado em
 * cada barra e nenhuma legenda — o titulo diz o que e. Sem eixo: com todos os
 * valores escritos, a grade seria ruido.
 */
type Contagem = { opcao: string; total: number };

interface Props {
  label: string;
  contagens: Contagem[];
  multipla?: boolean;
  /** Base do percentual: total de inscritos considerados. */
  totalRespondentes: number;
}

export function RespostasChart({ label, contagens, multipla, totalRespondentes }: Props) {
  const maior = Math.max(1, ...contagens.map((c) => c.total));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium leading-snug">{label}</p>
        {multipla && (
          <p className="text-xs text-muted-foreground">Mais de uma resposta por pessoa</p>
        )}
      </div>

      <div className="space-y-2">
        {contagens.map((c) => {
          const proporcao = c.total / maior;
          const percentual =
            totalRespondentes > 0 ? Math.round((c.total / totalRespondentes) * 100) : 0;
          return (
            <div key={c.opcao} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 text-muted-foreground">{c.opcao}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {c.total}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({percentual}%)
                  </span>
                </span>
              </div>
              {/* Trilha recessiva + barra fina de ponta arredondada, ancorada na
                  base. Largura minima para a barra de 1 nao virar um risco. */}
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                title={`${c.opcao}: ${c.total} de ${totalRespondentes}`}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(proporcao * 100, c.total > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
