import type { AIConfig, AIProvider, ChatMessage } from "../types";

export class OpenAICompatProvider implements AIProvider {
  constructor(private config: AIConfig) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    const url = `${this.config.baseUrl}/chat/completions`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
        }),
      });
    } catch {
      throw new Error(
        `Verbindung zu ${this.config.baseUrl} fehlgeschlagen. Ist der Server erreichbar?`
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 401) {
        throw new Error("Ungültiger API-Key (401 Unauthorized).");
      }
      if (response.status === 404) {
        throw new Error(
          `Endpoint nicht gefunden (404). Stimmt die Base-URL? (${this.config.baseUrl})`
        );
      }
      throw new Error(
        `API-Fehler ${response.status}: ${body.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Unerwartetes API-Antwortformat.");
    }
    return content;
  }
}
