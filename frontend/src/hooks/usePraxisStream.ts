import { useCallback, useReducer, useRef } from "react";
import { getApiBase } from "@/lib/apiBase";
import { DEMO_EVENTS, DEMO_HYPOTHESIS } from "./demoPipelineEvents";

export type AgentName =
  | "context"
  | "literature"
  | "bioinformatics"
  | "protocol"
  | "reagents"
  | "timeline"
  | "funding"
  | "gtm"
  | "tamarind"
  | "audit";

export type AgentState = "idle" | "running" | "complete" | "error";

export interface AgentStatus {
  state: AgentState;
  duration?: number;
  finding?: string;
  startedAt?: number;
}

export interface TraceEntry {
  step: number;
  agent: string;
  action: string;
  finding: string;
  duration_ms?: number;
  timestamp: string;
}

export interface NoveltyReference {
  title: string;
  authors: string;
  year: string;
  url?: string;
  pmid?: string;
}

export interface NoveltyData {
  signal: "not_found" | "similar_exists" | "exact_match";
  summary: string;
  references: NoveltyReference[];
}

export interface QuantitativeClaim {
  type: string;
  value: number;
  unit: string;
  target?: string;
}

export interface Paper {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  abstract: string;
  relevance_score: number;
  quantitative_claims: QuantitativeClaim[];
}

export interface GeneratedScript {
  filename: string;
  language: string;
  description: string;
  code: string;
  dependencies: string[];
  line_count: number;
}

export interface ProtocolStep {
  step_number: number;
  title: string;
  description: string;
  volumes?: Record<string, string>;
  temperature?: string;
  duration?: string;
  equipment?: string[];
  controls?: string[];
  notes?: string;
}

export interface ReagentLine {
  id?: string;
  name: string;
  vendor: string;
  catalog_number: string;
  unit_price: number;
  unit: string;
  quantity_needed: number;
  total_cost: number;
  phase: string;
  assay_type?: string;
}

export interface TimelineItem {
  id: string;
  task: string;
  week_start: number;
  week_end: number;
  phase: string;
  is_critical_path: boolean;
  milestone?: boolean;
  parallel_with?: string | null;
  cost_range?: string;
  description?: string;
  dependencies?: string[];
}

export interface FitBreakdown {
  disease_area: number;
  stage_alignment: number;
  evidence_required: number;
  technology_fit: number;
}

export interface FundingOpportunity {
  id: string;
  name: string;
  organization: string;
  type: string;
  amount_min: number;
  amount_max: number;
  follow_on_max?: number;
  deadline: string;
  next_review?: string;
  fit_score: number;
  fit_rationale: string;
  fit_breakdown: FitBreakdown;
  requirements_met: string[];
  requirements_missing: string[];
  url: string;
}

export interface GTMMilestone {
  name: string;
  month_start: number;
  month_end: number;
  phase: string;
  cost_range?: string;
  is_current?: boolean;
}

export interface GTMData {
  current_stage: string;
  ind_timeline_months: number;
  regulatory_pathway: string;
  qidp_eligible: boolean;
  fast_track_eligible: boolean;
  market_sizing_note: string;
  milestones: GTMMilestone[];
}

export interface TamarindDockingResult {
  compound_name: string;
  binding_affinity_kcal: number;
  rmsd: number;
  pose_count: number;
  interacting_residues: string[];
  reference_affinity?: number;
  confidence: "high" | "medium" | "low";
}

export interface TamarindResult {
  protein_name: string;
  organism: string;
  mutation_label?: string;
  pdb_string: string | null;
  pdb_url?: string;
  confidence_score: number | null;
  residue_count: number | null;
  mutation_sites: string[];
  source: "alphafold" | "rcsb" | "unavailable";
  docking_results?: TamarindDockingResult[];
}

export interface AuditFlag {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  field_source: string;
  suggested_fix?: string;
}

export interface KeyFinding {
  finding: string;
  blocking_question?: string;
}

