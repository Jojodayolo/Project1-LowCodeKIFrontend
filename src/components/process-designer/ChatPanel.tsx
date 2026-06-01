import React, { useEffect, useRef, useState } from "react";
import { createProvider, resolveConfig, resolveJudgeConfig, type ChatMessage } from "@/lib/ai";
import { buildFewShotMessages } from "@/lib/ai/few-shot-examples";
import type { ProcessContext } from "./types";

type MsgRole = "user" | "ai" | "judge" | "info";

interface DisplayMsg {
  role: MsgRole;
  text: string;
  xml?: string;
}

const SYSTEM_PROMPT = `Du bist ein Assistent für einen visuellen KI-Prozessdesigner.
Du hilfst dabei, KI-Workflows als XML zu modellieren.
Antworte immer auf Deutsch.

## ABSOLUTES VERBOT
Schreibe NIEMALS: Python-Code, JavaScript, Pseudocode, JSON, Tabellen, Codeblöcke mit einer anderen Sprache als xml, oder allgemeine Erklärungen ohne XML.
Du bist kein Programmierer und kein Tutor. Du erzeugst ausschließlich XML-Prozessdefinitionen.
Falls dein nächster Satz mit "import", "def ", "class ", oder einem Code-Block in einer anderen Sprache als XML beginnen würde – lösche ihn und schreibe stattdessen XML.

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

const JUDGE_SYSTEM_PROMPT = `Du bist ein strenger LLM-Judge für KI-Prozessdefinitionen im XML-Format.
Deine Aufgabe: Bewerte präzise und kritisch wie gut eine generierte XML-Prozessdefinition die Anforderungen des Nutzers erfüllt.
Sei bewusst streng – ein Score über 85 ist nur für nahezu perfekte Definitionen gerechtfertigt.

Bewertungskriterien (jeweils 0-25 Punkte, zusammen 0-100):

1. Strukturelle Vollständigkeit
   - Sind alle Pflicht-Elemente vorhanden: <process>, <variables>, <containers>, <outputs>, <steps>?
   - Hat jeder <step> einen eindeutigen name, ein <system>- und ein <prompt>-Tag?
   - Hat jeder <step> der Daten produziert ein writeTo-Attribut? Hat jeder der Daten liest ein readFrom?
   - Sind alle referenzierten Container auch in <containers> deklariert?
   - Abzug: Fehlende Pflicht-Elemente, undefinierte Container, fehlende writeTo/readFrom → bis zu -25

2. Vollständigkeit der Anforderungen
   - Sind ALLE vom Nutzer genannten Anforderungen als Steps modelliert?
   - Sind alle notwendigen Variablen (<var>) und Zwischenspeicher (<container>) vorhanden?
   - Sind Outputs definiert?
   - Abzug: Fehlende Steps, fehlende Variablen, fehlende Container → bis zu -25

3. Datenfluss & Logik
   - Werden readFrom/writeTo bei jedem Step korrekt eingesetzt?
   - Referenzieren Prompts nur Container/Variablen die vorher befüllt wurden?
   - Sind loopOver-Steps sinnvoll auf existierende Container bezogen?
   - Abzug: Broken references, fehlende readFrom/writeTo, inkonsistenter Fluss → bis zu -25

4. Qualität der Prompts & Schemata
   - Sind system- und user-Prompts präzise und auf den jeweiligen Step zugeschnitten?
   - Sind response_schema-Felder vollständig und korrekt als Pydantic-Modell definiert?
   - Werden {{variablen}} korrekt eingesetzt?
   - Abzug: Generische Prompts, fehlende Schemata, falsche Platzhalter → bis zu -25

