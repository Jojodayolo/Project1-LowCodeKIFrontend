import React, { useEffect, useRef, useState } from "react";
import { createProvider, resolveConfig, type ChatMessage } from "@/lib/ai";
import type { ProcessContext } from "./types";

interface DisplayMsg {
  role: "user" | "ai";
  text: string;
  xml?: string;
}

const SYSTEM_PROMPT = `Du bist ein Assistent für einen visuellen KI-Prozessdesigner.
Du hilfst dabei, KI-Workflows als XML zu modellieren.
Antworte immer auf Deutsch.

## Antwortformat (strikt einhalten)
Schreibe genau zwei Dinge – nichts anderes:

1. Einen beschreibenden Text welcher beschreibt was umgesetzt wurde.
2. Eine Auflistung der Schritte die in der XML stehen, einen pro Zeile, im exakten Format:
- **schrittname**: Was dieser Schritt macht.

Direkt danach, ohne weiteren Text, der XML-Block:

\`\`\`xml
...
\`\`\`

## Variablen und Container automatisch ableiten
Analysiere die Beschreibung des Nutzers und leite selbstständig ab:
- **Variables** (<var>): Konfigurationswerte die der Nutzer vor dem Start eingibt (z.B. Fragestellung, Anzahl Stakeholder, Kontext). Wähle sinnvolle Standardwerte.
- **Containers** (<container>): Zwischenspeicher für Daten die zwischen Steps weitergegeben werden (z.B. stakeholders, options, criteria). Jeder Step der Daten produziert braucht writeTo, jeder der Daten liest braucht readFrom.
- **Outputs** (<output>): Das finale Ergebnis des Prozesses.
Der Nutzer soll KEINE Variablen oder Container manuell nennen müssen – du erkennst sie aus dem Kontext.

## XML-Format
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<process name="ProzessName" type="analysis">
  <variables>
    <var name="question">Standardwert</var>
    <var name="context">Hintergrundinfo</var>
  </variables>
  <containers>
    <container name="results"/>
  </containers>
  <outputs>
    <output name="result" type="json"/>
  </outputs>
  <agents>
    <agent role="Experte" roleDescription="Beschreibung der Rolle"/>
  </agents>
  <steps>
    <step name="schritt_name" writeTo="results">
      <system>System-Prompt für diesen Schritt</system>
      <prompt>User-Prompt mit {{variablen}}</prompt>
      <response_schema>class Result(BaseModel):
  field: str</response_schema>
    </step>
  </steps>
</process>
\`\`\`

## Wichtig für gültiges XML
- Schreibe in <system>, <prompt> und <response_schema> NIEMALS die Zeichen < oder > direkt. Nutze stattdessen &lt; und &gt; oder formuliere den Satz um.
- Alle Attributwerte müssen in Anführungszeichen stehen: name="wert" nicht name=wert
- Lasse die Attribute model und llmHost im <process>-Tag immer weg – diese werden aus der Konfiguration der Anwendung übernommen
- Jeder <step> hat einen eindeutigen name, optional readFrom und writeTo (Container-Namen, leerzeichen-getrennt), optional loop="true" loopOver="containerName"
- Verwende {{variablenname}} für Platzhalter in Prompts – diese werden zur Laufzeit aus <variables> befüllt
- response_schema ist ein Python-Pydantic-Modell
- Wähle aussagekräftige englische Namen für Steps, Variablen und Container (snake_case)`;

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    result.push(
      <ul key={result.length} className="my-1 space-y-0.5 pl-4 list-disc">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  const renderInline = (s: string): React.ReactNode[] => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p,
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = /^[-*]\s+(.+)/.exec(line);
    if (listMatch) {
      listBuffer.push(listMatch[1]);
    } else {
      flushList();
      if (line === "") {
        result.push(<br key={result.length} />);
      } else if (/^#{1,3}\s/.test(line)) {
        const text = line.replace(/^#+\s/, "");
        result.push(<span key={result.length} className="block font-semibold mt-1">{renderInline(text)}</span>);
      } else {
        result.push(<span key={result.length} className="block">{renderInline(line)}</span>);
      }
    }
  }
  flushList();
  return result;
}

