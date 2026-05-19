interface Props {
  onLoadTemplate: (template: "qoc" | "stakeholder" | "vester") => void;
}

export function Sidebar({ onLoadTemplate }: Props) {
  // We add a 'nodeType' parameter so the function knows which block is being dragged
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prozesskatalog
        </h2>
        <div className="mt-2 space-y-1">
          {[
            { id: "qoc", label: "QOC – Bewertungsprozess" },
            { id: "stakeholder", label: "Stakeholder-Analyse" },
            { id: "vester", label: "Vester / Sensitivität" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onLoadTemplate(t.id as "qoc" | "stakeholder" | "vester")}
              className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-1.5 text-left text-sm text-sidebar-accent-foreground hover:bg-sidebar-accent transition"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Bausteine
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Auf die Canvas ziehen
        </p>
        
        {/* We add space-y-2 here to create a gap between our blocks */}
        <div className="mt-3 space-y-2">
          
          {/* --- 1. THE ORIGINAL 'Step' BLOCK --- */}
          <div
            draggable
            onDragStart={(e) => onDragStart(e, "process")} // <-- Dragging a 'process' node
            className="group cursor-grab rounded-md border border-sidebar-border bg-card px-3 py-2 active:cursor-grabbing hover:border-primary/40 transition"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--node-step, oklch(0.65 0.15 250))" }}
              />
              <span className="text-sm font-medium">Step</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Prozessschritt mit Prompt, Schema & Datenfluss
            </p>
          </div>

          {/* --- 2. OUR NEW 'Agent IA' BLOCK --- */}
          <div
            draggable
            onDragStart={(e) => onDragStart(e, "agent")} // <-- Dragging an 'agent' node
            className="group cursor-grab rounded-md border border-sidebar-border bg-card px-3 py-2 active:cursor-grabbing hover:border-primary/40 transition"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--node-agent, oklch(0.60 0.15 300))" }}
              />
              <span className="text-sm font-medium">KI-Agent</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Führt einen spezifischen Prompt via LLM aus
            </p>
          </div>

        </div>
      </div>
    </aside>
  );
}