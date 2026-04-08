# PRD: Presenca por Reconhecimento Facial

## Problema

A igreja nao tem controle de quem frequenta os cultos. Nao sabe quem veio, quem faltou, quem e visitante. Isso impacta:
- Pastoreio: nao percebe quando membro para de vir
- Acolhimento: visitantes passam despercebidos
- Metricas: sem dados de frequencia para planejamento

## Solucao

Camera fixa na unica entrada da igreja. Captura fotos automaticamente durante o periodo de entrada. Apos o culto, sistema processa as imagens comparando com a base de fotos dos membros cadastrados. Gera relatorio de presenca automatico.

## Nao-objetivos

- Nao e vigilancia em tempo real
- Nao substitui acolhimento pessoal
- Nao rastreia movimentacao dentro da igreja
- Nao processa video contínuo (apenas fotos em intervalos)

---

## Arquitetura

Processamento **100% local** em tempo real. Sem cloud, sem custo de API, funciona offline.

```
┌──────────────┐     ┌──────────────────────────────────────┐     ┌──────────────┐
│  Camera IP   │────▶│  Maquina local (PC/notebook)         │────▶│  Convex      │
│  na entrada  │     │                                      │     │  Backend     │
│  1080p+      │     │  DeepFace + InsightFace (buffalo_l)  │     │              │
│  bem ilum.   │     │  Processa video em tempo real        │     │  Recebe      │
└──────────────┘     │  Detecta → Reconhece → Envia        │     │  resultados  │
                     │                                      │     │  via HTTP    │
                     │  Roda por horas sem custo            │     │              │
                     └──────────────────────────────────────┘     └──────────────┘
```

### Fluxo detalhado

1. **Antes do culto**: operador inicia o script no PC local (ou inicia automaticamente por horario)
2. **Tempo real**: sistema processa video continuamente
   a. Captura frame da camera
   b. Detecta rostos no frame (RetinaFace detector)
   c. Para cada rosto detectado: compara embedding contra banco local de membros
   d. Se match (confianca > 85%): registra presenca imediatamente
   e. Se sem match: salva recorte do rosto como "visitante/incerto"
   f. Dedup automatica: mesmo membro detectado varias vezes conta como 1
   g. Envia resultado para Convex via HTTP mutation (batch a cada 30s)
3. **Durante todo o culto**: pode rodar 2-3h sem problema (custo zero)
4. **Apos o culto**: script para automaticamente ou operador encerra
5. **Revisao**: voluntario revisa incertos/visitantes no app
6. **Relatorio**: dashboard com presentes, ausentes, visitantes, tendencias

### Por que processamento local

- **Custo zero**: sem API cloud, sem tokens, roda por horas
- **Tempo real**: presenca registrada na hora, nao pos-culto
- **Offline**: funciona sem internet (sync quando reconectar)
- **Privacidade**: dados biometricos nunca saem da maquina local
- **Performance**: PC com i5 moderno processa ~5-10 FPS em CPU (suficiente para entrada)

---

## Hardware

### Camera

| Requisito | Especificacao |
|-----------|---------------|
| Resolucao | 1080p minimo (ideal 4K para rostos a distancia) |
| Posicao | Fixa na entrada, altura ~2m, angulada para capturar rostos de frente |
| Iluminacao | Entrada precisa de boa iluminacao (LED branco, sem contraluz) |
| Tipo | Camera IP com RTSP ou webcam USB |
| Exemplos | Tapo C200 (~R$150), Intelbras iM3, webcam Logitech C920 |

### Maquina de processamento

O processamento local precisa de mais potencia que um Raspberry Pi.

| Opcao | Custo | Performance | Descricao |
|-------|-------|-------------|-----------|
| PC/notebook da igreja | R$0 | 3-10 FPS (CPU) | Se ja tiver um i5/i7 disponivel. Suficiente para entrada |
| Mini PC dedicado | R$1.500-2.500 | 5-10 FPS (CPU) | Intel N100/i5, 16GB RAM. Ex: Beelink, MinisForum |
| PC com GPU dedicada | R$3.000+ | 20-30+ FPS | GTX 1060+ ou similar. Overkill para este uso |

**Recomendacao**: usar PC/notebook existente. Se nao tiver, mini PC com i5 e 16GB RAM e suficiente. GPU **nao e necessaria** — a entrada tem fluxo lento (1-2 pessoas por vez), CPU da conta.

### Requisitos minimos da maquina