function extractXml(text: string): { displayText: string; xml: string | undefined } {
  // 1. Code block: ```xml ... ``` (case-insensitive lang tag)
  const codeBlock = /```xml\s*([\s\S]+?)```/i.exec(text);
  if (codeBlock) {
    const xml = codeBlock[1].trim();
    const displayText = text.replace(codeBlock[0], "").trim() || "Ich habe eine XML-Prozessdefinition erzeugt:";
    return { displayText, xml };
  }
  // 2. Raw XML: <?xml ... </process> or <process ... </process>
  const rawXml = /((?:<\?xml[\s\S]*?)?<process[\s\S]*?<\/process>)/i.exec(text);
  if (rawXml) {
    const xml = rawXml[1].trim();
    const displayText = text.replace(rawXml[0], "").trim() || "Ich habe eine XML-Prozessdefinition erzeugt:";
    return { displayText, xml };
  }
  return { displayText: text, xml: undefined };
}

async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.data as { id: string }[])?.map((m) => m.id) ?? [];
}

export function ChatPanel({
  width,
  processContext,
  currentXml,
  onApplyXml,
  onModelChange,
}: {
  width: number;
  processContext: ProcessContext;
  currentXml: string;
  onApplyXml: (xml: string) => void;
  onModelChange: (model: string) => void;
}) {
  const [messages, setMessages] = useState<DisplayMsg[]>([
    {
      role: "ai",
      text: "Hi! Beschreibe den Prozess, den du modellieren möchtest. Ich erzeuge daraus eine XML-Prozessdefinition.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const historyRef = useRef<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const config = resolveConfig(processContext.meta);
  const currentModel = config.model;

  useEffect(() => {
    fetchModels(config.baseUrl, config.apiKey).then(setModels).catch(() => {});
    // re-fetch when baseUrl or apiKey changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.baseUrl, config.apiKey]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", text }]);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setLoading(true);

    try {
      const provider = createProvider(config);
      const apiMessages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(currentXml.trim()
          ? [{ role: "system" as const, content: `Aktueller Prozess im Designer:\n\`\`\`xml\n${currentXml}\n\`\`\`\n\nPasse diesen Prozess bei Änderungswünschen des Nutzers gezielt an und gib immer den vollständigen aktualisierten XML-Block aus.` }]
          : []),
        ...historyRef.current,
      ];
      const response = await provider.chat(apiMessages);

      const { displayText, xml: xmlString } = extractXml(response);

      historyRef.current = [
        ...historyRef.current,
        { role: "assistant", content: response },
      ];
      setMessages((m) => [
        ...m,
        { role: "ai", text: displayText, xml: xmlString },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [
        ...m,
        { role: "ai", text: `Fehler: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex h-full flex-col border-l border-border bg-sidebar text-sidebar-foreground" style={{ width }}>
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-semibold">KI-Assistent</h3>
        </div>
        {models.length > 0 ? (
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="rounded-md border border-border bg-input px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/60 max-w-[160px]"
            title="Modell wechseln"
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <span className="text-[11px] text-muted-foreground truncate max-w-[160px]" title={currentModel}>
            {currentModel}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary/15 text-foreground whitespace-pre-wrap"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {m.role === "user" ? m.text : renderMarkdown(m.text)}
              {m.xml && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                        try {
                          onApplyXml(m.xml!);
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : String(err);
                          setMessages((prev) => [...prev, { role: "ai", text: `XML-Fehler: ${msg}` }]);
                        }
                      }}
                    className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
                  >
                    Als Graph übernehmen
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              <span className="animate-pulse">…</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-sidebar-border p-2">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !loading) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Beschreibe deinen Prozess… "
            disabled={loading}
            rows={1}
            className="flex-1 rounded-md border border-border bg-input px-3 py-1.5 text-sm outline-none focus:border-primary/60 disabled:opacity-50"
            style={{ resize: "none", overflow: "hidden" }}
          />
          <button
            onClick={send}
            disabled={loading}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Senden
          </button>
        </div>
      </div>
    </aside>
  );
}
