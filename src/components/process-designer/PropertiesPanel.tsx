import { useEffect, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import type { ProcessNodeData } from "./types";

interface Props {
  node: Node | null;
  containers: string[];
  onChange: (id: string, patch: Partial<ProcessNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function PropertiesPanel({ node, containers, onChange, onDelete, onClose }: Props) {
  if (!node) return null;

  const d = node.data as unknown as ProcessNodeData;
  
  // --- AJOUT : On détecte si le composant sélectionné est un KI-Agent
  const isAgent = node.type === "agent";

  const Field = ({ label, value, onUpdate, multiline = false, mono = false }: {
    label: string;
    value: string | undefined;
    onUpdate: (v: string) => void;
    multiline?: boolean;
    mono?: boolean;
  }) => {
    const cls = `w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/60 ${mono ? "font-mono text-xs" : ""}`;
    return (
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {multiline ? (
          <textarea rows={4} className={cls} value={value ?? ""} onChange={(e) => onUpdate(e.target.value)} />
        ) : (
          <input className={cls} value={value ?? ""} onChange={(e) => onUpdate(e.target.value)} />
        )}
      </div>
    );
  };

  /** Multi-select dropdown: space-separated container names */
  const MultiContainerSelect = ({ label, value, onUpdate }: {
    label: string;
    value: string | undefined;
    onUpdate: (v: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = new Set(value?.split(/[\s,]+/).filter(Boolean) ?? []);

    const toggle = (c: string) => {
      const next = new Set(selected);
      if (next.has(c)) next.delete(c); else next.add(c);
      onUpdate(Array.from(next).join(" "));
    };

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const summary = selected.size > 0 ? Array.from(selected).join(", ") : "— keine —";

    return (
      <div ref={ref} className="relative">
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
        {containers.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">Keine Container definiert — unter Einstellungen anlegen</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-input px-2.5 py-1.5 text-sm text-foreground outline-none hover:border-primary/50 focus:border-primary/60 transition text-left"
            >
              <span className={selected.size === 0 ? "text-muted-foreground" : ""}>{summary}</span>
              <span className="text-muted-foreground text-xs ml-2">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div className="absolute left-0 right-0 z-10 mt-1 rounded-md border border-border bg-popover py-1 shadow-lg max-h-48 overflow-y-auto">
                {containers.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent transition"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c)}
                      onChange={() => toggle(c)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                    />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  /** Single-select dropdown for one container */
  const SingleContainerSelect = ({ label, value, onUpdate, placeholder }: {
    label: string;
    value: string | undefined;
    onUpdate: (v: string) => void;
    placeholder: string;
  }) => (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
      <select
        className="w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/60"
        value={value ?? ""}
        onChange={(e) => onUpdate(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {containers.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-[480px] flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* --- DYNAMIC HEADER --- */}
        <div className="flex items-start justify-between border-b border-border px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="h-2.5 w-2.5 rounded-full" 
                style={{ 
                  background: isAgent ? "var(--node-agent, oklch(0.60 0.15 300))" : "var(--node-step, oklch(0.65 0.15 250))" 
                }} 
              />
              <h2 className="text-sm font-semibold">
                Eigenschaften · {isAgent ? "KI-Agent" : "Step"}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isAgent ? "KI-Agenten konfigurieren" : "Prozessschritt konfigurieren"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        {/* --- DYNAMIC BODY --- */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <Field label="Name" value={d.name} onUpdate={(v) => onChange(node.id, { name: v })} />

          {isAgent ? (
            /* --- FIELDS FOR AI AGENT --- */
            <>
              <Field 
                label="Rolle (z.B. Marketing Experte)" 
                value={d.fromAgents} 
                onUpdate={(v) => onChange(node.id, { fromAgents: v })} 
              />
              <Field 
                label="System Prompt (Anweisungen für die KI)" 
                value={d.systemPrompt} 
                multiline 
                onUpdate={(v) => onChange(node.id, { systemPrompt: v })} 
              />
              <Field 
                label="User Prompt (Die eigentliche Frage)" 
                value={d.userPrompt} 
                multiline 
                onUpdate={(v) => onChange(node.id, { userPrompt: v })} 
              />
            </>
          ) : (
            /* --- FIELDS FOR STANDARD STEP --- */
            <>
              <MultiContainerSelect label="readFrom" value={d.readFrom} onUpdate={(v) => onChange(node.id, { readFrom: v })} />
              <MultiContainerSelect label="writeTo" value={d.writeTo} onUpdate={(v) => onChange(node.id, { writeTo: v })} />
              <Field label="fromAgents" value={d.fromAgents} onUpdate={(v) => onChange(node.id, { fromAgents: v })} />

              <div>
                <label className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!d.loop}
                    onChange={(e) => onChange(node.id, { loop: e.target.checked, loopOver: e.target.checked ? d.loopOver : undefined })}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  Loop
                </label>
                {d.loop && (
                  <SingleContainerSelect
                    label=""
                    value={d.loopOver}
                    onUpdate={(v) => onChange(node.id, { loopOver: v })}
                    placeholder="Container wählen…"
                  />
                )}
              </div>

              <Field label="System Prompt" value={d.systemPrompt} multiline onUpdate={(v) => onChange(node.id, { systemPrompt: v })} />
              <Field label="User Prompt" value={d.userPrompt} multiline onUpdate={(v) => onChange(node.id, { userPrompt: v })} />
              <Field label="Response Schema" value={d.schema} multiline mono onUpdate={(v) => onChange(node.id, { schema: v })} />
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            onClick={() => { onDelete(node.id); onClose(); }}
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/20 transition"
          >
            Knoten löschen
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}