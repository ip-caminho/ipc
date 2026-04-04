"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { DeepgramClient } from "@deepgram/sdk";
import { createLlmProvider } from "../_shared/llm";
import { fetchB2File } from "../files/signing";

const SERMON_ANALYSIS_PROMPT = `Você é um analista teológico especializado em sermões reformados/presbiterianos. Analise a transcrição do sermão abaixo e retorne um JSON estruturado com os seguintes campos:

1. **tituloSugerido**: string com um título conciso e descritivo para a gravação (máximo 80 caracteres). Deve funcionar como título de um podcast.
2. **pregadorIdentificado**: string com o nome do pregador/ministrante, se for possível identificá-lo na transcrição (ex: se alguém o apresenta ou ele se identifica). Retorne null se não for possível identificar.
3. **temaCentral**: objeto com "titulo" (tema central do sermão em até 10 palavras) e "passagemBiblica" (texto bíblico base, ex: "João 3:16-18")
4. **pontosChave**: array com 3-5 pontos principais do sermão (frases curtas e objetivas)
5. **aplicacaoPratica**: array com 2-4 aplicações práticas para a vida do ouvinte
6. **momentoInteracao**: string com um momento marcante de interação com a congregação, ou null se não houver. Na maioria dos sermões há um momento de interação — procure bem antes de retornar null. Este momento deve estar DENTRO dos limites do sermão (entre inicioSermao e fimSermao).
7. **fraseChave**: a frase mais impactante do sermão (citação direta)
8. **resumo**: string com um resumo do sermão em 2-4 parágrafos, descrevendo o conteúdo abordado de forma clara e acessível.
9. **descricao**: descrição curta do sermão em no máximo 2 frases. Objetiva, sem emojis.
10. **frasesRedesSociais**: array com exatamente 14 frases marcantes do sermão para posts em redes sociais. Cada frase deve ser impactante, entre 100-280 caracteres, e funcionar isoladamente como post. Sem emojis.
11. **descricoesInstagram**: array com exatamente 14 descrições para posts do Instagram. Cada descrição deve contextualizar a frase correspondente (mesmo índice de frasesRedesSociais), ter 2-4 linhas, incluir 3-5 hashtags relevantes e um call-to-action. Sem emojis.
12. **tags**: array com 3-8 tags relevantes para categorização (ex: "graça", "salvação", "fé", "evangelho"). Palavras simples, sem hashtag.
13. **inicioSermao**: número em segundos indicando o momento exato onde o sermão/pregação COMEÇA. O sermão começa com as PRIMEIRAS PALAVRAS DO PREGADOR — isso pode ser uma saudação ("boa noite, irmãos"), um convite para abrir a Bíblia ("vamos abrir em Romanos capítulo 8"), ou a leitura da passagem bíblica. INCLUA a saudação e a leitura bíblica, pois fazem parte do sermão. Use os timestamps [MM:SS] para identificar. Se o sermão começa logo no início, retorne 0.
14. **fimSermao**: número em segundos indicando o momento exato onde o sermão/pregação TERMINA. O sermão termina quando o MOMENTO DE INTERAÇÃO finaliza (ex: após a oração de resposta, apelo, ou convite final feito pelo pregador). Inclua todo o momento de interação dentro do sermão. NÃO inclua avisos da igreja, bênção apostólica ou cânticos finais. Se o sermão vai até o final da gravação, retorne null.
15. **inicioAvisos**: número em segundos indicando onde os avisos/informes da igreja COMEÇAM. Os avisos geralmente ficam no final do culto, após o sermão. Retorne null se não houver avisos na gravação.
16. **fimAvisos**: número em segundos indicando onde os avisos/informes TERMINAM. Retorne null se não houver avisos.
17. **avisos**: array de objetos com os seguintes campos para cada aviso:
   - "titulo": título curto e claro do aviso (ex: "Retiro de jovens")
   - "descricao": descrição resumida em 1-2 frases, com informações essenciais
   - "dataEvento": data do evento no formato YYYY-MM-DD, ou null se não mencionada. Use a data do culto para converter datas relativas ("próximo sábado", "dia 15")
   - "quando": dia e horário do evento se mencionado (ex: "Sábado, 10h", "Quarta-feira às 19h30"), ou null
   - "onde": local do evento se mencionado (ex: "Sala 2", "Salão da igreja", "Sítio do João"), ou null
   - "contatoNome": nome da pessoa de contato/responsável mencionada para aquele aviso (ex: "Leandro", "Leandrão", "Maria"), ou null se ninguém for mencionado. Capture o nome EXATAMENTE como falado na gravação, incluindo apelidos.
   - "contatoWhatsapp": null (será preenchido manualmente depois)
   Liste cada aviso mencionado separadamente. Retorne array vazio [] se não houver avisos. Seja claro e objetivo — o membro precisa entender O QUE é, QUANDO é, ONDE é e COM QUEM FALAR sobre cada aviso.

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown, sem code blocks, sem texto antes ou depois
- Mantenha o tom teológico reformado/presbiteriano
- NÃO use emojis em nenhum campo
- As frases para redes sociais devem ser extraídas ou adaptadas diretamente do sermão
- As descrições do Instagram devem complementar as frases, não repeti-las
- Para inicioSermao: comece nas primeiras palavras do pregador (saudação, convite para leitura bíblica, etc). SEMPRE inclua a saudação inicial e a leitura da passagem.
- Para fimSermao: termine APÓS o momento de interação (oração de resposta, apelo). O momento de interação faz parte do sermão. Só exclua avisos da igreja, bênção e cânticos finais.
- Os timestamps estão no formato [MM:SS] no início de cada parágrafo.
- Para avisos: identifique o trecho onde alguém faz comunicados, informes ou avisos para a congregação (eventos, reuniões, datas, etc). Separe cada aviso individual.
- Para dataEvento nos avisos: a data do culto é informada abaixo. Use-a como referência para converter datas relativas ("próximo sábado", "dia 15", "semana que vem") em datas absolutas YYYY-MM-DD.
- Para contatoNome: capture exatamente o apelido/nome falado (ex: "Leandrão", "Irmã Maria"). Isso será usado para vincular ao contato correto depois.
- Cada aviso deve ser autocontido — quem ler precisa entender o que é, quando, onde e com quem falar, sem ouvir o áudio.

DATA DO CULTO: {{DATA_CULTO}}

TRANSCRIÇÃO:
`;

