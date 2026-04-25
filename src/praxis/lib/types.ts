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