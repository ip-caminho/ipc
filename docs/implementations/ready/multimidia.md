# Modulo Multimidia

Espaco dedicado para a equipe de multimidia preparar o culto dominical: liturgia tecnica, arquivos recebidos, avisos com imagens geradas, checklist pre-culto e anotacoes.

**Status**: Planejado (nao implementado)

---

## Indice

1. [Visao geral](#visao-geral)
2. [Funcionalidades](#funcionalidades)
3. [Schema (tabelas)](#schema-tabelas)
4. [Rotas e paginas](#rotas-e-paginas)
5. [Permissoes (RBAC)](#permissoes-rbac)
6. [Geracao de imagens para avisos](#geracao-de-imagens-para-avisos)
7. [Integracao com modulos existentes](#integracao-com-modulos-existentes)
8. [Integracao Holyrics](#integracao-holyrics)
9. [Estrutura de arquivos](#estrutura-de-arquivos)
10. [Arquivos existentes a modificar](#arquivos-existentes-a-modificar)
11. [Ordem de implementacao](#ordem-de-implementacao)
12. [Verificacao](#verificacao)

---

## Visao geral

A equipe de multimidia e escalada via modulo de Escalas (funcao MULTIMIDIA), mas nao tem ferramentas para preparar o culto. O modulo oferece:

- Painel centrado no **culto** — cada domingo tem sua "pasta" com tudo que precisa
- Receber arquivos (PPT, PDF, videos) de outros membros para projecao
- Ver a liturgia completa com detalhes tecnicos (tom, letra, texto biblico completo)
- Gerar imagens para avisos via templates + IA
- Checklist de verificacao pre-culto configuravel
- Anotacoes colaborativas por culto
- Integracao futura com Holyrics (software de projecao)

---

## Funcionalidades

### 1. Painel do culto (visao principal)

Tela `/multimidia` mostra o proximo culto (ou culto selecionado) com:

- **Liturgia completa**: ordem do culto com louvores (tom, letra), passagens biblicas, pregador, avisos — tudo que precisa ser projetado
- **Arquivos recebidos**: PPTs, PDFs, videos enviados por membros para aquele domingo
- **Avisos**: lista de avisos validos + imagens geradas
- **Checklist**: itens de verificacao pre-culto
- **Anotacoes**: campo livre para notas daquele domingo
- **Navegacao**: setas para cultos anteriores/proximos (como o boletim)

### 2. Recebimento de arquivos

Membros enviam conteudo para projecao no domingo:

- **Quem envia**: qualquer membro com permissao (lider de ministerio, pastor, etc.)
- **Como envia**: formulario simples — seleciona culto + tipo (apresentacao, video, imagem, outro) + upload + descricao
- **Rota de envio**: `/multimidia/enviar` (acessivel por membros autorizados)
- **Notificacao**: equipe de multimidia ve badge com contagem de novos arquivos
- **Status por arquivo**: RECEBIDO → REVISADO → APROVADO (equipe marca quando processou)
- **Tipos aceitos**: PPT/PPTX, PDF, MP4, PNG/JPG, KEY (Keynote)

### 3. Avisos com imagem

- **Fonte dos avisos**: tabela `avisos` existente (administrados via /cultos)
- Avisos novos ou editados aparecem automaticamente no painel do culto
- **Geracao de imagem**: botao "Gerar imagem" em cada aviso
  - Usa IA (Claude) para criar texto + layout de slide a partir do titulo/descricao do aviso
  - Gera imagem via template HTML → canvas → PNG (client-side, sem dependencia externa)
  - Templates pre-definidos: fundo escuro com texto, fundo com foto da igreja, estilo minimalista
  - Imagem salva no B2 e vinculada ao aviso
- **Edicao manual**: apos gerar, permite ajustar texto/cor antes de salvar
- Imagens dos avisos ficam na "pasta" do culto para projecao

### 4. Liturgia tecnica

Diferente do boletim (voltado para o publico), a visao de multimidia inclui:

- **Louvores**: titulo + tom + letra completa (ChordPro renderizado) + link YouTube/Spotify se disponivel
- **Passagens biblicas**: texto completo da passagem (nao so referencia) + versao da Biblia usada
- **Pregacao**: pregador + passagem + notas se houver
- **Avisos**: titulo + descricao + imagem gerada
- **Ordem de projecao sugerida**: sequencia de slides/momentos baseada na liturgia
- **Indicadores visuais**: cores diferentes para cada tipo (louvor=azul, leitura=verde, aviso=amarelo)

### 5. Checklist pre-culto

Lista de verificacao configuravel:

- **Itens padrao** (seed):
  - Montar apresentacao
  - Conferir versiculo biblico
  - Conferir versao da Biblia
  - Conferir avisos
  - Conferir louvores e tons
  - Testar projecao
  - Conferir audio/microfone
- **Itens customizaveis**: admin pode adicionar/remover itens do template
- **Estado por culto**: cada culto tem seu proprio estado de checklist (persistido)
- **Quem marcou**: registra qual voluntario completou cada item

### 6. Anotacoes do culto

- Campo de texto livre vinculado ao culto
- Multiplas notas (como comentarios) — cada voluntario pode adicionar
- Util para: "o PPT do fulano estava em 4:3, converter para 16:9", "trocar versao da Biblia para NVI"
- Persistido para consulta futura

---

## Schema (tabelas novas)

### Tabela `multimidiaArquivos`

| Campo | Tipo | Obs |
|-------|------|-----|
| cultoId | Id<"cultos"> | qual culto |
| enviadoPor | Id<"membros"> | quem enviou |
| tipo | "APRESENTACAO" \| "VIDEO" \| "IMAGEM" \| "OUTRO" | |
| nomeArquivo | string | nome original |
| url | string | CDN URL (B2) |
| mimeType | string | |
| descricao | string? | contexto do envio |
| status | "RECEBIDO" \| "REVISADO" \| "APROVADO" | |
| revisadoPor | Id<"membros">? | quem marcou como revisado |

Indices: `by_culto`, `by_enviadoPor`, `by_status`

### Tabela `multimidiaAvisoImagens`

| Campo | Tipo | Obs |
|-------|------|-----|
| avisoId | Id<"avisos"> | qual aviso |
| cultoId | Id<"cultos"> | para qual culto |
| imagemUrl | string | CDN URL da imagem gerada |
| template | string | qual template foi usado |
| geradoPor | Id<"membros"> | |

Indices: `by_aviso`, `by_culto`

### Tabela `multimidiaChecklist`

| Campo | Tipo | Obs |
|-------|------|-----|
| cultoId | Id<"cultos"> | |
| item | string | texto do item |
| ordem | number | sequencia |
| concluido | boolean | |
| concluidoPor | Id<"membros">? | quem marcou |
| concluidoEm | number? | timestamp |

Indices: `by_culto`

### Tabela `multimidiaNotas`

| Campo | Tipo | Obs |
|-------|------|-----|
| cultoId | Id<"cultos"> | |
| membroId | Id<"membros"> | quem escreveu |
| texto | string | |
| criadoEm | number | timestamp |

Indices: `by_culto`

### Tabela `multimidiaChecklistTemplate`

| Campo | Tipo | Obs |
|-------|------|-----|
| item | string | texto do item |
| ordem | number | sequencia |
| ativo | boolean | |

Template global — ao criar checklist de um novo culto, copia itens ativos daqui.

---

## Rotas e paginas

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/multimidia` | `app/(ready)/multimidia/page.tsx` | Painel principal (proximo culto) |
| `/multimidia/enviar` | `app/(ready)/multimidia/enviar/page.tsx` | Enviar arquivo para projecao |
| `/multimidia/culto/[id]` | `app/(ready)/multimidia/culto/[id]/page.tsx` | Painel de culto especifico |
| `/multimidia/configurar` | `app/(ready)/multimidia/configurar/page.tsx` | Config checklist template (admin) |

---

## Permissoes (RBAC)

Usar permissoes existentes `multimidia:read/create/update`:

| Permissao | Quem | O que faz |
|-----------|------|-----------|
| `multimidia:read` | Voluntario escalado | Ver painel do culto, liturgia, arquivos |
| `multimidia:create` | Membros autorizados | Enviar arquivos para projecao |
| `multimidia:update` | Equipe multimidia | Marcar checklist, revisar arquivos, gerar imagens, anotar |

Roles:
- **admin**: todas (wildcard)
- **voluntario_multimidia**: read, create, update (ja definido em rbacHelpers)
- **pastor/secretaria**: create (enviar arquivos)
- **membro**: sem acesso (a menos que escalado ou com permissao extra)

---

## Geracao de imagens para avisos

Abordagem client-side sem dependencia de API externa:

1. Templates HTML/CSS pre-definidos (3-5 estilos)
2. Dados do aviso (titulo, descricao, data) preenchem o template
3. Renderiza via `html2canvas` (ja no projeto) ou `<canvas>` nativo
4. IA (Claude) pode sugerir texto resumido para o slide se o aviso for longo
5. Preview editavel antes de salvar
6. Export como PNG → upload B2

Templates sugeridos:
- Fundo escuro com texto branco centralizado
- Fundo gradiente com logo da igreja
- Imagem de fundo (customizavel) + overlay + texto
- Minimalista (fundo branco, texto preto, borda colorida)

---

## Integracao com modulos existentes

- **Cultos/Escalas**: le dados do culto (liturgia, louvores, escalas, passagens)
- **Avisos**: le avisos validos para o culto (tabela `avisos`)
- **Louvor**: le letra e tom dos louvores escalados
- **Gravacoes (iaAvisos)**: opcionalmente importa avisos extraidos pela IA
- **Upload (shared/files)**: reutiliza FileUpload e presigned URLs do B2

---

## Integracao Holyrics

### O que e

Holyrics e o software de projecao usado pela igreja. Tem uma [API Server](https://github.com/holyrics/API-Server) que aceita requisicoes POST JSON via rede local ou internet, com autenticacao por token.

### O que a API permite

**Pode fazer (controle de exibicao):**
- Navegar slides: `ActionNext`, `ActionPrevious`, `ActionGoToIndex`
- Exibir versiculos: `ShowVerse`, `SelectVerse`
- Adicionar musicas/letras a playlists: `AddLyricsToPlaylist`, `AddSongsToPlaylist`
- Controlar background: `SetCurrentBackground`
- Painel de comunicacao: `SetTextCommunicationPanel`, `SetAlertCommunicationPanel`
- Tela preta/wallpaper: `SetF8`, `SetF9`, `SetF10`
- Ler schedule atual: `GetCurrentSchedule`, `GetSchedules`

**Nao pode fazer (limitacao da API):**
- Criar apresentacoes novas programaticamente
- Importar PPT/PDF
- Adicionar slides com conteudo customizado
- Modificar a ordem de liturgia/schedule

### Integracao viavel (Fase futura)

A API e de **controle remoto**, nao de criacao de conteudo. A integracao util seria:

1. **Sincronizar playlist de louvores**: do nosso sistema → Holyrics via `AddLyricsToPlaylist` (louvores do culto em ordem)
2. **Exibir versiculos**: quando o pregador tem passagem definida, enviar `ShowVerse` com livro/capitulo/versiculo
3. **Painel de comunicacao**: enviar avisos em texto para o painel do Holyrics
4. **Controle remoto**: botoes no painel de multimidia para avancar/voltar slides do Holyrics

**Requisitos**: Holyrics rodando com API Server ativo na mesma rede. Token configurado nas settings do Holyrics.

**Nao incluir na v1** — primeiro entregar o modulo base (painel, arquivos, checklist). Integracao Holyrics como fase futura apos validar com a equipe.

---

## Estrutura de arquivos

### Backend

```
convex/multimidia/
  queries.ts     — getPainelCulto, listArquivos, getChecklist, listNotas, listAvisoImagens
  mutations.ts   — enviarArquivo, revisarArquivo, toggleChecklistItem, criarNota, gerarImagemAviso, initChecklist
  helpers.ts     — copiarChecklistTemplate, proximoCulto
```

### Frontend

```
features/multimidia/
  components/
    PainelCulto.tsx           — visao principal do culto
    LiturgiaTecnica.tsx       — liturgia com detalhes para projecao
    ArquivosRecebidos.tsx     — lista de arquivos com status
    EnviarArquivoForm.tsx     — form de envio
    AvisosMultimidia.tsx      — avisos + imagens geradas
    GeradorImagemAviso.tsx    — editor/preview de imagem de aviso
    ChecklistCulto.tsx        — checklist interativo
    NotasCulto.tsx            — anotacoes do culto
    TemplateSelector.tsx      — selecao de template para imagem
  lib/
    constants.ts              — STATUS_ARQUIVO, TIPOS_ARQUIVO, CHECKLIST_SEED
    templates.ts              — definicoes dos templates de imagem
    validations.ts            — schemas Zod
```

### Paginas

```
app/(ready)/multimidia/
  page.tsx                    — painel (proximo culto)
  enviar/page.tsx             — enviar arquivo
  culto/[id]/page.tsx         — painel culto especifico
  configurar/page.tsx         — config checklist template
```

---

## Arquivos existentes a modificar

| Arquivo | Mudanca |
|---------|---------|
| `convex/schema.ts` | +tabelas multimidiaArquivos, multimidiaAvisoImagens, multimidiaChecklist, multimidiaNotas, multimidiaChecklistTemplate |
| `convex/modulos/mutations.ts` | +modulo "multimidia" em MODULOS_INICIAIS |
| `shared/components/layout/AppSidebar.tsx` | +item Multimidia no menu |
| `shared/components/layout/MobileTabBar.tsx` | +item nos drawerSections |
| `shared/components/layout/DevContext.tsx` | +entradas no CONTEXT_MAP |

---

## Ordem de implementacao

| Fase | Escopo | Depende de |
|------|--------|------------|
| 1 | Schema + permissoes + modulo ativo | — |
| 2 | Backend queries (painel culto = liturgia + avisos + louvores) | Fase 1 |
| 3 | Frontend: painel principal + liturgia tecnica | Fase 2 |
| 4 | Recebimento de arquivos (mutations + form + lista) | Fase 3 |
| 5 | Checklist (template + estado por culto) | Fase 3 |
| 6 | Anotacoes do culto | Fase 3 |
| 7 | Geracao de imagens para avisos (templates + canvas + IA) | Fase 3 |
| 8 | Sidebar + navegacao + polish mobile | Fase 3 |
| 9 | Integracao Holyrics (sync louvores, versiculos, controle remoto) | Fase 8, validacao com equipe |

Fases 4, 5, 6 e 7 sao independentes entre si — podem ser feitas em paralelo apos fase 3.

---

## Verificacao

- `npm run dev` — testar painel do culto com dados reais
- Verificar liturgia tecnica: louvores com tom/letra, passagens com texto completo
- Enviar arquivo PPT/PDF e verificar que aparece no painel
- Marcar itens no checklist e verificar persistencia
- Adicionar anotacoes e verificar que outros voluntarios veem
- Gerar imagem de aviso com diferentes templates
- Verificar permissoes: voluntario ve painel, membro comum envia arquivo, admin configura
- Testar navegacao entre cultos (anterior/proximo)
- `npm run lint` + `npm test`
