# Modulo: Boletim

## Visao Geral

O Boletim (`/boletim`) e a visualizacao publica/impressa do culto dominical. Apresenta as informacoes do proximo culto (ou de um culto selecionado) em formato de boletim eclesiastico: cabecalho institucional, ordem do culto (liturgia), equipe de apoio, e avisos. Inclui navegacao entre domingos e funcao de impressao.

Trata-se de um modulo exclusivamente de leitura — nao possui formularios nem edicao. Todos os dados vem da query `getBoletim` que agrega informacoes de cultos, escalas e avisos.

## Arquivos

### Frontend

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/boletim/page.tsx` | Pagina unica (~220 linhas). Layout de boletim com cabecalho, liturgia, equipe, avisos e rodape. Navegacao entre cultos dominicais. Botao de impressao. |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/escalas/queries.ts` → `getBoletim` | Query principal. Busca o proximo culto DOMINICAL (ou por data selecionada), enriquece escalas com nomes (primeiro nome e nome completo), calcula navegacao (anterior/proximo), e agrega avisos validos para a data. |

**Parametros da query:**
- `data?: string` — Data do culto (YYYY-MM-DD). Se omitido, retorna o proximo culto dominical a partir de hoje.

**Retorno:**
```ts
{
  data: string;
  tipo: "DOMINICAL";
  horario?: string;
  louvores?: string[];
  status: "RASCUNHO" | "PUBLICADO";
  escalas: Array<{
    funcao: string;
    membroNome: string;        // primeiro nome
    membroNomeCompleto: string; // nome inteiro
    passagemBiblica?: string;
    nomeCustom?: string;
  }>;
  avisos: Array<{ _id: string; titulo: string; descricao?: string; dataInicio: string; dataFim?: string }>;
  navegacao: { anterior: string | null; proximo: string | null };
}
```

### Schema (tabelas utilizadas)

| Tabela | Campos consumidos |
|--------|-------------------|
| `cultos` | `data`, `tipo`, `horario`, `louvores`, `status` |
| `cultoEscalas` | `funcao`, `membroId`, `nomeCustom`, `passagemBiblica` |
| `avisos` | `titulo`, `descricao`, `dataInicio`, `dataFim` |

## Funcionalidades

### Exibicao do Boletim

O boletim e renderizado como um card centralizado (`max-w-lg`) com as seguintes secoes:

1. **Cabecalho**: icone de igreja, nome da igreja ("Igreja Presbiteriana do Caminho"), tipo de culto ("Culto Dominical"), data por extenso (ex: "21 de marco de 2026"), e horario (default "10:00h").

2. **Ordem do Culto (Liturgia)**: exibe funcoes na ordem fixa `LITURGIA_ORDER`:
   - **Abertura**: nome completo do membro + passagem biblica
   - **Confissao**: nome completo do membro + passagem biblica
   - **Louvor**: lista de louvores (do campo `cultos.louvores[]`) + nomes completos dos membros da equipe
   - **Palavra** (Pregacao): nome do pregador (membro ou externo via `nomeCustom`) + passagem biblica

3. **Equipe**: grid 2 colunas com funcoes de apoio na ordem `EQUIPE_ORDER`:
   - Hospitalidade, Som, Multimidia
   - Exibe primeiro nome dos membros escalados, separados por virgula.
   - Secao so aparece se houver pelo menos uma funcao preenchida.

4. **Avisos**: lista de avisos cujo intervalo `[dataInicio, dataFim]` inclui a data do culto. Exibe titulo e descricao. Separados por borda tracejada.

5. **Rodape**: citacao biblica fixa — "Alegrei-me quando me disseram: Vamos a Casa do Senhor" (Salmo 122:1).

### Navegacao

- Botoes de seta (ChevronLeft/ChevronRight) permitem navegar entre cultos dominicais.
- A query `getBoletim` retorna `navegacao.anterior` e `navegacao.proximo` (datas de cultos dominicais adjacentes).
- Se nao ha culto anterior/proximo, o botao correspondente fica desabilitado.
- Ao selecionar uma data, a query e re-executada com o parametro `data`.

### Impressao

- Botao "Imprimir" dispara `window.print()`.
- Classes `print:hidden` nos controles de navegacao ocultam botoes na impressao.
- Classes `print:shadow-none print:border-0` removem sombra e borda do card.

