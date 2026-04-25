export type AgentId =
  | "context"
  | "literature"
  | "bioinformatics"
  | "protocol"
  | "reagents"
  | "timeline"
  | "funding"
  | "gtm";

export type AgentState = "idle" | "running" | "complete" | "error";

export type GlobalStatus = "READY" | "RUNNING" | "COMPLETE";

export interface AgentMeta {
  id: AgentId;
  index: string;
  label: string;
  color: string; // tailwind text class
  hsl: string;   // raw hsl var name for borders/glows
  hex: string;   // for inline use
}

export interface AgentRecord {
  state: AgentState;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  data?: any;
}

export interface TraceEntry {
  ts: string;
  agent: AgentId | "system";
  message: string;
}

export interface Paper {
  title: string;
  authors?: string;
  journal?: string;
  year?: number | string;
  relevance?: number; // 0-1
  abstract?: string;
  claims?: string[];
}

export interface ProtocolStep {
  title: string;
  description?: string;
  volume?: string;
  time?: string;
  equipment?: string;
  controls?: string[];
  missingControls?: string[];
}

export interface AuditFlag {
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail?: string;
}

export interface TamarindData {
  pdb?: string;
  confidence?: number;
  residues?: number;
  source?: string;
}

export type CodeLang = "python" | "r" | "shell";

export interface CodeScript {
  name: string;          // filename incl. extension
  language: CodeLang;
  purpose: string;       // 1–2 sentences
  code: string;
  requires?: { name: string; standard: boolean }[];
  colabUrl?: string;
  generatedBy?: string;
}

export type ReagentPhase = 1 | 2 | 3;

export interface Reagent {
  name: string;
  vendor: string;       // short label, e.g. "Sigma"
  vendorFull?: string;  // full name for tooltip
  catalog: string;
  unitPrice: number;
  qty: number;
  phase: ReagentPhase;
}

export interface BudgetData {
  reagents: Reagent[];
  estimatedWeeks?: number;
}

export type GrantType = "FEDERAL" | "PRIVATE" | "ACADEMIC";
export type DeadlineKind = "DATE" | "ROLLING";

export interface FitCriterion {
  label: string;          // "DISEASE AREA MATCH"
  score: number;          // 0..100
}

export interface GrantRequirement {
  text: string;
  met: boolean;
  satisfyHint?: string;   // shown when unmet
}

export interface FundingGrant {
  id: string;
  name: string;            // grant program / RFA name
  organization: string;    // e.g. "NIH NIAID"
  type: GrantType;
  fit: number;             // 0..100
  amountMin: number;       // USD
  amountMax: number;       // USD
  followOn?: number;       // optional follow-on funding USD
  deadline: DeadlineKind;
  deadlineDate?: string;   // ISO when DEADLINE
  nextReview?: string;     // human label, e.g. "June 2026"
  url?: string;
  fitBreakdown: FitCriterion[];
  rationale: string;       // 1–2 sentences. Highlight {{terms}} for amber.
  requirements: GrantRequirement[];
}

export interface FundingData {
  grants: FundingGrant[];
}

export const AGENTS: AgentMeta[] = [
  { id: "context",        index: "01", label: "CONTEXT",        color: "text-ax-blue",   hsl: "var(--accent-blue)",   hex: "#4d9fff" },
  { id: "literature",     index: "02", label: "LITERATURE",     color: "text-ax-purple", hsl: "var(--accent-purple)", hex: "#9d6fff" },
  { id: "bioinformatics", index: "03", label: "BIOINFORMATICS", color: "text-ax-green",  hsl: "var(--accent-green)",  hex: "#00d97e" },
  { id: "protocol",       index: "04", label: "PROTOCOL",       color: "text-ax-green",  hsl: "var(--accent-green)",  hex: "#00d97e" },
  { id: "reagents",       index: "05", label: "REAGENTS",       color: "text-ax-amber",  hsl: "var(--accent-amber)",  hex: "#f0a500" },
  { id: "timeline",       index: "06", label: "TIMELINE",       color: "text-ax-amber",  hsl: "var(--accent-amber)",  hex: "#f0a500" },
  { id: "funding",        index: "07", label: "FUNDING",        color: "text-ax-green",  hsl: "var(--accent-green)",  hex: "#00d97e" },
  { id: "gtm",            index: "08", label: "GTM",            color: "text-ax-blue",   hsl: "var(--accent-blue)",   hex: "#4d9fff" },
];

export const AGENT_BY_ID: Record<AgentId, AgentMeta> = AGENTS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<AgentId, AgentMeta>
);