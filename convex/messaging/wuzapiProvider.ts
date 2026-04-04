import type { IMessagingProvider, SendMessageOptions, SendMessageResult } from "./types";

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

    // WuzAPI espera o número sem o "+" inicial
    const jid = phone.replace(/^\+/, "") + "@s.whatsapp.net";

    try {
      const response = await fetch(`${baseUrl}/chat/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Token: token,
        },
        body: JSON.stringify({
          Phone: jid,
          Body: text,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("[WuzAPI] Erro:", response.status, body);
        return { success: false, error: `WuzAPI respondeu ${response.status}: ${body}` };
      }

      return { success: true };
    } catch (error) {
      console.error("[WuzAPI] Erro de conexão:", error);
      return {
        success: false,
        error: `Falha ao conectar ao WuzAPI: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      };
    }
  },
};

export default wuzapiProvider;