Antworte EXAKT in diesem Format – kein weiterer Text davor oder danach:
SCORE: [Ganzzahl 0-100]
FEEDBACK:
MÄNGEL:
- [Schwerwiegendster Mangel mit betroffener Stelle, z.B. "Step 'analyze': writeTo fehlt"]
- [Nächster Mangel]
- [...]
ÄNDERUNGEN:
- [Konkrete Anweisung was geändert werden muss, z.B. "Füge writeTo='results' zu Step 'analyze' hinzu"]
- [Konkrete Anweisung]
- [...]`;

function parseJudgeResponse(text: string): { score: number; feedback: string } {
  const scoreMatch = /SCORE:\s*(\d+(?:\.\d+)?)/i.exec(text);
  const feedbackMatch = /FEEDBACK:\s*([\s\S]+)/i.exec(text);
  return {
    score: Math.min(100, Math.max(0, scoreMatch ? parseFloat(scoreMatch[1]) : 0)),
    feedback: feedbackMatch ? feedbackMatch[1].trim() : text.trim(),
  };
}

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

const XML_PATTERN = /((?:<\?xml[\s\S]*?)?<process[\s\S]*?<\/process>)/i;

function extractXml(text: string): { displayText: string; xml: string | undefined } {
  const codeBlock = /```xml\s*([\s\S]+?)```/i.exec(text);
  if (codeBlock) {
    // LLMs sometimes write prose before the actual XML inside the code block
    const inner = XML_PATTERN.exec(codeBlock[1]);
    const xml = inner ? inner[1].trim() : undefined;
    const displayText = text.replace(codeBlock[0], "").trim() || "Ich habe eine XML-Prozessdefinition erzeugt:";
    return { displayText, xml };
  }
  const rawXml = XML_PATTERN.exec(text);
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

  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judgeModel, setJudgeModel] = useState("");
  const [judgeModels, setJudgeModels] = useState<string[]>([]);
  const [stopMode, setStopMode] = useState<"score" | "iterations">("score");
  const [scoreTarget, setScoreTarget] = useState(80);
  const [maxIter, setMaxIter] = useState(3);

  const [expandedJudge, setExpandedJudge] = useState<Set<number>>(new Set());

  const historyRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.baseUrl, config.apiKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch judge models when judge is enabled
  useEffect(() => {
    if (!judgeEnabled) return;
    const judgeConfig = resolveJudgeConfig(processContext.meta);
    fetchModels(judgeConfig.baseUrl, judgeConfig.apiKey).then((ms) => {
      setJudgeModels(ms);
      setJudgeModel((prev) => (prev && ms.includes(prev) ? prev : ms[0] ?? ""));
    }).catch(() => setJudgeModels([]));
  }, [judgeEnabled, processContext.meta]);

  const abort = () => {
    abortRef.current?.abort();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", text }]);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setLoading(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const addMsg = (msg: DisplayMsg) => setMessages((m) => [...m, msg]);

    try {
      const provider = createProvider(config);
      const isFirstMessage = historyRef.current.length === 1;
      const apiMessages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(currentXml.trim()
          ? [{ role: "system" as const, content: `Aktueller Prozess im Designer:\n\`\`\`xml\n${currentXml}\n\`\`\`\n\nPasse diesen Prozess bei Änderungswünschen des Nutzers gezielt an und gib immer den vollständigen aktualisierten XML-Block aus.` }]
          : []),
        ...(isFirstMessage ? buildFewShotMessages() : []),
        ...historyRef.current,
      ];

      const response = await provider.chat(apiMessages, ac.signal);
      const { displayText, xml: xmlString } = extractXml(response);
      historyRef.current = [...historyRef.current, { role: "assistant", content: response }];
      addMsg({ role: "ai", text: displayText, xml: xmlString });

      if (judgeEnabled && xmlString && judgeModel) {
        const judgeConfig = {
          ...resolveJudgeConfig(processContext.meta),
          model: judgeModel,
        };
        const judgeProvider = createProvider(judgeConfig);

        // Collect all user messages so the judge sees the full accumulated requirements
        const fullRequirements = historyRef.current
          .filter((m) => m.role === "user")
          .map((m, i) => `[Nachricht ${i + 1}]: ${m.content}`)
          .join("\n\n");

        let currentXmlStr = xmlString;
        let bestXmlStr = xmlString;
        let bestScore = -1;
        const limit = stopMode === "iterations" ? maxIter : 10;
        let loopEndedCleanly = false;

        for (let iter = 1; iter <= limit; iter++) {
          if (ac.signal.aborted) break;

          addMsg({ role: "info", text: `⟳ Iteration ${iter}${stopMode === "iterations" ? ` von ${maxIter}` : ""}: Judge bewertet XML…` });

          let judgeResponse: string;
          try {
            judgeResponse = await judgeProvider.chat(
              [
                { role: "system", content: JUDGE_SYSTEM_PROMPT },
                { role: "user", content: `Nutzerbeschreibungen (alle Nachrichten der Konversation):\n${fullRequirements}\n\nGenerierte XML:\n\`\`\`xml\n${currentXmlStr}\n\`\`\`` },
              ],
              ac.signal,
            );
          } catch {
            if (ac.signal.aborted) break;
            throw new Error("Judge-LLM hat einen Fehler zurückgegeben.");
          }

          if (ac.signal.aborted) break;

          const { score, feedback } = parseJudgeResponse(judgeResponse);
          const isBest = score > bestScore;
          if (isBest) {
            bestScore = score;
            bestXmlStr = currentXmlStr;
          }
          addMsg({ role: "judge", text: `**Score: ${score}/100**${isBest ? " ★ bisher bestes Ergebnis" : ""}\n\n${feedback}` });

          const goalReached =
            stopMode === "score" ? score >= scoreTarget : iter >= maxIter;

          if (goalReached) {
            addMsg({
              role: "info",
              text: stopMode === "score"
                ? `✓ Ziel erreicht: Score ${score}/100 ≥ ${scoreTarget}/100`
                : `✓ ${maxIter} Iterationen abgeschlossen`,
            });
            loopEndedCleanly = true;
            break;
          }

          if (ac.signal.aborted) break;

          let improvedResponse: string;
          try {
            improvedResponse = await provider.chat(
              [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: text },
                { role: "assistant", content: `\`\`\`xml\n${currentXmlStr}\n\`\`\`` },
                {
                  role: "user",
                  content: `Die bisherige XML hat folgende Mängel die behoben werden müssen:\n\n${feedback}\n\nErstelle eine vollständig überarbeitete XML die ALLE genannten Änderungen umsetzt. Wichtig: Achte auf korrekte XML-Syntax – jeder öffnende Tag (<step>, <system>, <prompt> usw.) muss exakt einen passenden schließenden Tag haben. Gib die komplette XML aus – keine partiellen Edits, keine Erklärungen, nur die fertige XML.`,
                },
              ],
              ac.signal,
            );
          } catch {
            if (ac.signal.aborted) break;
            throw new Error("Generator-LLM hat beim Verbessern einen Fehler zurückgegeben.");
          }

          if (ac.signal.aborted) break;

          const { displayText: improvedText, xml: improvedXml } = extractXml(improvedResponse);
          if (improvedXml) {
            currentXmlStr = improvedXml;
            historyRef.current = [...historyRef.current, { role: "assistant", content: improvedResponse }];
          }
          addMsg({ role: "ai", text: improvedText, xml: improvedXml });
        }

        if (ac.signal.aborted) {
          addMsg({ role: "info", text: "⊘ Prozess abgebrochen." });
          if (bestScore >= 0) {
            addMsg({ role: "ai", text: `Bestes Ergebnis vor Abbruch (Score: ${bestScore}/100):`, xml: bestXmlStr });
          }
        } else if (loopEndedCleanly) {
          addMsg({
            role: "ai",
            text: `Bestes Ergebnis nach Judge-Optimierung (Score: ${bestScore}/100):`,
            xml: bestXmlStr,
          });
        } else if (bestScore >= 0) {
          addMsg({ role: "info", text: `Maximale Iterationen erreicht (bester Score: ${bestScore}/100).` });
          addMsg({ role: "ai", text: "Bestes erreichtes Ergebnis:", xml: bestXmlStr });
        }
      }
    } catch (err) {
      if (ac.signal.aborted) {
        addMsg({ role: "info", text: "⊘ Prozess abgebrochen." });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        addMsg({ role: "ai", text: `Fehler: ${msg}` });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <aside className="flex h-full flex-col border-l border-border bg-sidebar text-sidebar-foreground" style={{ width }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-semibold">KI-Assistent</h3>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          {models.length > 0 ? (
            <select
              value={currentModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="rounded-md border border-border bg-input px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/60 max-w-[140px] truncate"
              title="Modell wechseln"
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] text-muted-foreground truncate max-w-[130px]" title={currentModel}>
              {currentModel}
            </span>
          )}
          <button
            onClick={() => setJudgeEnabled((v) => !v)}
            title={judgeEnabled ? "LLM-as-a-Judge deaktivieren" : "LLM-as-a-Judge aktivieren"}
            className={`shrink-0 rounded-md px-1.5 py-1 text-[13px] border transition-colors ${
              judgeEnabled
                ? "border-amber-500/60 bg-amber-500/15 text-amber-600"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚖️
          </button>
        </div>
      </div>

      {/* Judge Settings Panel */}
      {judgeEnabled && (
        <div className="border-b border-sidebar-border bg-amber-500/5 px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground shrink-0 w-16">Modell:</span>
            {judgeModels.length > 0 ? (
              <select
                value={judgeModel}
                onChange={(e) => setJudgeModel(e.target.value)}
                className="flex-1 rounded-md border border-border bg-input px-2 py-0.5 text-[11px] text-foreground outline-none focus:border-amber-500/60 min-w-0"
              >
                {judgeModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={judgeModel}
                onChange={(e) => setJudgeModel(e.target.value)}
                placeholder="Modell-ID eingeben…"
                className="flex-1 rounded-md border border-border bg-input px-2 py-0.5 text-[11px] text-foreground outline-none focus:border-amber-500/60 min-w-0"
              />
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] text-muted-foreground shrink-0">Stopp bei:</span>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <input
                type="radio"
                name="stopMode"
                checked={stopMode === "score"}
                onChange={() => setStopMode("score")}
                className="accent-amber-500"
              />
              Score ≥
              <input
                type="number"
                min={1}
                max={100}
                value={scoreTarget}
                onChange={(e) => setScoreTarget(Math.min(100, Math.max(1, Number(e.target.value))))}
                disabled={stopMode !== "score"}
                className="w-10 rounded border border-border bg-input px-1 py-0.5 text-[11px] text-center outline-none focus:border-amber-500/60 disabled:opacity-40"
              />
            </label>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <input
                type="radio"
                name="stopMode"
                checked={stopMode === "iterations"}
                onChange={() => setStopMode("iterations")}
                className="accent-amber-500"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={maxIter}
                onChange={(e) => setMaxIter(Math.min(10, Math.max(1, Number(e.target.value))))}
                disabled={stopMode !== "iterations"}
                className="w-10 rounded border border-border bg-input px-1 py-0.5 text-[11px] text-center outline-none focus:border-amber-500/60 disabled:opacity-40"
              />
              Iterationen
            </label>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => {
          if (m.role === "info") {
            return (
              <div key={i} className="flex justify-center">
                <span className="text-[11px] text-muted-foreground italic">{m.text}</span>
              </div>
            );
          }

          if (m.role === "judge") {
            const isExpanded = expandedJudge.has(i);
            const scoreLine = m.text.split("\n\n")[0];
            return (
              <div key={i} className="flex justify-start">
                <div
                  className="max-w-[90%] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground cursor-pointer select-none"
                  onClick={() =>
                    setExpandedJudge((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    })
                  }
                >
                  <div className="flex items-center justify-between gap-2 text-amber-600 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>⚖️</span>
                      <span>Judge-Bewertung</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {renderMarkdown(scoreLine)}
                      <span className="text-[10px] opacity-60">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 border-t border-amber-500/20 pt-2">
                      {renderMarkdown(m.text.split("\n\n").slice(1).join("\n\n"))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
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
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              <span className="animate-pulse">…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
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
          {loading ? (
            <button
              onClick={abort}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
            >
              Abbrechen
            </button>
          ) : (
            <button
              onClick={send}
              disabled={loading}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Senden
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
