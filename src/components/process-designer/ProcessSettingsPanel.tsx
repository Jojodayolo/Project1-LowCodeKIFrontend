import type { ProcessContext, ProcessVariable, ProcessOutput, ProcessAgent } from "./types";

interface Props {
  context: ProcessContext;
  onChange: (ctx: ProcessContext) => void;
  onClose: () => void;
}

export function ProcessSettingsPanel({ context, onChange, onClose }: Props) {
  const { meta, variables, containers, outputs, agents } = context;

  const setMeta = (patch: Partial<typeof meta>) =>
    onChange({ ...context, meta: { ...meta, ...patch } });

  /* ─── Variable helpers ─── */
  const setVar = (i: number, patch: Partial<ProcessVariable>) =>
    onChange({ ...context, variables: variables.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const addVar = () =>
    onChange({ ...context, variables: [...variables, { name: "", defaultValue: "" }] });
  const delVar = (i: number) =>
    onChange({ ...context, variables: variables.filter((_, j) => j !== i) });

  /* ─── Container helpers ─── */
  const setContainer = (i: number, val: string) =>
    onChange({ ...context, containers: containers.map((c, j) => (j === i ? val : c)) });
  const addContainer = () =>
    onChange({ ...context, containers: [...containers, ""] });
  const delContainer = (i: number) =>
    onChange({ ...context, containers: containers.filter((_, j) => j !== i) });

  /* ─── Output helpers ─── */
  const setOut = (i: number, patch: Partial<ProcessOutput>) =>
    onChange({ ...context, outputs: outputs.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
  const addOut = () =>
    onChange({ ...context, outputs: [...outputs, { name: "", type: "json" }] });
  const delOut = (i: number) =>
    onChange({ ...context, outputs: outputs.filter((_, j) => j !== i) });

  /* ─── Agent helpers ─── */
  const setAgent = (i: number, patch: Partial<ProcessAgent>) =>
    onChange({ ...context, agents: agents.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const addAgent = () =>
    onChange({ ...context, agents: [...agents, { role: "" }] });
  const delAgent = (i: number) =>
    onChange({ ...context, agents: agents.filter((_, j) => j !== i) });

  const inputCls = "w-full rounded-md border border-border bg-input px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/60";
  const smInputCls = "flex-1 rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex max-h-[85vh] w-[540px] flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">Prozess-Einstellungen</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Variablen, Outputs, Agents & Metadaten</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none" aria-label="Schließen">×</button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">

          {/* Meta */}
          <Section title="Metadaten">
            <div className="grid grid-cols-3 gap-2">
              <LabeledInput label="Model" value={meta.model ?? ""} onChange={(v) => setMeta({ model: v || undefined })} cls={smInputCls} />
              <LabeledInput label="LLM Host" value={meta.llmHost ?? ""} onChange={(v) => setMeta({ llmHost: v || undefined })} cls={smInputCls} />
              <LabeledInput label="Type" value={meta.type ?? ""} onChange={(v) => setMeta({ type: v || undefined })} cls={smInputCls} />
            </div>
          </Section>

          {/* Variables */}
          <Section title="Variablen" onAdd={addVar}>
            {variables.length === 0 && <Empty>Keine Variablen definiert</Empty>}
            {variables.map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <input className={smInputCls} placeholder="Name" value={v.name} onChange={(e) => setVar(i, { name: e.target.value })} />
                <input className={smInputCls} placeholder="Default" value={v.defaultValue} onChange={(e) => setVar(i, { defaultValue: e.target.value })} />
                <DelBtn onClick={() => delVar(i)} />
              </div>
            ))}
          </Section>

          {/* Containers */}
          <Section title="Container" onAdd={addContainer}>
            {containers.length === 0 && <Empty>Keine Container definiert</Empty>}
            {containers.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={smInputCls} placeholder="Container-Name" value={c} onChange={(e) => setContainer(i, e.target.value)} />
                <DelBtn onClick={() => delContainer(i)} />
              </div>
            ))}
          </Section>

          {/* Outputs */}
          <Section title="Outputs" onAdd={addOut}>
            {outputs.length === 0 && <Empty>Keine Outputs definiert</Empty>}
            {outputs.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={smInputCls} placeholder="Name" value={o.name} onChange={(e) => setOut(i, { name: e.target.value })} />
                <input className={`${smInputCls} max-w-[80px]`} placeholder="Type" value={o.type} onChange={(e) => setOut(i, { type: e.target.value })} />
                <DelBtn onClick={() => delOut(i)} />
              </div>
            ))}
          </Section>

          {/* Agents */}
          <Section title="Agents" onAdd={addAgent}>
            {agents.length === 0 && <Empty>Keine Agents definiert</Empty>}
            {agents.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={smInputCls} placeholder="Role" value={a.role} onChange={(e) => setAgent(i, { role: e.target.value })} />
                <input className={smInputCls} placeholder="Beschreibung" value={a.roleDescription ?? ""} onChange={(e) => setAgent(i, { roleDescription: e.target.value || undefined })} />
                <DelBtn onClick={() => delAgent(i)} />
              </div>
            ))}
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-5 py-3">
          <button onClick={onClose} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tiny helpers ─── */

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {onAdd && (
          <button onClick={onAdd} className="rounded border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/50 transition">+ Hinzufügen</button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground italic">{children}</p>;
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="shrink-0 text-destructive/60 hover:text-destructive text-lg leading-none" title="Entfernen">×</button>
  );
}

function LabeledInput({ label, value, onChange, cls }: { label: string; value: string; onChange: (v: string) => void; cls: string }) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
      <input className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
