import type { IMessagingProvider, SendMessageOptions, SendMessageResult } from "./types";

const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 5_000;

async function postWuzapi(
  baseUrl: string,
  token: string,
  jid: string,
  text: string
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${baseUrl}/chat/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: token,
      },
      body: JSON.stringify({ Phone: jid, Body: text }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const wuzapiProvider: IMessagingProvider = {
  name: "whatsapp",

  isConfigured() {
    return !!(process.env.WUZAPI_API_URL && process.env.WUZAPI_TOKEN);
  },

  async sendText({ phone, text }: SendMessageOptions): Promise<SendMessageResult> {
    const baseUrl = process.env.WUZAPI_API_URL;
    const token = process.env.WUZAPI_TOKEN;

    if (!baseUrl || !token) {
      return { success: false, error: "WuzAPI não configurado (WUZAPI_API_URL ou WUZAPI_TOKEN ausente)" };
    }

    const jid = phone.replace(/^\+/, "") + "@s.whatsapp.net";

    // 1 retry em erro 5xx ou timeout/conexao
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const response = await postWuzapi(baseUrl, token, jid, text);

        if (response.ok) {
          return { success: true };
        }

        const body = await response.text();
        const isRetryable = response.status >= 500 && response.status < 600;
        console.error(`[WuzAPI] Erro tentativa ${tentativa}: ${response.status} ${body}`);

        if (!isRetryable || tentativa === 2) {
          return { success: false, error: `WuzAPI respondeu ${response.status}: ${body}` };
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[WuzAPI] Erro de conexao tentativa ${tentativa}:`, msg);
        if (tentativa === 2) {
          return { success: false, error: `Falha ao conectar ao WuzAPI: ${msg}` };
        }
      }

      // Backoff antes do retry
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    return { success: false, error: "WuzAPI: tentativas esgotadas" };
  },
};

export default wuzapiProvider;
