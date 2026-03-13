export interface LlmProvider {
  complete(params: {
    prompt: string;
    maxTokens?: number;
  }): Promise<string>;
}
