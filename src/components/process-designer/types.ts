/** Process-level metadata (root attributes) */
export interface ProcessMeta {
  name: string;
  model?: string;
  llmHost?: string;
  type?: string;
}

/** A <var name="...">default value</var> */
export interface ProcessVariable {
  name: string;
  defaultValue: string;
}

/** An <output name="..." type="..."/> */
export interface ProcessOutput {
  name: string;
  type: string;
}

/** An <agent role="..." roleDescription="..."/> */
export interface ProcessAgent {
  role: string;
  roleDescription?: string;
}

/** All the data that lives outside individual steps */
export interface ProcessContext {
  meta: ProcessMeta;
  variables: ProcessVariable[];
  containers: string[];
  outputs: ProcessOutput[];
  agents: ProcessAgent[];
}

/** A saved process in the local catalog */
export interface CatalogEntry {
  id: string;
  name: string;
  xml: string;
  createdAt: number;
}

/** Per-node (step) data */
export interface ProcessNodeData {
  name: string;
  readFrom?: string;
  writeTo?: string;
  loop?: boolean;
  loopOver?: string;
  fromAgents?: string;
  systemPrompt?: string;
  userPrompt?: string;
  schema?: string;
  [key: string]: unknown;
}
