export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AIProvider {
  chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string>;
}
