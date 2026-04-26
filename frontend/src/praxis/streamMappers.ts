import type {
  AuditFlag as StreamAudit,
  FundingOpportunity,
  NoveltyData,
  Paper as StreamPaper,
  ProtocolStep as StreamProtocolStep,
  ReagentLine,
  TamarindResult,
} from "@/hooks/usePraxisStream";
import {
  AGENT_BY_ID,
  type AgentId,
  type AgentRecord,
  type AuditFlag,
  type BudgetData,
  type CodeScript,
  type FundingData,
  type FundingGrant,
  type GlobalStatus,
  type GrantType,
  type Paper,
  type ProtocolStep,
  type Reagent,
  type ReagentPhase,
  type TamarindData,
} from "./lib/types";
import type { TraceEntry as StreamTrace } from "@/hooks/usePraxisStream";
import type { TraceEntry as UiTrace } from "./lib/types";

export function mapNoveltyToTabSignal(n: NoveltyData | null): "NOT FOUND" | "SIMILAR EXISTS" | "EXACT MATCH" | undefined {
  if (!n) return undefined;
  if (n.signal === "not_found") return "NOT FOUND";
  if (n.signal === "exact_match") return "EXACT MATCH";
  return "SIMILAR EXISTS";
}

export function mapStreamPapers(papers: StreamPaper[]): Paper[] {
  return papers.map((p) => ({
    title: p.title,
    authors: p.authors,
    journal: p.journal,
    year: p.year ?? "",
    relevance: p.relevance_score,
    abstract: p.abstract,
    claims:
      p.quantitative_claims?.map((c) =>
        [c.type, c.value, c.unit, c.target].filter(Boolean).join(" ").trim(),
      ) ?? [],
  }));
}

export function mapStreamProtocol(steps: StreamProtocolStep[]): ProtocolStep[] {
  return steps.map((s) => {
    const vols = s.volumes && Object.keys(s.volumes).length ? JSON.stringify(s.volumes) : undefined;
    return {
      title: s.title,
      description: s.description,
      volume: vols ?? "—",
      time: s.duration ?? "",
      equipment: Array.isArray(s.equipment) ? s.equipment.join(", ") : "",
      controls: s.controls ?? [],
      missingControls: [],
    };
  });
}

function scriptLanguage(lang: string): CodeScript["language"] {
  const l = lang.toLowerCase();
  if (l === "r") return "r";
  if (l === "python") return "python";
  return "shell";
}

export function mapStreamScripts(scripts: { filename: string; language: string; description: string; code: string; dependencies: string[] }[]): CodeScript[] {
  return scripts.map((s) => ({
    name: s.filename,
    language: scriptLanguage(s.language),
    purpose: s.description,
    code: s.code,
    requires: s.dependencies?.map((name) => ({ name, standard: true })),
    generatedBy: "PRAXIS Bioinformatics Agent",
  }));
}

