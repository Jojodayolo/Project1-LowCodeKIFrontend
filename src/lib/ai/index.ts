import type { ProcessMeta } from "@/components/process-designer/types";
import { OpenAICompatProvider } from "./providers/openai-compat";
import type { AIConfig, AIProvider } from "./types";

export type { AIConfig, AIProvider } from "./types";
export type { ChatMessage } from "./types";

export function resolveConfig(meta?: ProcessMeta): AIConfig {
  return {
    baseUrl:
      meta?.llmHost ||
      import.meta.env.VITE_AI_BASE_URL ||
      "https://api.openai.com/v1",
    apiKey: import.meta.env.VITE_AI_API_KEY || "",
    model:
      meta?.model ||
      import.meta.env.VITE_AI_MODEL ||
      "gpt-4o-mini",
  };
}

export function createProvider(config: AIConfig): AIProvider {
  return new OpenAICompatProvider(config);
}
