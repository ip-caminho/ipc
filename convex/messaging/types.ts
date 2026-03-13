export type ProviderType = "bypass" | "whatsapp";

export interface SendMessageOptions {
  phone: string;
  text: string;
}

export interface SendMessageResult {
  success: boolean;
  error?: string;
}

export interface IMessagingProvider {
  readonly name: ProviderType;
  isConfigured(): boolean;
  sendText(options: SendMessageOptions): Promise<SendMessageResult>;
}