- CPU: Intel i5 8a geracao+ ou AMD Ryzen 5+ (4 cores)
- RAM: 8GB (16GB ideal)
- Armazenamento: 10GB livres (modelos + banco local)
- SO: Windows, Linux ou macOS
- Python 3.9+
- Rede: Wi-Fi ou ethernet (para sync com Convex)

### Estimativa de custo

- Camera IP: R$150-300
- Maquina: R$0 (existente) ou R$1.500-2.500 (mini PC novo)
- **Total: R$150-2.800** dependendo do que ja tem

---

## Stack de reconhecimento facial

### DeepFace + InsightFace (processamento local)

**Biblioteca**: [DeepFace](https://github.com/serengil/deepface) — wrapper Python que unifica varios modelos de reconhecimento facial.

**Modelo recomendado**: buffalo_l (via InsightFace/ArcFace)
- Precisao: 99.53% no dataset LFW (supera humanos em 97.53%)
- Inclui deteccao + alinhamento + reconhecimento em pipeline unico
- Otimizado para CPU via ONNX Runtime

**Detector**: RetinaFace
- Melhor precisao para deteccao de rostos (+42% vs OpenCV)
- Mais lento mas precisao compensa (entrada tem fluxo lento)

**Banco de embeddings**: local (arquivo pickle ou SQLite)
- Cada membro tem um vetor de 512 dimensoes (embedding)
- Comparacao por distancia coseno — instantanea
- Sync das fotos de membros via Convex HTTP

### Performance esperada (CPU only)

| CPU | FPS estimado | Suficiente? |
|-----|-------------|-------------|
| Intel i5 8th gen | 3-5 FPS | Sim (entrada lenta) |
| Intel i5 12th gen+ | 5-10 FPS | Sim, confortavel |
| Intel i7/Ryzen 7 | 8-15 FPS | Sobra |
| Com GPU (GTX 1060+) | 20-30+ FPS | Overkill |

Para uma entrada de igreja (1-2 pessoas por vez), **3-5 FPS e suficiente**. Qualquer i5 moderno da conta.

### Custo de operacao

**R$0/mes** — sem API cloud, sem tokens, sem assinatura. Apenas energia eletrica da maquina.

### Fallback: AWS Rekognition (se necessario)

Se a igreja nao tiver maquina disponivel, pode usar AWS Rekognition como alternativa cloud:
- Custo: ~R$15-20/mes (4 cultos)
- Sem maquina local, processamento pos-culto via Convex action
- Pode migrar para local depois quando tiver hardware

---

## Schema (tabelas novas)

### `presencaCultos` — Registro de presenca por culto

```
cultoId                 # ref cultos
data                    # YYYY-MM-DD (denormalizado para queries)
status                  # "PROCESSANDO" | "REVISAO" | "FINALIZADO"
totalFotos              # quantas fotos foram processadas
totalRostosDetectados   # total de rostos encontrados
totalRostosUnicos       # apos dedup
totalPresentes          # membros identificados
totalVisitantes         # rostos sem match
totalIncertos           # baixa confianca
processadoEm            # timestamp
finalizadoPor?          # ref membros (quem revisou)
finalizadoEm?           # timestamp
observacoes?
```
Indices: `by_culto`, `by_data`

### `presencaRegistros` — Cada pessoa detectada

```
presencaCultoId         # ref presencaCultos
membroId?               # ref membros (null se visitante)
faceId?                 # ID do rosto na collection AWS (para dedup)
confianca               # 0-100 (score do match)
classificacao           # "MEMBRO" | "VISITANTE" | "INCERTO"
classificacaoManual?    # override manual: "MEMBRO" | "VISITANTE" | "IGNORAR"
fotoRecorteUrl?         # URL do recorte do rosto (B2)
revisadoPor?            # ref membros
revisadoEm?             # timestamp
```
Indices: `by_presenca`, `by_membro`, `by_classificacao`

### `faceCollection` — Controle de embeddings

```
membroId                # ref membros
fotoOrigemUrl           # foto usada para gerar embedding
embeddingSyncEm         # timestamp da ultima sincronizacao
ativo                   # boolean (false se membro saiu ou revogou consentimento)
```
Indices: `by_membro`

Nota: os embeddings (vetores 512d) ficam **na maquina local** (arquivo pickle/SQLite), nao no Convex. Esta tabela apenas controla quais membros estao indexados.

### Campo em `membros` (existente)

O campo `foto` ja existe na entidade. Para gerar embedding, usar a foto do perfil do membro. Se nao tiver foto, membro nao entra na collection (presenca manual).

---

## Telas

### 1. Dashboard de presenca (`/presenca`)

- **Visao geral**: proximo culto + ultimos cultos processados
- **Cards por culto**: data, total presentes/ausentes/visitantes, status (processando/revisao/finalizado)
- **Grafico de tendencia**: frequencia por culto ao longo do tempo (linha)
- **Alertas**: membros que faltaram X cultos seguidos (configuravel)

### 2. Detalhe do culto (`/presenca/[id]`)

- **Resumo**: presentes, ausentes, visitantes, incertos
- **Tab Presentes**: grid de fotos com nome e confianca
- **Tab Ausentes**: membros que nao foram detectados
- **Tab Revisao**: rostos INCERTOS e VISITANTES para classificacao manual
  - Foto do rosto recortado + sugestoes de match (se confianca > 70%)
  - Botoes: "E o membro X" / "Visitante" / "Ignorar (falso positivo)"
- **Tab Visitantes**: rostos classificados como visitante, com opcao de cadastrar

### 3. Configuracao (`/presenca/configurar`)

- **Camera**: URL do stream / configuracao de captura
- **Janela de captura**: horario inicio/fim (ex: 08:30 - 09:15)
- **Limiar de confianca**: % minimo para considerar match (default: 85%)
- **Alerta de ausencia**: apos quantos cultos seguidos alertar (default: 3)
- **Gerenciamento da collection**: membros indexados, reindexar, remover

### 4. Widget no dashboard principal

- "Presenca ultimo culto: X presentes, Y visitantes"
- Link para detalhes

### 5. Perfil do membro (adicao)

- Secao "Frequencia": % de presenca nos ultimos 3 meses, grafico mini

---

## Permissoes RBAC

```
"presenca:read"         # Ver relatorios de presenca
"presenca:manage"       # Processar, revisar, configurar
```

| Permissao | admin | pastor | presbitero | obreiro | secretaria | membro |
|-----------|-------|--------|------------|---------|------------|--------|
| `presenca:read` | x | x | x | x | x | |
| `presenca:manage` | x | x | | | x | |

Membro pode ver **sua propria** frequencia no perfil (sem `presenca:read`).

---

## LGPD e Privacidade

### Base legal

Reconhecimento facial e **dado biometrico sensivel** (Art. 5, II, LGPD). Tratamento so permitido com:
- **Consentimento especifico e destacado** (Art. 11, I) — nao basta aviso geral
- **Finalidade especifica** declarada — "registro de presenca nos cultos"

### Implementacao obrigatoria

1. **Termo de consentimento** digital no app:
   - Texto claro: "Autorizo o uso de reconhecimento facial para registro de presenca nos cultos"
   - Checkbox explicito (nao pre-marcado)
   - Registrar data/hora do consentimento
   - Campo `consentimentoFacial` na tabela `membros`

2. **Revogacao a qualquer momento**:
   - Botao "Revogar" no perfil
   - Remove rosto da collection AWS imediatamente
   - Presencas anteriores mantidas (anonimizadas se solicitado)

3. **Visitantes**:
   - Aviso fisico na entrada: "Este ambiente utiliza reconhecimento facial para registro de presenca"
   - Rostos de visitantes processados mas NAO armazenados na collection
   - Recortes faciais deletados apos revisao (nao permanentes)

4. **Seguranca dos dados**:
   - Embeddings e fotos de referencia ficam **apenas na maquina local** — nunca em cloud
   - Recortes de rostos incertos/visitantes enviados ao B2 apenas para revisao, deletados apos finalizacao
   - Video da camera **nunca e gravado** — apenas frames processados em memoria
   - Maquina local com acesso restrito (senha, rede interna)
   - Acesso no app restrito via permissao `presenca:manage`

5. **Registro de consentimento** (tabela):
```
consentimentoFacial
  membroId              # ref membros
  consentiu             # boolean
  dataConsentimento     # timestamp
  dataRevogacao?        # timestamp
  ipAddress?            # registro do device
```

### Referencia legal
- LGPD Art. 5, II — dado biometrico e sensivel
- LGPD Art. 11, I — exige consentimento especifico
- ANPD Agenda Regulatoria 2025/2026 — regulamentacao de biometria em andamento

---

## Backend

### Convex Backend (`convex/presenca/`)

O Convex **recebe resultados** da maquina local. Nao faz processamento de imagem.

```
queries.ts
  - getDashboard()           # resumo geral + ultimos cultos
  - getPresencaCulto(id)     # detalhe com registros
  - getAusentes(id)          # membros nao detectados
  - getRevisao(id)           # incertos + visitantes para revisao
  - getFrequenciaMembro(id)  # historico de presenca do membro
  - getAlertasAusencia()     # membros com X faltas seguidas
  - getMembrosParaSync()     # lista membros com foto + consentimento (para sync local)

mutations.ts
  - registrarPresencaBatch(cultoId, registros[])  # recebe batch da maquina local
  - classificarManual(registroId, classificacao, membroId?)  # revisao manual
  - finalizarRevisao(presencaCultoId)  # marca como finalizado
  - registrarConsentimento(consentiu)  # LGPD
  - iniciarCulto(cultoId)  # cria presencaCulto com status PROCESSANDO
  - finalizarCaptura(presencaCultoId)  # maquina local avisa que parou
```

### Aplicacao local (Python — roda na maquina da igreja)

```
presenca-local/
  main.py               # entry point — inicia captura + reconhecimento
  camera.py             # captura frames da camera (RTSP ou USB)
  detector.py           # DeepFace: detecta rostos no frame
  recognizer.py         # compara embedding contra banco de membros
  sync.py               # sincroniza fotos de membros do Convex → banco local
  sender.py             # envia resultados para Convex via HTTP mutation
  config.py             # configuracoes (URL camera, limiar, Convex URL, etc)
  db/
    embeddings.pkl      # banco de embeddings dos membros (gerado pelo sync)
    faces/              # fotos de referencia dos membros (cache local)
  requirements.txt      # deepface, insightface, onnxruntime, opencv-python, requests
```

**Fluxo do main.py:**
```python
# 1. Sync: baixa fotos dos membros do Convex e gera embeddings
sync_member_faces()

# 2. Inicia sessao no Convex
session_id = convex_api.iniciar_culto(culto_id)

# 3. Loop principal
seen_faces = {}  # dedup: embedding_hash → membro_id
while running:
    frame = camera.capture()
    faces = detector.detect(frame)
    
    for face in faces:
        embedding = recognizer.get_embedding(face)
        
        if is_duplicate(embedding, seen_faces):
            continue  # ja registrou essa pessoa
        
        match = recognizer.find_match(embedding, member_db)
        
        if match and match.confidence > 0.85:
            seen_faces[hash(embedding)] = match.membro_id
            batch.add(membro=match.membro_id, confianca=match.confidence, tipo="MEMBRO")
        elif match and match.confidence > 0.70:
            save_crop(face, "incerto")
            batch.add(confianca=match.confidence, tipo="INCERTO", foto=crop_url)
        else:
            save_crop(face, "visitante")
            batch.add(tipo="VISITANTE", foto=crop_url)
    
    # Envia batch a cada 30s
    if batch.ready():
        sender.send_to_convex(session_id, batch)
        batch.clear()

# 4. Finaliza
convex_api.finalizar_captura(session_id)
```

**Sync de membros (executa antes de cada culto):**
```python
# Chama Convex: getMembrosParaSync()
# Retorna: [{membroId, nome, fotoUrl}] (apenas com foto + consentimento)
# Baixa fotos novas/atualizadas
# Gera embeddings via DeepFace
# Salva em embeddings.pkl
```

---

## Frontend

### Estrutura de arquivos

```
features/presenca/
  components/
    PresencaDashboard.tsx       # visao geral + tendencias
    PresencaCultoDetalhe.tsx    # detalhe com tabs
    PresencaRevisao.tsx         # tela de revisao manual (rostos + botoes)
    PresencaAusentes.tsx        # lista de ausentes
    PresencaConfig.tsx          # configuracao
    CollectionStatus.tsx        # quantos membros indexados, reindexar
    FrequenciaMembro.tsx        # mini grafico no perfil do membro
    ConsentimentoFacialDialog.tsx  # dialog LGPD
    AlertaAusencia.tsx          # card de alerta para membros ausentes
  lib/
    constants.ts                # CLASSIFICACOES, LIMIARES, CORES
    validations.ts
```

### Paginas

```
app/(ready)/presenca/
  page.tsx                      # dashboard
  [id]/page.tsx                 # detalhe do culto
  configurar/page.tsx           # configuracao + collection
```

---

## Arquivos existentes a modificar

| Arquivo | Mudanca |
|---------|---------|
| `convex/schema.ts` | +tabelas presencaCultos, presencaRegistros, faceCollection, consentimentoFacial |
| `convex/preferencias/rbac.ts` | +permissoes presenca:read, presenca:manage |
| `convex/preferencias/rbacHelpers.ts` | +permissoes nos roles |
| `types/auth.ts` | +permissoes no tipo |
| `convex/modulos/mutations.ts` | +modulo "presenca" |
| `shared/components/layout/AppSidebar.tsx` | +item Presenca |
| `shared/components/layout/MobileTabBar.tsx` | +item nos drawerSections |
| `shared/components/layout/DevContext.tsx` | +entradas CONTEXT_MAP |
| `presenca-local/` | App Python (repo separado ou pasta no projeto) |
| `presenca-local/requirements.txt` | deepface, insightface, onnxruntime, opencv-python, requests |

---

## Ordem de implementacao

| Fase | Escopo |
|------|--------|
| 1 | Schema + permissoes + modulo + consentimento LGPD |
| 2 | App Python local: captura + DeepFace + reconhecimento em tempo real |
| 3 | Sync de membros: Convex → maquina local (fotos + embeddings) |
| 4 | Comunicacao: maquina local → Convex (resultados via HTTP) |
| 5 | Frontend: dashboard + detalhe do culto |
| 6 | Frontend: tela de revisao manual (incertos + visitantes) |
| 7 | Alertas de ausencia + frequencia no perfil do membro |
| 8 | Configuracao + polish |

### Dependencias externas (antes de comecar)

- [ ] Camera instalada na entrada com boa iluminacao
- [ ] PC/notebook disponivel na igreja (i5+, 8GB RAM)
- [ ] Python 3.9+ instalado na maquina
- [ ] Rede local (camera e PC na mesma rede)
- [ ] Campanha de fotos: membros sem foto no sistema precisam adicionar
- [ ] Termo de consentimento LGPD aprovado pelo conselho

---

## Metricas de sucesso

- **Precisao**: >90% de membros corretamente identificados (sem revisao manual)
- **Cobertura**: >80% dos membros tem foto na collection
- **Tempo de processamento**: <10min apos fim da janela de captura
- **Revisao manual**: <20 rostos por culto precisam de classificacao

---

## Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Membros sem foto no sistema | Campanha + permitir upload facil no app. Fallback: presenca manual |
| Iluminacao ruim na entrada | LED branco dedicado. Testar antes de implantar |
| Familias entrando juntas (oclusao) | Intervalo de 5s captura em momentos diferentes. Revisao manual cobre |
| Bone/oculos escuros | Rekognition lida razoavelmente. Incertos vao para revisao |
| LGPD — membro recusa consentimento | Presenca manual para esses membros. Nao bloquear |
| Maquina local trava/desliga | Script com auto-restart (systemd/pm2). Fallback: presenca manual |
| Camera falha | Alerta no app se nao recebeu dados no horario esperado. Fallback manual |
| Modelo ocupa muita RAM | buffalo_l usa ~1.5GB. Em maquinas com 8GB, fechar outros programas |
| Primeira execucao lenta | Download dos modelos (~600MB) na primeira vez. Depois fica em cache |
| Falso positivo (confunde membros) | Limiar de confianca alto (85%). Revisao manual |
| Visitante frequent — sempre "visitante" | Opcao na revisao: "Cadastrar como membro" → fluxo de convite |

---

## Verificacao

- [ ] Consentimento LGPD: membro consente e aparece na collection
- [ ] Consentimento LGPD: membro revoga e e removido da collection
- [ ] Sync de membros gera embeddings locais
- [ ] App Python inicia e captura frames da camera
- [ ] Deteccao de rostos funciona em tempo real
- [ ] Match identifica membros com >85% confianca
- [ ] Resultados enviados para Convex em batch
- [ ] Dedup: mesmo membro em multiplas fotos conta como 1
- [ ] Rostos sem match classificados como VISITANTE
- [ ] Rostos com confianca 70-85% classificados como INCERTO
- [ ] Revisao manual funciona (reclassificar incertos)
- [ ] Dashboard mostra presentes/ausentes/visitantes
- [ ] Alerta de ausencia apos X cultos
- [ ] Frequencia visivel no perfil do membro
- [ ] Fotos originais deletadas apos processamento
- [ ] Recortes deletados apos revisao finalizada
- [ ] Permissoes RBAC corretas
