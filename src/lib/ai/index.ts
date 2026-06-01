import type { ProcessMeta } from "@/components/process-designer/types";
import { OpenAICompatProvider } from "./providers/openai-compat";
import type { AIConfig, AIProvider } from "./types";

export type { AIConfig, AIProvider, ChatMessage } from "./types";

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

export function resolveJudgeConfig(meta?: ProcessMeta): AIConfig {
  const generatorConfig = resolveConfig(meta);
  return {
    baseUrl: import.meta.env.VITE_JUDGE_BASE_URL || generatorConfig.baseUrl,
    apiKey: import.meta.env.VITE_JUDGE_API_KEY || generatorConfig.apiKey,
    model: import.meta.env.VITE_JUDGE_MODEL || generatorConfig.model,
  };
}

export function createProvider(config: AIConfig): AIProvider {
  return new OpenAICompatProvider(config);
}
