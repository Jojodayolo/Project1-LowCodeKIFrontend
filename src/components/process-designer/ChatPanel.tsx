import { useState } from "react";

interface Msg { role: "user" | "ai"; text: string; xml?: boolean }

export function ChatPanel({ onApplyTemplate }: { onApplyTemplate: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "Hi! Beschreibe den Prozess, den du modellieren möchtest. Ich erzeuge daraus eine XML-Prozessdefinition." },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", text: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text:
            "Ich schlage einen QOC-Prozess vor:\n1. Kontext erfassen\n2. Stakeholder identifizieren\n3. Optionen sammeln\n4. Kriterien sammeln & konsolidieren\n5. Optionen bewerten\n6. Ergebnisbericht\n\nXML wurde erzeugt – möchtest du sie als Graph übernehmen?",
          xml: true,
        },
      ]);
    }, 600);
  };

  return (
    <aside className="flex h-full w-96 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold leading-tight">KI-Assistent</h3>
            <p className="text-[11px] text-muted-foreground leading-tight">Erzeugt & ändert XML-Prozesse</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary/15 text-foreground"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {m.text}
              {m.xml && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button className="rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-primary/50">XML-Diff</button>
                  <button onClick={onApplyTemplate} className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90">Als Graph übernehmen</button>
                  <button className="rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-destructive/50">Verwerfen</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-sidebar-border p-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Beschreibe deinen Prozess…"
            className="flex-1 rounded-md border border-border bg-input px-3 py-1.5 text-sm outline-none focus:border-primary/60"
          />
          <button onClick={send} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Senden
          </button>
        </div>
      </div>
    </aside>
  );
}