### Fallbacks

- **Loading**: Skeleton centralizado de 600px de altura.
- **Sem culto**: icone de igreja grande + mensagem "Nenhum culto dominical cadastrado".
- **Selecao automatica**: se nenhuma data selecionada, exibe o proximo culto dominical a partir de hoje. Se nao ha culto futuro, exibe o ultimo culto passado.

## Permissoes

| Acao | Permissao | Nota |
|------|-----------|------|
| Ver boletim | `escalas:read` (via query) | Todos os membros |
| Pagina | ModuloGuard `boletim` | Modulo deve estar ativo |

O boletim e somente leitura — nao requer permissoes de escrita. O `ModuloGuard` verifica se o modulo `boletim` esta ativo na configuracao de modulos da igreja.

**Nota**: a query `getBoletim` nao possui verificacao explicita de permissao no backend (nao usa `requirePermission`). A protecao e feita pelo `ModuloGuard` no frontend e pela autenticacao implicita do Convex.

## Dependencias

### Modulos internos
- **Escalas** (`convex/escalas/queries.ts`): query `getBoletim` que agrega cultos + escalas + avisos.
- **Avisos** (tabela `avisos`): avisos sao filtrados pela data do culto diretamente na query `getBoletim`.
- **Modulos** (`ModuloGuard`): protegido pelo modulo `boletim`.

### Shared
- `shared/components/auth/ModuloGuard.tsx` — guard de modulo
- `shared/components/ui/` — Skeleton, Button

### Bibliotecas externas
- `date-fns` + `date-fns/locale/ptBR`: formatacao de data por extenso (ex: "21 de marco de 2026")
- `lucide-react`: Church, ChevronLeft, ChevronRight, Printer

## Padroes de UI

- **Card centralizado** (`max-w-lg`) simulando um boletim impresso.
- **Tipografia centrada** nas secoes de liturgia (alinhamento central para estilo eclesiastico).
- **Hierarquia visual**: titulos de secao em `text-xs uppercase tracking-widest text-muted-foreground`.
- **Separacao por bordas**: secoes (liturgia, equipe, avisos, rodape) separadas por `border-t`.
- **Responsividade**: layout funciona bem em mobile (card ocupa `w-full`).
- **Print-friendly**: classes `print:*` garantem que o boletim imprime limpo, sem controles de navegacao, sombras ou bordas do card.
- **Nomes**: liturgia usa nome completo (`membroNomeCompleto`), equipe usa primeiro nome (`membroNome`).
- **Labels customizados**: PREGACAO e exibida como "Palavra" no boletim (`FUNCAO_LABELS`).

## Notas Tecnicas

- **Query `getBoletim`**: e a query mais complexa do modulo de escalas. Agrega dados de 3 tabelas (cultos, cultoEscalas, avisos) e calcula navegacao. Filtra apenas cultos DOMINICAIS.
- **Resolucao dupla de nomes**: cada escala recebe tanto `membroNome` (primeiro nome, via `resolveEscalaNome`) quanto `membroNomeCompleto` (nome inteiro, via `resolveEscalaNomeCompleto`). A liturgia usa o nome completo; a equipe usa o primeiro nome.
- **Avisos no boletim**: os avisos sao filtrados pela data do culto na propria query (`dataInicio <= culto.data && dataFim >= culto.data`), garantindo que o boletim exibe apenas avisos relevantes para aquele domingo.
- **Ordens fixas**: `LITURGIA_ORDER` e `EQUIPE_ORDER` sao constantes locais que definem a sequencia de exibicao das funcoes. Isso e independente do campo `ordem` da tabela `funcoes`.
- **Estado minimo**: o unico estado do componente e `dataSelecionada` (opcional). Tudo mais vem da query reativa do Convex.
- **Sem edicao**: o boletim e estritamente read-only. Qualquer alteracao nos dados deve ser feita pela pagina de Cultos (`/cultos`).
- **Horario default**: se o culto nao tem horario cadastrado, exibe "10:00" como fallback.
- **Navegacao inteligente**: a query busca todos os cultos dominicais ordenados, encontra o indice do culto selecionado, e retorna as datas adjacentes. Isso permite navegar por todo o historico.
