import type { Edge, Node } from "@xyflow/react";
import type {
  ProcessNodeData,
  ProcessContext,
  ProcessVariable,
  ProcessOutput,
  ProcessAgent,
} from "./types";

export interface ParseResult {
  context: ProcessContext;
  nodes: Node[];
  edges: Edge[];
}

const edgeStyle = { stroke: "var(--color-border)", strokeWidth: 2 };

/**
 * Parse the process XML format and produce ReactFlow nodes + edges.
 *
 * Steps become a linear chain in the order they appear in the XML.
 * Also extracts variables, outputs, agents, and process-level attributes.
 */
export function parseProcessXml(xml: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Ungültiges XML: " + parseError.textContent?.slice(0, 200));
  }

  const processEl = doc.querySelector("process");
  if (!processEl) throw new Error('Kein <process>-Element gefunden.');

  // Process-level attributes
  const context: ProcessContext = {
    meta: {
      name: processEl.getAttribute("name") ?? "Unnamed",
      model: processEl.getAttribute("model") || undefined,
      llmHost: processEl.getAttribute("llmHost") || undefined,
      type: processEl.getAttribute("type") || undefined,
    },
    variables: [],
    containers: [],
    outputs: [],
    agents: [],
  };

  // Parse <variables>
  for (const el of Array.from(doc.querySelectorAll("variables > var"))) {
    context.variables.push({
      name: el.getAttribute("name") ?? "",
      defaultValue: el.textContent?.trim() ?? "",
    });
  }

  // Parse <containers>
  for (const el of Array.from(doc.querySelectorAll("containers > container"))) {
    const name = el.getAttribute("name");
    if (name) context.containers.push(name);
  }

  // Parse <outputs>
  for (const el of Array.from(doc.querySelectorAll("outputs > output"))) {
    context.outputs.push({
      name: el.getAttribute("name") ?? "",
      type: el.getAttribute("type") ?? "json",
    });
  }

  // Parse <agents>
  for (const el of Array.from(doc.querySelectorAll("agents > agent"))) {
    context.agents.push({
      role: el.getAttribute("role") ?? "",
      roleDescription: el.getAttribute("roleDescription") || undefined,
    });
  }

  // Parse steps
  const stepEls = Array.from(doc.querySelectorAll("steps > step"));
  if (stepEls.length === 0) throw new Error("Keine <step>-Elemente gefunden.");

  const X_GAP = 300;

  const steps: { id: string; data: ProcessNodeData }[] = stepEls.map((el, i) => {
    const name = el.getAttribute("name") ?? `step_${i + 1}`;
    const readFrom = el.getAttribute("readFrom") || undefined;
    const writeTo = el.getAttribute("writeTo") || undefined;
    const loopOver = el.getAttribute("loopOver") || undefined;
    const fromAgents = el.getAttribute("fromAgents") || undefined;

    const textOf = (tag: string): string | undefined => {
      const child = el.querySelector(tag);
      return child?.textContent?.trim() || undefined;
    };

    const data: ProcessNodeData = {
      name,
      readFrom,
      writeTo,
      loop: !!loopOver,
      loopOver,
      fromAgents,
      systemPrompt: textOf("system"),
      userPrompt: textOf("prompt"),
      schema: textOf("response_schema"),
    };

    return { id: `imp_${i}`, data };
  });

  // Nodes laid out left-to-right in XML order
  const nodes: Node[] = steps.map((s, i) => ({
    id: s.id,
    type: "process",
    position: { x: i * X_GAP + 40, y: 80 },
    data: s.data as unknown as Record<string, unknown>,
  }));

  // Sequential edges: each step connects to the next
  const edges: Edge[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    edges.push({
      id: `${steps[i].id}-${steps[i + 1].id}`,
      source: steps[i].id,
      target: steps[i + 1].id,
      type: "smoothstep",
      animated: true,
      style: edgeStyle,
    });
  }

  return { context, nodes, edges };
}
