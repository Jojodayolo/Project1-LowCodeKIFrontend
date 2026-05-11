import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ProcessNodeData } from "./types";

const ACCENT = "var(--node-step, oklch(0.65 0.15 250))";

export function ProcessNode({ data, selected }: NodeProps) {
  const d = data as unknown as ProcessNodeData;

  return (
    <div
      className="rounded-lg border bg-card text-card-foreground shadow-md transition-all min-w-[200px]"
      style={{
        borderColor: selected ? ACCENT : "var(--color-border)",
        boxShadow: selected ? `0 0 0 2px oklch(0.65 0.15 250 / 0.2), 0 8px 24px -8px oklch(0.65 0.15 250 / 0.4)` : undefined,
      }}
    >
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide"
        style={{ background: `color-mix(in oklab, ${ACCENT} 22%, transparent)`, color: ACCENT }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />
        Step
      </div>
      <div className="px-3 py-2">
        <div className="text-sm font-medium text-foreground">{d.name}</div>
        {d.readFrom && (
          <div className="mt-1 text-[11px] text-muted-foreground">
            <span className="opacity-60">read:</span> {d.readFrom}
          </div>
        )}
        {d.writeTo && (
          <div className="text-[11px] text-muted-foreground">
            <span className="opacity-60">write:</span> {d.writeTo}
          </div>
        )}
        {d.loop && d.loopOver && (
          <div className="text-[11px] text-muted-foreground">
            <span className="opacity-60">loop:</span> {d.loopOver}
          </div>
        )}
        {d.fromAgents && (
          <div className="text-[11px] text-muted-foreground">
            <span className="opacity-60">agents:</span> {d.fromAgents}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: ACCENT, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: ACCENT, width: 10, height: 10 }} />
    </div>
  );
}
