import type { Edge, Node } from "@xyflow/react";
import type { ProcessNodeData } from "./types";

const X_GAP = 300;

const mk = (id: string, index: number, data: ProcessNodeData): Node => ({
  id,
  type: "process",
  position: { x: index * X_GAP + 40, y: 80 },
  data: data as unknown as Record<string, unknown>,
});

const e = (s: string, t: string): Edge => ({
  id: `${s}-${t}`,
  source: s,
  target: t,
  type: "smoothstep",
  animated: true,
  style: { stroke: "var(--color-border)", strokeWidth: 2 },
});

/** Helper: given an ordered list of node ids, produce a sequential edge chain. */
function chain(ids: string[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < ids.length - 1; i++) edges.push(e(ids[i], ids[i + 1]));
  return edges;
}

export const QOC_TEMPLATE: { nodes: Node[]; edges: Edge[] } = (() => {
  const nodes = [
    mk("stk", 0, {
      name: "collect_stakeholders", writeTo: "stakeholders",
      systemPrompt: "You are an experienced business consultant. One of your major methodologies in order to answer questions are profound analysis of the given question with the help of the question-option-criteria (QOC) methodology.",
      userPrompt: 'Identify the top {{numberOfStakeholders}} most important stakeholders (role + roleDescription). The stakeholders should be different subject matter experts for the question: "{{question}}"\nContext: "{{context}}"',
      schema: "class Stakeholder(BaseModel):\n  role: str\n  roleDescription: str\n\nclass StakeholdersContainer(BaseModel):\n  stakeholders: list[Stakeholder]",
    }),
    mk("opt", 1, {
      name: "collect_options", readFrom: "stakeholders", writeTo: "optionsRaw", loop: true, loopOver: "stakeholders",
      systemPrompt: "You are a subject expert acting strictly in your role: {{role}}.\nRole description: {{roleDescription}}.",
      userPrompt: 'Identify five possible answers to the question: "{{question}}"\nContext: "{{context}}"\nAdhere strictly to your role.',
      schema: "class Options(BaseModel):\n  options: list[str]",
    }),
    mk("crit", 2, {
      name: "collect_criteria", readFrom: "stakeholders", writeTo: "criteriaRaw", loop: true, loopOver: "stakeholders",
      systemPrompt: "You are a subject expert acting strictly in your role: {{role}}.\nRole description: {{roleDescription}}.",
      userPrompt: 'Identify five criteria to evaluate answers to: "{{question}}"\nContext: "{{context}}"\nAdhere strictly to your role.',
      schema: "class Criteria(BaseModel):\n  criteria: list[str]",
    }),
    mk("mopt", 3, {
      name: "consolidate_options", readFrom: "optionsRaw", writeTo: "options",
      systemPrompt: "You consolidate options from multiple agents. Merge duplicates, keep unique semantics.",
      userPrompt: "Consolidate the following options into unique entries. Do not lose information.\nOptions: {{optionsRaw}}",
      schema: "class Options(BaseModel):\n  options: list[str]",
    }),
    mk("mcrit", 4, {
      name: "consolidate_criteria", readFrom: "criteriaRaw", writeTo: "criteria",
      systemPrompt: "You consolidate criteria from multiple agents. Merge duplicates, keep unique semantics.",
      userPrompt: "Consolidate the following criteria into unique entries.\nCriteria: {{criteriaRaw}}",
      schema: "class Criteria(BaseModel):\n  criteria: list[str]",
    }),
    mk("wgt", 5, {
      name: "weight_criteria", readFrom: "stakeholders criteria", writeTo: "criteriaWeights", loop: true, loopOver: "stakeholders",
      systemPrompt: "You are a subject expert acting strictly in your role: {{role}}.\nRole description: {{roleDescription}}.",
      userPrompt: 'Given criteria: {{criteria}}\nQuestion: "{{question}}"\nContext: "{{context}}"\nWeight each criterion from 0-100 according to importance. Do not add/change criteria.',
      schema: "class CriterionWeight(BaseModel):\n  criterion: str\n  weight: int\n\nclass CriteriaWeightsContainer(BaseModel):\n  criteriaWeights: list[CriterionWeight]",
    }),
    mk("eval", 6, {
      name: "evaluate_options", readFrom: "stakeholders criteria options", writeTo: "evaluatedOptions", loop: true, loopOver: "stakeholders",
      systemPrompt: "You are a subject expert acting strictly in your role: {{role}}.\nRole description: {{roleDescription}}.",
      userPrompt: "Options: {{options}}\nCriteria: {{criteria}}\nEvaluate how each option supports each criterion (0-100). Do not rename options or criteria.",
      schema: "class Score(BaseModel):\n  criterion: str\n  score: int\n\nclass Evaluation(BaseModel):\n  option: str\n  scores: list[Score]\n\nclass EvaluationsContainer(BaseModel):\n  evaluations: list[Evaluation]",
    }),
  ];
  return { nodes, edges: chain(nodes.map((n) => n.id)) };
})();

export const STAKEHOLDER_TEMPLATE: { nodes: Node[]; edges: Edge[] } = (() => {
  const nodes = [
    mk("gen", 0, { name: "find_stakeholders", writeTo: "stakeholders" }),
    mk("interest", 1, { name: "extract_interests", readFrom: "stakeholders", writeTo: "interests", loop: true, loopOver: "stakeholders" }),
    mk("power", 2, { name: "assess_power", readFrom: "stakeholders", writeTo: "powerMap", loop: true, loopOver: "stakeholders" }),
    mk("matrix", 3, { name: "power_interest_matrix", readFrom: "interests powerMap" }),
  ];
  return { nodes, edges: chain(nodes.map((n) => n.id)) };
})();

export const VESTER_TEMPLATE: { nodes: Node[]; edges: Edge[] } = (() => {
  const nodes = [
    mk("vars", 0, { name: "find_variables", writeTo: "variables" }),
    mk("infl", 1, { name: "influence_matrix", readFrom: "variables", writeTo: "matrix" }),
    mk("ana", 2, { name: "sensitivity_analysis", readFrom: "matrix", writeTo: "roles" }),
  ];
  return { nodes, edges: chain(nodes.map((n) => n.id)) };
})();

export const TEMPLATES = {
  qoc: QOC_TEMPLATE,
  stakeholder: STAKEHOLDER_TEMPLATE,
  vester: VESTER_TEMPLATE,
};