/** Format seconds as MM:SS */
function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Build transcription text with paragraph-level timestamps from Deepgram.
 * Each paragraph gets a [MM:SS] prefix so Claude can identify sermon boundaries.
 */
function buildTimestampedTranscription(deepgramResult: any): {
  transcription: string;
  timestampedTranscription: string;
} {
  const channels = deepgramResult?.results?.channels;
  const firstAlt = channels?.[0]?.alternatives?.[0];

  // Plain transcription (for storage)
  const transcription =
    firstAlt?.paragraphs?.transcript ||
    firstAlt?.transcript ||
    "";

  // Try to build timestamped version from paragraph data
  const paragraphs = firstAlt?.paragraphs?.paragraphs;
  if (!paragraphs || !Array.isArray(paragraphs) || paragraphs.length === 0) {
    return { transcription, timestampedTranscription: transcription };
  }

  const lines: string[] = [];
  for (const p of paragraphs) {
    const text = p.sentences
      ?.map((s: any) => s.text)
      .join(" ") || "";
    if (text) {
      lines.push(`[${formatTimestamp(p.start)}] ${text}`);
    }
  }

  return {
    transcription,
    timestampedTranscription: lines.join("\n\n"),
  };
}

// Lazy-load internal to avoid TS2589 "type instantiation excessively deep"
function getUpdateRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.ai.updateIaStatus;
}

function getGravacaoDataRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.ai.getGravacaoData;
}

function getCreateEventosRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.ai.createEventosFromAvisos;
}