export interface PraxisState {
  phase: "idle" | "running" | "complete" | "error";
  isRunning: boolean;
  isComplete: boolean;
  programId: string | null;
  completeness: number;
  agentStates: Record<AgentName, AgentStatus>;
  trace: TraceEntry[];
  novelty: NoveltyData | null;
  papers: Paper[];
  scripts: GeneratedScript[];
  protocolSteps: ProtocolStep[];
  reagents: ReagentLine[];
  budgetTotal: number;
  phaseBreakdown: Record<string, number>;
  vendorCount: number;
  estimatedWeeks: number;
  timeline: TimelineItem[];
  totalWeeks: number;
  criticalPathWeeks: number;
  funding: FundingOpportunity[];
  totalAddressableUsd: number;
  gtm: GTMData | null;
  tamarind: TamarindResult | null;
  auditFlags: AuditFlag[];
  keyFinding: KeyFinding | null;
  error: string | null;
}

export { DEMO_HYPOTHESIS, DEMO_EVENTS };


const AGENT_NAMES: AgentName[] = [
  "context",
  "literature",
  "bioinformatics",
  "protocol",
  "reagents",
  "timeline",
  "funding",
  "gtm",
  "tamarind",
  "audit",
];

const initialAgentStates = (): Record<AgentName, AgentStatus> =>
  Object.fromEntries(AGENT_NAMES.map((n) => [n, { state: "idle" as AgentState }])) as Record<
    AgentName,
    AgentStatus
  >;

const initialState = (): PraxisState => ({
  phase: "idle",
  isRunning: false,
  isComplete: false,
  programId: null,
  completeness: 0,
  agentStates: initialAgentStates(),
  trace: [],
  novelty: null,
  papers: [],
  scripts: [],
  protocolSteps: [],
  reagents: [],
  budgetTotal: 0,
  phaseBreakdown: {},
  vendorCount: 0,
  estimatedWeeks: 0,
  timeline: [],
  totalWeeks: 0,
  criticalPathWeeks: 0,
  funding: [],
  totalAddressableUsd: 0,
  gtm: null,
  tamarind: null,
  auditFlags: [],
  keyFinding: null,
  error: null,
});

/** After SSE event `t`, which agent should show as running next (matches backend ordering). */
function nextAgentAfterEvent(t: string): AgentName | null {
  switch (t) {
    case "context":
    case "novelty":
      return "literature";
    case "literature":
      return "protocol";
    case "protocol":
      return "bioinformatics";
    case "bioinformatics":
      return "timeline";
    case "timeline":
      return "reagents";
    case "reagents":
      return "funding";
    case "funding":
      return "gtm";
    case "gtm":
      return "tamarind";
    case "tamarind":
      return "audit";
    default:
      return null;
  }
}

function markRunning(s: PraxisState, agent: AgentName): PraxisState {
  return {
    ...s,
    agentStates: {
      ...s.agentStates,
      [agent]: { state: "running", startedAt: Date.now() },
    },
  };
}

function markComplete(s: PraxisState, agent: AgentName, finding?: string): PraxisState {
  const prev = s.agentStates[agent];
  const startedAt = prev?.startedAt ?? Date.now();
  const duration = Date.now() - startedAt;
  return {
    ...s,
    agentStates: {
      ...s.agentStates,
      [agent]: { state: "complete", duration, finding, startedAt },
    },
  };
}

function markError(s: PraxisState, agent: AgentName | null, message: string): PraxisState {
  const nextAgents = { ...s.agentStates };
  if (agent && agent in nextAgents) {
    nextAgents[agent] = { ...nextAgents[agent], state: "error" };
  }
  return {
    ...s,
    phase: "error",
    isRunning: false,
    isComplete: false,
    error: message,
    agentStates: nextAgents,
  };
}

function errorAgentName(agentField: string): AgentName | null {
  const a = (agentField || "").toLowerCase();
  if (a.includes("context")) return "context";
  if (a.includes("novelty") || a.includes("literature")) return "literature";
  if (a.includes("protocol")) return "protocol";
  if (a.includes("bio") || a.includes("timeline")) return a.includes("timeline") ? "timeline" : "bioinformatics";
  if (a.includes("reagent")) return "reagents";
  if (a.includes("funding")) return "funding";
  if (a.includes("gtm")) return "gtm";
  if (a.includes("tamarind")) return "tamarind";
  if (a.includes("audit")) return "audit";
  return null;
}

