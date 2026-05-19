import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ProcessNodeData } from "./types";

// We define a nice purple color for our AI Agent node
const ACCENT_AGENT = "var(--node-agent, oklch(0.60 0.15 300))";

export function AgentNode({ data, selected }: NodeProps) {
  // We extract the data passed to this specific node
  const d = data as unknown as ProcessNodeData;

  return (
    <div
      className="rounded-lg border bg-card text-card-foreground shadow-md transition-all min-w-[200px]"
      style={{
        borderColor: selected ? ACCENT_AGENT : "var(--color-border)",
        boxShadow: selected ? `0 0 0 2px oklch(0.60 0.15 300 / 0.2), 0 8px 24px -8px oklch(0.60 0.15 300 / 0.4)` : undefined,
      }}
    >
      {/* Node Header */}
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide"
        style={{ background: `color-mix(in oklab, ${ACCENT_AGENT} 22%, transparent)`, color: ACCENT_AGENT }}
      >
        <span>🤖</span> {/* A little robot icon */}
        KI-Agent
      </div>
      
      {/* Node Body (The content inside) */}
      <div className="px-3 py-2">
        <div className="text-sm font-medium text-foreground">{d.name || "Unbenannter Agent"}</div>
        
        {/* If the agent has a role assigned, we display it */}
        {d.fromAgents && (
          <div className="mt-1 text-[11px] text-muted-foreground">
            <span className="opacity-60">Rolle:</span> {d.fromAgents}
          </div>
        )}
      </div>

      {/* The connection points (Handles) for the arrows */}
      <Handle type="target" position={Position.Left} style={{ background: ACCENT_AGENT, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: ACCENT_AGENT, width: 10, height: 10 }} />
    </div>
  );
}