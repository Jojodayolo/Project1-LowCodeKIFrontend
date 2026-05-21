import { useCallback, useMemo, useRef, useState } from "react";
import { useCatalog } from "@/lib/useCatalog";
// Import the custom nodes
import { ProcessNode } from "./ProcessNode";
import { AgentNode } from "./AgentNode"; 
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Sidebar } from "./Sidebar";
import { PropertiesPanel } from "./PropertiesPanel";
import { ProcessSettingsPanel } from "./ProcessSettingsPanel";
import { ChatPanel } from "./ChatPanel";
import { ImportXmlDialog } from "./ImportXmlDialog";
import { TEMPLATES } from "./templates";
import type { ProcessNodeData, ProcessContext } from "./types";
import { parseProcessXml } from "./parseProcessXml";
import type { ParseResult } from "./parseProcessXml";

let idCounter = 100;
const nextId = () => `n${++idCounter}`;

const DEFAULT_CONTEXT: ProcessContext = {
  meta: { name: "QOC" },
  variables: [],
  containers: [],
  outputs: [],
  agents: [],
};

function DesignerInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(TEMPLATES.qoc.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(TEMPLATES.qoc.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processCtx, setProcessCtx] = useState<ProcessContext>(DEFAULT_CONTEXT);
  const [showXml, setShowXml] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [chatWidth, setChatWidth] = useState(384);
  const { entries: catalog, save: saveToCatalog, remove: deleteFromCatalog } = useCatalog();

  const startResize = (e: React.MouseEvent, panel: "sidebar" | "chat") => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panel === "sidebar" ? sidebarWidth : chatWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = panel === "sidebar" ? ev.clientX - startX : startX - ev.clientX;
      const next = Math.max(180, Math.min(560, startWidth + delta));
      panel === "sidebar" ? setSidebarWidth(next) : setChatWidth(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

// Register all custom node types used in the canvas
  const nodeTypes = useMemo(() => ({ 
    process: ProcessNode, 
    agent: AgentNode // <-- We register our new AI Agent node here
  }), []);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...c, type: "smoothstep", animated: true, style: { stroke: "var(--color-border)", strokeWidth: 2 } },
          eds,
        ),
      ),
    [setEdges],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow");
      if (!type || !rfInstance) return;
      const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const data: ProcessNodeData = { name: `step_${idCounter + 1}` };

  // We dynamically set the type based on what the user dragged
      const newNode: Node = {
        id: nextId(),
        type: type, // <-- Now it uses the type from the drag event
        position,
        data: data as unknown as Record<string, unknown>,
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance, setNodes],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<ProcessNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedId(null);
    },
    [setNodes, setEdges],
  );

  const loadTemplate = useCallback(
    (t: "qoc" | "stakeholder" | "vester") => {
      const tpl = TEMPLATES[t];
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setSelectedId(null);
      setTimeout(() => rfInstance?.fitView({ padding: 0.2, duration: 600 }), 50);
    },
    [setNodes, setEdges, rfInstance],
  );

  const handleImport = useCallback(
    (result: ParseResult) => {
      setProcessCtx(result.context);
      setNodes(result.nodes);
      setEdges(result.edges);
      setSelectedId(null);
      setShowImport(false);
      setTimeout(() => rfInstance?.fitView({ padding: 0.2, duration: 600 }), 50);
    },
    [setNodes, setEdges, rfInstance],
  );

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  // Order nodes left-to-right by x position (visual order = XML order)
  const orderedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.position.x - b.position.x),
    [nodes],
  );

  const xmlPreview = useMemo(() => {
    const { meta, variables, containers, outputs, agents } = processCtx;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Root element
    const rootAttrs = [
      `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
      `xsi:noNamespaceSchemaLocation="process.xsd"`,
      `name="${esc(meta.name)}"`,
    ];
    if (meta.model) rootAttrs.push(`model="${esc(meta.model)}"`);
    if (meta.llmHost) rootAttrs.push(`llmHost="${esc(meta.llmHost)}"`);
    if (meta.type) rootAttrs.push(`type="${esc(meta.type)}"`);

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<process ${rootAttrs.join("\n         ")}>`,
    ];

    // Variables
    if (variables.length > 0) {
      lines.push("");
      lines.push("  <variables>");
      for (const v of variables) {
        lines.push(`    <var name="${esc(v.name)}">${esc(v.defaultValue)}</var>`);
      }
      lines.push("  </variables>");
    }

    // Containers (from explicit list)
    if (containers.length > 0) {
      lines.push("");
      lines.push("  <containers>");
      for (const c of containers) {
        lines.push(`    <container name="${esc(c)}"/>`);
      }
      lines.push("  </containers>");
    }

    // Outputs
    if (outputs.length > 0) {
      lines.push("");
      lines.push("  <outputs>");
      for (const o of outputs) {
        lines.push(`    <output name="${esc(o.name)}" type="${esc(o.type)}"/>`);
      }
      lines.push("  </outputs>");
    }

    // Agents
    if (agents.length > 0) {
      lines.push("");
      lines.push("  <agents>");
      for (const a of agents) {
        const aAttrs = [`role="${esc(a.role)}"`];
        if (a.roleDescription) aAttrs.push(`roleDescription="${esc(a.roleDescription)}"`);
        lines.push(`    <agent ${aAttrs.join(" ")}/>`);
      }
      lines.push("  </agents>");
    }

    // Steps
    lines.push("");
    lines.push("  <steps>");
    for (const n of orderedNodes) {
      const d = n.data as unknown as ProcessNodeData;
      const readFrom = d.readFrom?.replace(/,/g, " ").replace(/\s+/g, " ").trim();

      const attrs = [`name="${esc(d.name)}"`];
      if (d.loop && d.loopOver) attrs.push(`loopOver="${esc(d.loopOver)}"`);
      if (d.fromAgents) attrs.push(`fromAgents="${esc(d.fromAgents)}"`);
      if (readFrom) attrs.push(`readFrom="${esc(readFrom)}"`);
      if (d.writeTo) attrs.push(`writeTo="${esc(d.writeTo)}"`);

      const hasContent = d.systemPrompt || d.userPrompt || d.schema;
      if (!hasContent) {
        lines.push(`    <step ${attrs.join(" ")}/>`);
      } else {
        lines.push(`    <step ${attrs.join(" ")}>`);
        if (d.systemPrompt) {
          lines.push("      <system>");
          lines.push(`        ${esc(d.systemPrompt)}`);
          lines.push("      </system>");
        }
        if (d.userPrompt) {
          lines.push("      <prompt>");
          lines.push(`        ${esc(d.userPrompt)}`);
          lines.push("      </prompt>");
        }
        if (d.schema) {
          lines.push("      <response_schema>");
          lines.push(`        ${esc(d.schema)}`);
          lines.push("      </response_schema>");
        }
        lines.push("    </step>");
      }
      lines.push("");
    }
    lines.push("  </steps>");
    lines.push("");
    lines.push("</process>");
    return lines.join("\n");
  }, [orderedNodes, processCtx]);


  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center border-b border-border bg-sidebar px-4 py-2.5 gap-2">
        {/* Left: logo */}
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15">
            <div className="h-3 w-3 rounded-sm bg-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">AI Process Designer</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">NoCode-Frontend für KI-gestützte Prozesse</p>
          </div>
        </div>

        {/* Center: process name + save */}
        <div className="flex items-center gap-1.5">
          <input
            value={processCtx.meta.name}
            onChange={(e) => setProcessCtx((c) => ({ ...c, meta: { ...c.meta, name: e.target.value } }))}
            className="rounded-md border border-border bg-input px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-primary/60 w-80 text-center"
            placeholder="Prozessname"
            title="Prozessname (wird im XML verwendet)"
          />
          <button
            onClick={() => saveToCatalog(processCtx.meta.name || "Unbenannt", xmlPreview)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Speichern
          </button>
        </div>

        {/* Right: toolbar buttons */}
        <div className="flex flex-1 items-center justify-end gap-1.5">
          <ToolbarBtn onClick={() => setShowSettings(true)}>Einstellungen</ToolbarBtn>
          <ToolbarBtn onClick={() => setShowImport(true)}>XML Import</ToolbarBtn>
          <ToolbarBtn onClick={() => setShowXml((v) => !v)}>{showXml ? "XML schließen" : "XML Vorschau"}</ToolbarBtn>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          width={sidebarWidth}
          onLoadTemplate={loadTemplate}
          catalog={catalog}
          onLoadCatalog={(xml) => handleImport(parseProcessXml(xml))}
          onDeleteCatalog={deleteFromCatalog}
        />
        <div
          className="w-1 cursor-col-resize shrink-0 hover:bg-primary/40 active:bg-primary/60 transition-colors"
          onMouseDown={(e) => startResize(e, "sidebar")}
        />

        <div className="relative flex-1" ref={wrapperRef} style={{ background: "var(--canvas)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="oklch(0.30 0.02 260)" />
            <Controls />
            <MiniMap
              pannable
              zoomable
              maskColor="oklch(0.13 0.02 260 / 0.7)"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
              nodeColor={() => "oklch(0.65 0.15 250)"}
            />
          </ReactFlow>

          {showXml && (
            <div className="pointer-events-auto absolute left-4 top-4 z-20 max-h-[70vh] w-[460px] overflow-auto rounded-lg border border-border bg-popover/95 p-3 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">XML Vorschau</h3>
                <button onClick={() => setShowXml(false)} className="text-muted-foreground hover:text-foreground">×</button>
              </div>
              <pre className="text-[11px] leading-snug text-foreground/90 font-mono">{xmlPreview}</pre>
            </div>
          )}

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-end border-t border-border bg-sidebar/90 px-4 py-1.5 text-[11px] text-muted-foreground backdrop-blur gap-4">
            <span>Knoten: {nodes.length}</span>
            <span>Kanten: {edges.length}</span>
          </div>

        </div>

        <div
          className="w-1 cursor-col-resize shrink-0 hover:bg-primary/40 active:bg-primary/60 transition-colors"
          onMouseDown={(e) => startResize(e, "chat")}
        />
        <ChatPanel
          width={chatWidth}
          processContext={processCtx}
          currentXml={xmlPreview}
          onApplyXml={(xml) => handleImport(parseProcessXml(xml))}
          onModelChange={(model) => setProcessCtx((c) => ({ ...c, meta: { ...c.meta, model } }))}
        />

        <PropertiesPanel
          node={selectedNode}
          containers={processCtx.containers}
          onChange={updateNode}
          onDelete={deleteNode}
          onClose={() => setSelectedId(null)}
        />
      </div>

      {showImport && (
        <ImportXmlDialog
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showSettings && (
        <ProcessSettingsPanel
          context={processCtx}
          onChange={setProcessCtx}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function ToolbarBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-accent transition"
    >
      {children}
    </button>
  );
}

export function Designer() {
  return (
    <ReactFlowProvider>
      <DesignerInner />
    </ReactFlowProvider>
  );
}