export const processSermon = internalAction({
  args: {
    gravacaoId: v.id("gravacoes"),
    audioUrl: v.string(),
    membroId: v.id("membros"),
    skipTranscription: v.optional(v.string()), // existing transcription to skip Deepgram
  },
  handler: async (ctx, { gravacaoId, audioUrl, membroId, skipTranscription }) => {
    const updateIaStatus = getUpdateRef();

    try {
      let timestampedTranscription: string;

      if (skipTranscription) {
        // === Retry from analysis — reuse existing transcription ===
        timestampedTranscription = skipTranscription;
        await ctx.runMutation(updateIaStatus, {
          id: gravacaoId,
          iaStatus: "ANALISANDO",
        });
      } else {
        // === Step 1: Transcription with Deepgram ===
        await ctx.runMutation(updateIaStatus, {
          id: gravacaoId,
          iaStatus: "TRANSCREVENDO",
        });

        // Download audio from B2 server-side, then send buffer to Deepgram
        const audioBuffer = await fetchB2File(audioUrl);
        if (!audioBuffer) {
          throw new Error("Nao foi possivel baixar o audio do B2");
        }

        const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! });
        const result = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
          model: "nova-2",
          language: "pt-BR",
          smart_format: true,
          punctuate: true,
          paragraphs: true,
        });

        const built = buildTimestampedTranscription(result);

        if (!built.transcription) {
          throw new Error("Transcricao vazia — verifique o audio");
        }

        timestampedTranscription = built.timestampedTranscription;

        // Save transcription immediately (even if LLM fails later)
        await ctx.runMutation(updateIaStatus, {
          id: gravacaoId,
          iaStatus: "ANALISANDO",
          iaTranscricao: built.transcription,
        });
      }

      // === Step 2: Analysis with LLM ===
      // Send timestamped version so LLM can identify sermon boundaries
      const llm = createLlmProvider();

      // Buscar data do culto para resolver datas relativas nos avisos
      const dataCulto = await ctx.runQuery(getGravacaoDataRef(), { id: gravacaoId });
      const promptWithDate = SERMON_ANALYSIS_PROMPT.replace("{{DATA_CULTO}}", dataCulto || "desconhecida");

      const responseText = await llm.complete({
        prompt: promptWithDate + timestampedTranscription,
        maxTokens: 16000,
      });

      // Parse JSON response — handle possible markdown code blocks
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      let iaResultado: any;
      try {
        iaResultado = JSON.parse(cleanJson);
      } catch {
        // A IA pode retornar newlines literais dentro de strings JSON.
        // Sanitizar: remover newlines entre aspas que não estejam escaped.
        try {
          let inString = false;
          let escaped = false;
          let sanitized = "";
          for (const ch of cleanJson) {
            if (escaped) { sanitized += ch; escaped = false; continue; }
            if (ch === "\\") { sanitized += ch; escaped = true; continue; }
            if (ch === '"') { inString = !inString; sanitized += ch; continue; }
            if (inString && ch === "\n") { sanitized += "\\n"; continue; }
            if (inString && ch === "\r") { sanitized += "\\r"; continue; }
            sanitized += ch;
          }
          iaResultado = JSON.parse(sanitized);
        } catch (parseError) {
          const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
          console.error("[IA] JSON parse failed. Error:", errMsg);
          console.error("[IA] Response length:", responseText.length);
          console.error("[IA] First 500 chars:", responseText.slice(0, 500));
          console.error("[IA] Last 200 chars:", responseText.slice(-200));
          throw new Error("Resposta da IA veio truncada ou mal formatada. Tente novamente.");
        }
      }

      if (!iaResultado.temaCentral || !iaResultado.frasesRedesSociais) {
        throw new Error("Resultado da IA incompleto — campos obrigatorios ausentes");
      }

      // === Step 3: Save IA results + auto-fill gravação fields ===
      const autoFill: Record<string, unknown> = {};

      if (iaResultado.tituloSugerido) {
        autoFill.titulo = iaResultado.tituloSugerido;
      }
      if (iaResultado.pregadorIdentificado) {
        autoFill.pregadorNome = iaResultado.pregadorIdentificado;
      }
      if (iaResultado.temaCentral?.passagemBiblica) {
        autoFill.textoBase = iaResultado.temaCentral.passagemBiblica;
      }
      if (iaResultado.resumo) {
        autoFill.resumo = iaResultado.resumo;
      }
      if (iaResultado.descricao) {
        autoFill.descricao = iaResultado.descricao;
      }
      if (iaResultado.tags && Array.isArray(iaResultado.tags)) {
        autoFill.tags = iaResultado.tags;
      }
      if (typeof iaResultado.inicioSermao === "number") {
        autoFill.inicioSermao = iaResultado.inicioSermao;
      }
      if (typeof iaResultado.fimSermao === "number") {
        autoFill.fimSermao = iaResultado.fimSermao;
      }
      if (typeof iaResultado.inicioAvisos === "number") {
        autoFill.inicioAvisos = iaResultado.inicioAvisos;
      }
      if (typeof iaResultado.fimAvisos === "number") {
        autoFill.fimAvisos = iaResultado.fimAvisos;
      }
      if (Array.isArray(iaResultado.avisos) && iaResultado.avisos.length > 0) {
        // Tentar resolver contatos conhecidos por apelido
        const CONTATOS_CONHECIDOS: Record<string, { nome: string; whatsapp: string }> = {
          "leandrão": { nome: "Leandro Luiz Novaes", whatsapp: "21999999999" },
          "leandro": { nome: "Leandro Luiz Novaes", whatsapp: "21999999999" },
        };

        autoFill.iaAvisos = iaResultado.avisos.map((aviso: any) => {
          if (aviso.contatoNome && !aviso.contatoWhatsapp) {
            const key = aviso.contatoNome.toLowerCase().trim();
            const match = CONTATOS_CONHECIDOS[key];
            if (match) {
              return { ...aviso, contatoNome: match.nome, contatoWhatsapp: match.whatsapp };
            }
          }
          return aviso;
        });
      }

      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "CONCLUIDO",
        iaResultado,
        iaProcessadoEm: Date.now(),
        iaProcessadoPor: membroId,
        ...autoFill,
      });

      // === Step 4: Create calendar events from avisos with dates ===
      if (Array.isArray(iaResultado.avisos) && iaResultado.avisos.length > 0) {
        const avisosComData = iaResultado.avisos.filter(
          (a: any) => a.dataEvento && typeof a.dataEvento === "string"
        );
        if (avisosComData.length > 0) {
          await ctx.runMutation(getCreateEventosRef(), {
            avisos: avisosComData,
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "ERRO",
        iaErro: errorMsg,
      });
    }
  },
});
