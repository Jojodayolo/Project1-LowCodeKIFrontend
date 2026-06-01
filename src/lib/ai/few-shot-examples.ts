import type { ChatMessage } from "./types";

interface FewShotExample {
  prompt: string;
  xml: string;
}

const EXAMPLES: FewShotExample[] = [
  {
    prompt:
      "Erstelle einen Stakeholder-Analyseprozess für ein Projekt. Zuerst sollen die wichtigsten Stakeholder identifiziert werden, dann deren Interessen und Machtposition eingeschätzt werden. Anschließend werden die Stakeholder in vier Gruppen eingeteilt (Champions, Key Players, Subjects, Crowd) und für jede Gruppe eine passende Einbindungsstrategie mit Kommunikationskanälen und Frequenz entwickelt. Eingabevariablen sind Projektbeschreibung, Kontext und Anzahl der Stakeholder.",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<process name="Stakeholder_Analysis" type="STAKEHOLDER">
  <variables>
    <var name="project_description">Description of the project or initiative</var>
    <var name="context">Additional context</var>
    <var name="numberOfStakeholders">8</var>
  </variables>
  <containers>
    <container name="project_context"/>
    <container name="stakeholders"/>
    <container name="interests_concerns"/>
    <container name="stakeholder_mapping"/>
    <container name="engagement_strategy"/>
  </containers>
  <outputs>
    <output name="stakeholders" type="json"/>
    <output name="interests_concerns" type="json"/>
    <output name="stakeholder_mapping" type="json"/>
    <output name="engagement_strategy" type="json"/>
  </outputs>
  <steps>
    <step name="extract_context_and_stakeholders" writeTo="project_context stakeholders">
      <system>You are a stakeholder analysis expert. Identify {{numberOfStakeholders}} key stakeholders for the project.</system>
      <prompt>Project description: {{project_description}}
Context: {{context}}
Identify {{numberOfStakeholders}} stakeholders with their name and role.</prompt>
      <response_schema>class Stakeholder(BaseModel):
  name: str
  role: str

class ContextAndStakeholders(BaseModel):
  stakeholders: list[Stakeholder]</response_schema>
    </step>
    <step name="identify_interests" readFrom="stakeholders" writeTo="interests_concerns">
      <system>You analyze stakeholder perspectives for the project and identify their interests and power levels.</system>
      <prompt>For each stakeholder, identify:
- Top 3 interests for this project
- Power level to influence (0-100)

Stakeholders: {{stakeholders}}
Project: {{project_description}}</prompt>
      <response_schema>class Profile(BaseModel):
  name: str
  interests: list[str]
  power: int

class InterestsConcerns(BaseModel):
  profiles: list[Profile]</response_schema>
    </step>
    <step name="map_stakeholders" readFrom="stakeholders interests_concerns" writeTo="stakeholder_mapping">
      <system>You classify stakeholders into strategic groups based on power and interest.</system>
      <prompt>Classify stakeholders into 4 groups:
- Champions (high power, high interest)
- Key Players (high power, mixed interest)
- Subjects (low power, high interest)
- Crowd (low power, low interest)

Stakeholders: {{stakeholders}}
Profiles: {{interests_concerns}}</prompt>
      <response_schema>class Group(BaseModel):
  name: str
  stakeholders: list[str]
  strategy: str

class StakeholderMapping(BaseModel):
  champions: Group
  key_players: Group
  subjects: Group
  crowd: Group</response_schema>
    </step>
    <step name="develop_engagement" readFrom="stakeholder_mapping interests_concerns" writeTo="engagement_strategy">
      <system>You develop engagement tactics for each stakeholder group.</system>
      <prompt>Create engagement strategy for all groups:

Mapping: {{stakeholder_mapping}}
Profiles: {{interests_concerns}}

For each group provide:
- Engagement approach
- Communication channels (email, meeting, workshop, etc)
- Frequency (weekly, monthly, quarterly)</prompt>
      <response_schema>class Engagement(BaseModel):
  group_name: str
  approach: str
  channels: list[str]
  frequency: str

class EngagementStrategy(BaseModel):
  strategies: list[Engagement]</response_schema>
    </step>
  </steps>
</process>`,
  },
  {
    prompt:
      "Erstelle einen Risikoanalyseprozess für ein Projekt. Der Prozess soll zunächst Risiken identifizieren und kategorisieren (technisch, organisatorisch, extern, finanziell), dann Eintrittswahrscheinlichkeit und Auswirkung jedes Risikos bewerten, die Risiken in kritisch/hoch/mittel/niedrig einordnen und abschließend für jede Gruppe eine Mitigationsstrategie mit konkreten Maßnahmen und Verantwortlichkeiten entwickeln. Eingabevariablen sind die Projektbeschreibung, Kontext und die gewünschte Anzahl an Risiken.",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<process name="Risiko_Analyse" type="RISK">
  <variables>
    <var name="project_description">Description of the project or initiative</var>
    <var name="context">Additional context</var>
    <var name="numberOfRisks">10</var>
  </variables>
  <containers>
    <container name="project_context"/>
    <container name="risks"/>
    <container name="risk_assessment"/>
    <container name="risk_mapping"/>
    <container name="mitigation_strategy"/>
  </containers>
  <outputs>
    <output name="risks" type="json"/>
    <output name="risk_assessment" type="json"/>
    <output name="risk_mapping" type="json"/>
    <output name="mitigation_strategy" type="json"/>
  </outputs>
  <steps>
    <step name="extract_context_and_risks" writeTo="project_context risks">
      <system>You are a risk analysis expert. Identify {{numberOfRisks}} key risks for the project.</system>
      <prompt>Project description: {{project_description}}
Context: {{context}}
Identify {{numberOfRisks}} potential risks with their name and category (technical, organizational, external, financial).</prompt>
      <response_schema>class Risk(BaseModel):
  name: str
  category: str

class ProjectContextAndRisks(BaseModel):
  risks: list[Risk]</response_schema>
    </step>
    <step name="assess_risks" readFrom="risks" writeTo="risk_assessment">
      <system>You analyze individual risks and assess their impact and probability.</system>
      <prompt>For each risk, assess:
- Probability of occurrence (0-100)
- Impact if occurs (0-100)
- Description of the risk

Risks: {{risks}}
Project: {{project_description}}</prompt>
      <response_schema>class RiskProfile(BaseModel):
  name: str
  probability: int
  impact: int
  description: str

class RiskAssessment(BaseModel):
  profiles: list[RiskProfile]</response_schema>
    </step>
    <step name="map_risks" readFrom="risks risk_assessment" writeTo="risk_mapping">
      <system>You classify risks into strategic groups based on probability and impact.</system>
      <prompt>Classify risks into 4 groups:
- Critical (high probability, high impact)
- High (high probability OR high impact)
- Medium (medium probability and impact)
- Low (low probability and impact)

Risks: {{risks}}
Assessment: {{risk_assessment}}</prompt>
      <response_schema>class RiskGroup(BaseModel):
  name: str
  risks: list[str]
  strategy: str

class RiskMapping(BaseModel):
  critical: RiskGroup
  high: RiskGroup
  medium: RiskGroup
  low: RiskGroup</response_schema>
    </step>
    <step name="develop_mitigation" readFrom="risk_mapping risk_assessment" writeTo="mitigation_strategy">
      <system>You develop mitigation tactics for each risk group.</system>
      <prompt>Create mitigation strategy for all risk groups:

Mapping: {{risk_mapping}}
Assessment: {{risk_assessment}}

For each group provide:
- Mitigation approach
- Prevention measures
- Response plan if risk occurs
- Responsible party</prompt>
      <response_schema>class MitigationPlan(BaseModel):
  group_name: str
  approach: str
  prevention: list[str]
  response: str
  responsible: str

class MitigationStrategy(BaseModel):
  plans: list[MitigationPlan]</response_schema>
    </step>
  </steps>
</process>`,
  },
  {
    prompt:
      "Erstelle einen QOC-Analyseprozess (Question-Option-Criteria) für eine gegebene Fragestellung. Mehrere Stakeholder sollen aus ihrer jeweiligen Fachperspektive Antwortoptionen und Bewertungskriterien vorschlagen. Die Optionen und Kriterien werden danach konsolidiert, gewichtet und die Optionen schließlich bewertet. Eingabevariablen sind die Fragestellung, Kontext und die Anzahl der Stakeholder.",
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<process name="QOC">
  <variables>
    <var name="question">Die zu analysierende Fragestellung</var>
    <var name="context">Hintergrundkontext</var>
    <var name="numberOfStakeholders">3</var>
  </variables>
  <containers>
    <container name="stakeholders"/>
    <container name="optionsRaw"/>
    <container name="criteriaRaw"/>
    <container name="options"/>
    <container name="criteria"/>
    <container name="criteriaWeights"/>
    <container name="evaluatedOptions"/>
  </containers>
  <outputs>
    <output name="evaluatedOptions" type="json"/>
    <output name="criteriaWeights" type="json"/>
  </outputs>
  <steps>
    <step name="collect_stakeholders" writeTo="stakeholders">
      <system>You are an experienced business consultant applying the QOC methodology.</system>
      <prompt>Identify the top {{numberOfStakeholders}} most important stakeholders (role + roleDescription) for the question: "{{question}}"
Context: "{{context}}"</prompt>
      <response_schema>class Stakeholder(BaseModel):
  role: str
  roleDescription: str

class StakeholdersContainer(BaseModel):
  stakeholders: list[Stakeholder]</response_schema>
    </step>
    <step name="collect_options" loop="true" loopOver="stakeholders" readFrom="stakeholders" writeTo="optionsRaw">
      <system>You are a subject expert acting strictly in your role: {{role}}.
Role description: {{roleDescription}}.</system>
      <prompt>Identify five possible answers to the question: "{{question}}"
Context: "{{context}}"
Adhere strictly to your role.</prompt>
      <response_schema>class Options(BaseModel):
  options: list[str]</response_schema>
    </step>
    <step name="collect_criteria" loop="true" loopOver="stakeholders" readFrom="stakeholders" writeTo="criteriaRaw">
      <system>You are a subject expert acting strictly in your role: {{role}}.
Role description: {{roleDescription}}.</system>
      <prompt>Identify five criteria to evaluate answers to: "{{question}}"
Context: "{{context}}"
Adhere strictly to your role.</prompt>
      <response_schema>class Criteria(BaseModel):
  criteria: list[str]</response_schema>
    </step>
    <step name="consolidate_options" readFrom="optionsRaw" writeTo="options">
      <system>You consolidate options from multiple agents. Merge duplicates, keep unique semantics.</system>
      <prompt>Consolidate the following options into unique entries. Do not lose information.
Options: {{optionsRaw}}</prompt>
      <response_schema>class Options(BaseModel):
  options: list[str]</response_schema>
    </step>
    <step name="consolidate_criteria" readFrom="criteriaRaw" writeTo="criteria">
      <system>You consolidate criteria from multiple agents. Merge duplicates, keep unique semantics.</system>
      <prompt>Consolidate the following criteria into unique entries.
Criteria: {{criteriaRaw}}</prompt>
      <response_schema>class Criteria(BaseModel):
  criteria: list[str]</response_schema>
    </step>
    <step name="weight_criteria" loop="true" loopOver="stakeholders" readFrom="stakeholders criteria" writeTo="criteriaWeights">
      <system>You are a subject expert acting strictly in your role: {{role}}.
Role description: {{roleDescription}}.</system>
      <prompt>Given criteria: {{criteria}}
Question: "{{question}}"
Context: "{{context}}"
Weight each criterion from 0-100 according to importance. Do not add or change criteria.</prompt>
      <response_schema>class CriterionWeight(BaseModel):
  criterion: str
  weight: int

class CriteriaWeightsContainer(BaseModel):
  criteriaWeights: list[CriterionWeight]</response_schema>
    </step>
    <step name="evaluate_options" loop="true" loopOver="stakeholders" readFrom="stakeholders criteria options" writeTo="evaluatedOptions">
      <system>You are a subject expert acting strictly in your role: {{role}}.
Role description: {{roleDescription}}.</system>
      <prompt>Options: {{options}}
Criteria: {{criteria}}
Evaluate how each option supports each criterion (0-100). Do not rename options or criteria.</prompt>
      <response_schema>class Score(BaseModel):
  criterion: str
  score: int

class Evaluation(BaseModel):
  option: str
  scores: list[Score]

class EvaluationsContainer(BaseModel):
  evaluations: list[Evaluation]</response_schema>
    </step>
  </steps>
</process>`,
  },
];

export function buildFewShotMessages(): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const ex of EXAMPLES) {
    messages.push({ role: "user", content: ex.prompt });
    messages.push({
      role: "assistant",
      content: `Hier ist die XML-Prozessdefinition:\n\n\`\`\`xml\n${ex.xml}\n\`\`\``,
    });
  }
  return messages;
}