function normalizeNovelty(data: Record<string, unknown>): NoveltyData {
  const refsRaw = (data.references as Record<string, unknown>[]) ?? [];
  const references: NoveltyReference[] = refsRaw.map((r) => ({
    title: String(r.title ?? ""),
    authors: String(r.authors ?? ""),
    year: r.year != null ? String(r.year) : "",
    url: r.url ? String(r.url) : undefined,
    pmid: r.pmid ? String(r.pmid) : undefined,
  }));
  return {
    signal: data.signal as NoveltyData["signal"],
    summary: String(data.summary ?? ""),
    references,
  };
}

function handleEnvelope(s: PraxisState, eventType: string, data: unknown): PraxisState {
  const d = (data ?? {}) as Record<string, unknown>;
  let next = { ...s };

  switch (eventType) {
    case "context": {
      next = markComplete(next, "context", `target=${d.target} · ${d.organism}`);
      break;
    }
    case "novelty": {
      next = { ...next, novelty: normalizeNovelty(d) };
      break;
    }
    case "literature": {
      const papers = (d.papers as Paper[]) ?? [];
      next = { ...next, papers };
      next = markComplete(next, "literature", `${papers.length} papers`);
      break;
    }
    case "bioinformatics": {
      const scripts = (d.scripts as GeneratedScript[]) ?? [];
      next = { ...next, scripts };
      next = markComplete(next, "bioinformatics", `${scripts.length} scripts`);
      break;
    }
    case "protocol": {
      const steps = (d.steps as ProtocolStep[]) ?? [];
      next = { ...next, protocolSteps: steps };
      next = markComplete(next, "protocol", `${steps.length} steps`);
      break;
    }
    case "reagents": {
      const items = (d.items as ReagentLine[]) ?? [];
      next = {
        ...next,
        reagents: items,
        budgetTotal: Number(d.budget_total ?? 0),
        phaseBreakdown: (d.phase_breakdown as Record<string, number>) ?? {},
        vendorCount: Number(d.vendor_count ?? 0),
        estimatedWeeks: Number(d.estimated_weeks ?? 0),
      };
      next = markComplete(next, "reagents", `$${next.budgetTotal}`);
      break;
    }
    case "timeline": {
      const rawItems = (d.items as Record<string, unknown>[]) ?? [];
      const items: TimelineItem[] = rawItems.map((it, i) => ({
        id: String(it.id ?? `tl-${i + 1}`),
        task: String(it.task ?? ""),
        week_start: Number(it.week_start ?? 0),
        week_end: Number(it.week_end ?? 0),
        phase: String(it.phase ?? ""),
        is_critical_path: Boolean(it.is_critical_path),
        milestone: it.milestone != null ? Boolean(it.milestone) : undefined,
        parallel_with: (it.parallel_with as string | null) ?? null,
        cost_range: it.cost_range != null ? String(it.cost_range) : undefined,
        description: it.description != null ? String(it.description) : undefined,
        dependencies: Array.isArray(it.dependencies) ? (it.dependencies as string[]) : [],
      }));
      next = {
        ...next,
        timeline: items,
        totalWeeks: Number(d.total_weeks ?? 0),
        criticalPathWeeks: Number(d.critical_path_weeks ?? 0),
      };
      next = markComplete(next, "timeline", `${items.length} tasks`);
      break;
    }
    case "funding": {
      const opps = (d.opportunities as FundingOpportunity[]) ?? [];
      next = {
        ...next,
        funding: opps,
        totalAddressableUsd: Number(d.total_addressable_usd ?? 0),
      };
      next = markComplete(next, "funding", `${opps.length} opportunities`);
      break;
    }
    case "gtm": {
      next = { ...next, gtm: d as unknown as GTMData };
      next = markComplete(next, "gtm", String(d.regulatory_pathway ?? "").slice(0, 80));
      break;
    }
    case "tamarind": {
      next = { ...next, tamarind: d as unknown as TamarindResult };
      next = markComplete(next, "tamarind", String(d.protein_name ?? ""));
      break;
    }
    case "audit": {
      const flags = (d.flags as AuditFlag[]) ?? [];
      next = { ...next, auditFlags: flags };
      next = markComplete(next, "audit", `${flags.length} flags`);
      break;
    }
    case "key_finding": {
      next = {
        ...next,
        keyFinding: {
          finding: String(d.finding ?? ""),
          blocking_question: d.blocking_question != null ? String(d.blocking_question) : undefined,
        },
      };
      break;
    }
    case "trace": {
      const te: TraceEntry = {
        step: Number(d.step ?? 0),
        agent: String(d.agent ?? "system"),
        action: String(d.action ?? ""),
        finding: String(d.finding ?? ""),
        duration_ms: d.duration_ms != null ? Number(d.duration_ms) : undefined,
        timestamp: String(d.timestamp ?? new Date().toISOString()),
      };
      next = { ...next, trace: [...next.trace, te] };
      break;
    }
    case "complete": {
      next = {
        ...next,
        phase: "complete",
        isRunning: false,
        isComplete: true,
        completeness: Number(d.completeness_pct ?? 0),
        programId: String(d.program_id ?? ""),
      };
      break;
    }
    case "error": {
      const ag = errorAgentName(String(d.agent ?? ""));
      return markError(next, ag, String(d.message ?? "Unknown error"));
    }
    default:
      break;
  }
  return next;
}