function phaseToNum(phase: string): ReagentPhase {
  const m = /^P?(\d)/i.exec(phase);
  const n = m ? Number(m[1]) : 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

export function mapStreamReagents(lines: ReagentLine[]): Reagent[] {
  return lines.map((r) => ({
    name: r.name,
    vendor: r.vendor,
    catalog: r.catalog_number,
    unitPrice: r.unit_price,
    qty: Math.max(1, Math.round(r.quantity_needed)),
    phase: phaseToNum(r.phase),
  }));
}

export function mapStreamBudget(lines: ReagentLine[], _budgetTotal: number, estimatedWeeks: number): BudgetData {
  return {
    reagents: mapStreamReagents(lines),
    estimatedWeeks: estimatedWeeks || undefined,
  };
}

function grantDeadlineType(deadline: string): FundingGrant["deadline"] {
  if (!deadline || deadline.toLowerCase() === "rolling") return "ROLLING";
  return "DATE";
}

export function mapStreamFunding(opps: FundingOpportunity[]): FundingData {
  const grants: FundingGrant[] = opps.map((o) => ({
    id: o.id,
    name: o.name,
    organization: o.organization,
    type: (o.type?.toUpperCase() as GrantType) || "FEDERAL",
    fit: o.fit_score,
    amountMin: o.amount_min,
    amountMax: o.amount_max,
    followOn: o.follow_on_max,
    deadline: grantDeadlineType(o.deadline),
    deadlineDate: grantDeadlineType(o.deadline) === "DATE" ? o.deadline : undefined,
    nextReview: o.next_review,
    url: o.url,
    fitBreakdown: [
      { label: "DISEASE AREA MATCH", score: o.fit_breakdown?.disease_area ?? 0 },
      { label: "STAGE ALIGNMENT", score: o.fit_breakdown?.stage_alignment ?? 0 },
      { label: "EVIDENCE REQUIRED", score: o.fit_breakdown?.evidence_required ?? 0 },
      { label: "TECHNOLOGY FIT", score: o.fit_breakdown?.technology_fit ?? 0 },
    ],
    rationale: o.fit_rationale,
    requirements: [
      ...(o.requirements_met ?? []).map((text) => ({ text, met: true as const })),
      ...(o.requirements_missing ?? []).map((text) => ({ text, met: false as const, satisfyHint: "Address in revised aims." })),
    ],
  }));
  return { grants };
}

export function mapStreamAudit(flags: StreamAudit[]): AuditFlag[] {
  return flags.map((f) => ({
    severity: (f.severity.toUpperCase() as AuditFlag["severity"]) || "LOW",
    title: f.title,
    detail: f.detail,
  }));
}

export function mapTamarindForViewer(t: TamarindResult | null): TamarindData | null {
  if (!t) return null;
  return {
    pdb: t.pdb_string ?? undefined,
    confidence: t.confidence_score ?? undefined,
    residues: t.residue_count ?? undefined,
    source: t.source?.toUpperCase(),
    proteinName: t.protein_name,
    mutationSites: t.mutation_sites ?? [],
  };
}

export function mapStreamTrace(entries: StreamTrace[]): UiTrace[] {
  return entries.map((e) => {
    const low = (e.agent ?? "system").toLowerCase();
    const agent: AgentId | "system" = low in AGENT_BY_ID ? (low as AgentId) : "system";
    return {
      ts: e.timestamp?.length ? e.timestamp.slice(0, 12) : "",
      agent,
      message: `${e.action}: ${e.finding}`.trim(),
    };
  });
}

export function mapStreamAgents(agentStates: Record<string, { state: string; duration?: number; finding?: string }>): Record<AgentId, AgentRecord> {
  const ids: AgentId[] = [
    "context",
    "literature",
    "bioinformatics",
    "protocol",
    "structure",
    "reagents",
    "timeline",
    "funding",
    "gtm",
    "audit",
  ];
  const out = {} as Record<AgentId, AgentRecord>;
  for (const id of ids) {
    const st = agentStates[id];
    if (!st) {
      out[id] = { state: "idle" };
      continue;
    }
    out[id] = {
      state: st.state as AgentRecord["state"],
      durationMs: st.duration,
      startedAt: undefined,
      completedAt: undefined,
      data: st.finding ? { finding: st.finding } : undefined,
    };
  }
  return out;
}

export function streamHeaderStatus(
  phase: string,
  agentStates: Record<string, { state: string }>,
): GlobalStatus | "PARTIAL" {
  if (phase === "error") return "ERROR";
  if (phase === "running") return "RUNNING";
  if (phase === "complete") {
    const anyErr = Object.values(agentStates).some((a) => a.state === "error");
    return anyErr ? "PARTIAL" : "COMPLETE";
  }
  return "READY";
}

export function keyFindingText(k: { finding: string; blocking_question?: string } | null): string | null {
  if (!k?.finding) return null;
  return k.blocking_question ? `${k.finding}\n\n${k.blocking_question}` : k.finding;
}
