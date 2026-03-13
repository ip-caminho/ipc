import type { IMessagingProvider } from "./types";

const bypassProvider: IMessagingProvider = {
  name: "bypass",
  isConfigured: () => true,
  async sendText({ phone, text }) {
    console.log(`[Bypass Messaging] To: ${phone}, Text: ${text}`);
    return { success: true };
  },
};

let activeProvider: IMessagingProvider = bypassProvider;

export function setProvider(provider: IMessagingProvider) {
  activeProvider = provider;
}

export const messaging = {
  async sendOTP(phone: string, code: string): Promise<void> {
    const text = `IPC - Seu codigo de verificacao: ${code}`;
    const result = await activeProvider.sendText({ phone, text });
    if (!result.success) {
      throw new Error(result.error || "Failed to send OTP");
    }
  },

  async sendText(phone: string, text: string): Promise<void> {
    const result = await activeProvider.sendText({ phone, text });
    if (!result.success) {
      throw new Error(result.error || "Failed to send message");
    }
  },

  isConfigured(): boolean {
    return activeProvider.isConfigured();
  },
};