type ReducerAction =
  | { type: "RESET" }
  | { type: "START"; hypothesis: string }
  | { type: "APPLY"; eventType: string; data: unknown }
  | { type: "CANCEL" }
  | { type: "CLEAR_KEY_FINDING" };

function reducer(state: PraxisState, action: ReducerAction): PraxisState {
  switch (action.type) {
    case "RESET":
      return initialState();
    case "START":
      return {
        ...initialState(),
        phase: "running",
        isRunning: true,
        isComplete: false,
        agentStates: {
          ...initialAgentStates(),
          context: { state: "running", startedAt: Date.now() },
        },
      };
    case "CANCEL":
      return {
        ...state,
        phase: "idle",
        isRunning: false,
      };
    case "CLEAR_KEY_FINDING":
      return { ...state, keyFinding: null };
    case "APPLY": {
      let next = { ...state };
      const nxt = nextAgentAfterEvent(action.eventType);
      if (nxt) next = markRunning(next, nxt);
      next = handleEnvelope(next, action.eventType, action.data);
      return next;
    }
    default:
      return state;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function usePraxisStream() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const demoRunId = useRef(0);

  const cancel = useCallback(() => {
    demoRunId.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "CANCEL" });
  }, []);

  const reset = useCallback(() => {
    demoRunId.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  const clearKeyFinding = useCallback(() => dispatch({ type: "CLEAR_KEY_FINDING" }), []);

  const runDemo = useCallback(async () => {
    const myRun = ++demoRunId.current;
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "START", hypothesis: DEMO_HYPOTHESIS });
    let prev = 0;
    for (const ev of DEMO_EVENTS) {
      if (demoRunId.current !== myRun) return;
      const delta = ev.delay_ms - prev;
      prev = ev.delay_ms;
      if (delta > 0) await sleep(delta);
      if (demoRunId.current !== myRun) return;
      await sleep(200);
      if (demoRunId.current !== myRun) return;
      dispatch({ type: "APPLY", eventType: ev.type, data: ev.data });
    }
  }, []);

  const run = useCallback(async (hypothesis: string) => {
    const myRun = ++demoRunId.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    dispatch({ type: "START", hypothesis });

    try {
      const API_BASE = getApiBase();
      if (!API_BASE) throw new Error("VITE_API_URL is not set");
      const response = await fetch(`${API_BASE}/pipeline/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ hypothesis }),
        signal: ac.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (demoRunId.current === myRun) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const rawBlock of parts) {
          const block = rawBlock.trim();
          if (!block) continue;
          let eventName = "message";
          for (const line of block.split("\n")) {
            const L = line.trim();
            if (L.startsWith("event:")) eventName = L.slice(6).trim();
            if (!L.startsWith("data:")) continue;
            const jsonStr = L.slice(5).trim();
            try {
              const envelope = JSON.parse(jsonStr) as { type?: string; data?: unknown };
              const t = envelope.type ?? eventName;
              if (demoRunId.current !== myRun) return;
              dispatch({ type: "APPLY", eventType: t, data: envelope.data });
            } catch {
              console.warn("SSE parse error:", jsonStr.slice(0, 100));
            }
          }
        }
      }
    } catch (err) {
      ac.abort();
      if (err instanceof Error && err.name === "AbortError") return;
      console.warn("Backend unreachable, using demo mode");
      if (demoRunId.current !== myRun) return;
      await runDemo();
    }
  }, [runDemo]);

  return { state, run, runDemo, cancel, reset, clearKeyFinding };
}

