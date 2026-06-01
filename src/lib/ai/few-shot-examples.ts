import type { ChatMessage } from "./types";

const xmlFiles = import.meta.glob<string>(
  "../../../examples/few-shot-examples/*.xml",
  { eager: true, query: "?raw", import: "default" },
);

const txtFiles = import.meta.glob<string>(
  "../../../examples/few-shot-examples/*.txt",
  { eager: true, query: "?raw", import: "default" },
);

function baseName(path: string): string {
  return path.split("/").pop()!.replace(/\.[^.]+$/, "");
}

export function buildFewShotMessages(): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const xmlPath of Object.keys(xmlFiles).sort()) {
    const name = baseName(xmlPath);
    const txtPath = Object.keys(txtFiles).find((p) => baseName(p) === name);
    if (!txtPath) continue;

    const prompt = txtFiles[txtPath].trim();
    const xml = xmlFiles[xmlPath].trim();

    messages.push({ role: "user", content: prompt });
    messages.push({
      role: "assistant",
      content: `Hier ist die XML-Prozessdefinition:\n\n\`\`\`xml\n${xml}\n\`\`\``,
    });
  }

  return messages;
}
