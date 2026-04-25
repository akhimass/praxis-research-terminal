import { useCallback, useReducer, useRef } from "react";
import {
  AgentId,
  AGENTS,
  AgentRecord,
  AuditFlag,
  BudgetData,
  CodeScript,
  FundingData,
  FundingGrant,
  GlobalStatus,
  Paper,
  ProtocolStep,
  TamarindData,
  TraceEntry,
  Reagent,
} from "./types";

const DEMO_FUNDING: FundingData = {
  grants: [
    {
      id: "niaid-r21-amr",
      name: "R21 Exploratory/Developmental — Antimicrobial Resistance",
      organization: "NIH NIAID",
      type: "FEDERAL",
      fit: 92,
      amountMin: 275_000,
      amountMax: 550_000,
      followOn: 3_500_000,
      deadline: "DATE",
      deadlineDate: "2026-06-16",
      nextReview: "October 2026",
      url: "https://grants.nih.gov/",
      fitBreakdown: [
        { label: "DISEASE AREA MATCH", score: 96 },
        { label: "STAGE ALIGNMENT",    score: 94 },
        { label: "EVIDENCE REQUIRED",  score: 88 },
        { label: "TECHNOLOGY FIT",     score: 90 },
      ],
      rationale:
        "{{gyrA}} resistance maps directly to NIAID's AMR priority list, and exploratory mechanism work fits the R21 risk profile. Existing {{ciprofloxacin}} MIC data establishes preliminary feasibility.",
      requirements: [
        { text: "PI with R-grant eligibility", met: true },
        { text: "Letter of support from clinical site", met: true },
        { text: "Two-year scope, no preliminary data required", met: true },
        { text: "IRB-approved isolate collection", met: false, satisfyHint: "Submit reliance agreement with partner microbiology lab." },
      ],
    },
    {
      id: "wellcome-discovery",
      name: "Discovery Award — Infection & Immunity",
      organization: "Wellcome Trust",
      type: "PRIVATE",
      fit: 84,
      amountMin: 500_000,
      amountMax: 2_000_000,
      followOn: 4_000_000,
      deadline: "DATE",
      deadlineDate: "2026-09-01",
      nextReview: "March 2027",
      url: "https://wellcome.org/",
      fitBreakdown: [
        { label: "DISEASE AREA MATCH", score: 88 },
        { label: "STAGE ALIGNMENT",    score: 81 },
        { label: "EVIDENCE REQUIRED",  score: 86 },
        { label: "TECHNOLOGY FIT",     score: 78 },
      ],
      rationale:
        "Wellcome's bold-discovery framing welcomes mechanism-of-resistance proposals, and {{S83L}}/{{D87N}} epistasis is a strong narrative. Stage fit is moderate — they prefer larger consortia.",
      requirements: [
        { text: "Lead applicant at eligible UK/Ireland/LMIC institution", met: false, satisfyHint: "Add Wellcome-eligible co-PI as lead applicant." },
        { text: "Open-data plan for genomic outputs", met: true },
        { text: "Public-engagement component", met: true },
        { text: "Three-year programmatic plan", met: true },
      ],
    },
    {
      id: "cdc-broad-agency",
      name: "BAA-2026-AMR Surveillance Innovation",
      organization: "CDC OAMR",
      type: "FEDERAL",
      fit: 76,
      amountMin: 250_000,
      amountMax: 1_200_000,
      deadline: "ROLLING",
      nextReview: "Quarterly review",
      url: "https://www.cdc.gov/",
      fitBreakdown: [
        { label: "DISEASE AREA MATCH", score: 90 },
        { label: "STAGE ALIGNMENT",    score: 65 },
        { label: "EVIDENCE REQUIRED",  score: 78 },
        { label: "TECHNOLOGY FIT",     score: 70 },
      ],
      rationale:
        "Strong topical fit on {{AMR}} surveillance, but CDC prefers ready-to-deploy assays over discovery-stage mechanism work. A surveillance-ready output would lift stage alignment quickly.",
      requirements: [
        { text: "Domestic (US) prime applicant", met: true },
        { text: "Validated assay or surveillance pipeline", met: false, satisfyHint: "Demonstrate the gyrA caller on ≥50 retrospective isolates." },
        { text: "Data-sharing with NARMS", met: true },
      ],
    },
    {
      id: "gates-grand-challenges",
      name: "Grand Challenges — Drug-Resistant Infections",
      organization: "Gates Foundation",
      type: "PRIVATE",
      fit: 68,
      amountMin: 100_000,
      amountMax: 250_000,
      followOn: 1_000_000,
      deadline: "DATE",
      deadlineDate: "2026-05-12",
      nextReview: "Annual call",
      url: "https://gcgh.grandchallenges.org/",
      fitBreakdown: [
        { label: "DISEASE AREA MATCH", score: 78 },
        { label: "STAGE ALIGNMENT",    score: 72 },
        { label: "EVIDENCE REQUIRED",  score: 60 },
        { label: "TECHNOLOGY FIT",     score: 62 },
      ],
      rationale:
        "Grand Challenges seeks LMIC-deployable solutions. The {{gyrA}} mechanism work is strong but lacks an obvious low-resource deployment pathway.",
      requirements: [
        { text: "LMIC partner institution", met: false, satisfyHint: "Identify a MIC-capable partner lab in target region." },
        { text: "Pathway to <$5/test field assay", met: false, satisfyHint: "Outline isothermal amplification adaptation." },
        { text: "Two-page concept note", met: true },
      ],
    },
    {
      id: "burroughs-pathogenesis",
      name: "Investigators in Pathogenesis of Infectious Disease",
      organization: "Burroughs Wellcome Fund",
      type: "ACADEMIC",
      fit: 58,
      amountMin: 500_000,
      amountMax: 500_000,
      deadline: "DATE",
      deadlineDate: "2026-11-01",
      nextReview: "Annual",
      url: "https://www.bwfund.org/",
      fitBreakdown: [
        { label: "DISEASE AREA MATCH", score: 70 },
        { label: "STAGE ALIGNMENT",    score: 55 },
        { label: "EVIDENCE REQUIRED",  score: 52 },
        { label: "TECHNOLOGY FIT",     score: 55 },
      ],
      rationale:
        "BWF favors basic-mechanism pathogenesis. {{Resistance}} mechanism work qualifies, but the program targets early-career assistant professors specifically.",
      requirements: [
        { text: "Tenure-track within 5 years of first faculty appointment", met: false, satisfyHint: "Confirm PI's first-appointment date is post-2021." },
        { text: "US/Canada institution", met: true },
        { text: "5-year research plan", met: true },
      ],
    },
    {
      id: "carb-x",
      name: "CARB-X Funding Round 12",
      organization: "CARB-X",
      type: "PRIVATE",
      fit: 47,
      amountMin: 250_000,
      amountMax: 4_000_000,
      deadline: "DATE",
      deadlineDate: "2026-12-15",
      nextReview: "Annual",
      url: "https://carb-x.org/",
      fitBreakdown: [
        { label: "DISEASE AREA MATCH", score: 80 },
        { label: "STAGE ALIGNMENT",    score: 28 },
        { label: "EVIDENCE REQUIRED",  score: 35 },
        { label: "TECHNOLOGY FIT",     score: 45 },
      ],
      rationale:
        "CARB-X funds product-stage antibacterial development. The current proposal is mechanism-of-resistance — a poor fit until a therapeutic or diagnostic product is defined.",
      requirements: [
        { text: "Defined product candidate (drug, diagnostic, or vaccine)", met: false, satisfyHint: "Spin out a diagnostic candidate from the gyrA caller." },
        { text: "Pre-clinical data package", met: false, satisfyHint: "Generate in-vivo efficacy data." },
        { text: "Commercialization pathway", met: false, satisfyHint: "Engage tech-transfer for an option agreement." },
      ],
    },
  ],
};

const DEMO_BUDGET: BudgetData = {
  estimatedWeeks: 6,
  reagents: [
    { name: "Mueller-Hinton broth, 500 g",                vendor: "BD",       vendorFull: "Becton Dickinson",  catalog: "275730",   unitPrice: 142.00, qty: 2, phase: 1 },
    { name: "Ciprofloxacin reference standard, 100 mg",   vendor: "Sigma",    vendorFull: "Sigma-Aldrich",     catalog: "17850",    unitPrice:  89.00, qty: 1, phase: 1 },
    { name: "96-well microtiter plates, sterile, pk/100", vendor: "Corning",  vendorFull: "Corning Inc.",      catalog: "3596",     unitPrice: 248.00, qty: 4, phase: 1 },
    { name: "DNA extraction kit (50 rxn)",                vendor: "Qiagen",   vendorFull: "Qiagen N.V.",       catalog: "69504",    unitPrice: 412.00, qty: 2, phase: 2 },
    { name: "Q5 High-Fidelity 2X Master Mix, 100 rxn",    vendor: "NEB",      vendorFull: "New England Biolabs", catalog: "M0492S", unitPrice: 312.00, qty: 3, phase: 2 },
    { name: "Sanger sequencing primers, custom (oligo)",  vendor: "IDT",      vendorFull: "Integrated DNA Tech.", catalog: "OLIG-CUST", unitPrice: 38.00, qty: 8, phase: 2 },
    { name: "Sanger sequencing reactions (per sample)",   vendor: "Genewiz",  vendorFull: "Azenta / Genewiz",  catalog: "SANGER-1", unitPrice:   6.50, qty: 96, phase: 2 },
    { name: "ATCC 25922 reference strain",                vendor: "ATCC",     vendorFull: "American Type Culture Collection", catalog: "25922", unitPrice: 412.00, qty: 1, phase: 1 },
    { name: "DMSO, anhydrous, 100 mL",                    vendor: "Sigma",    vendorFull: "Sigma-Aldrich",     catalog: "276855",   unitPrice:  78.00, qty: 1, phase: 1 },
    { name: "Agarose, molecular grade, 500 g",            vendor: "Bio-Rad",  vendorFull: "Bio-Rad Laboratories", catalog: "1613102", unitPrice: 196.00, qty: 1, phase: 2 },
    { name: "GelRed nucleic acid stain, 10,000X",         vendor: "Biotium",  vendorFull: "Biotium Inc.",      catalog: "41003",    unitPrice: 285.00, qty: 1, phase: 2 },
    { name: "Cryovials, 2 mL, sterile, pk/500",           vendor: "Corning",  vendorFull: "Corning Inc.",      catalog: "430659",   unitPrice: 168.00, qty: 2, phase: 1 },
    { name: "Pipette tips, filtered, pk/960 (10 µL)",     vendor: "Rainin",   vendorFull: "Mettler-Toledo Rainin", catalog: "30389226", unitPrice: 312.00, qty: 2, phase: 1 },
    { name: "Automated colony picker service",            vendor: "Twist",    vendorFull: "Twist Bioscience",  catalog: "PICK-AUTO", unitPrice: 2150.00, qty: 1, phase: 3 },
    { name: "Whole-genome sequencing (NovaSeq lane)",     vendor: "Illumina", vendorFull: "Illumina Inc.",     catalog: "LANE-NS",  unitPrice: 4800.00, qty: 1, phase: 3 },
    { name: "Cloud compute credits (analysis)",           vendor: "AWS",      vendorFull: "Amazon Web Services", catalog: "EC2-CRED", unitPrice: 1200.00, qty: 1, phase: 3 },
  ],
};

const DEMO_SCRIPTS: CodeScript[] = [
  {
    name: "mic_analysis.py",
    language: "python",
    purpose: "Compute MIC distributions per gyrA haplotype and produce a comparative box-plot for downstream resistance reporting.",
    generatedBy: "PRAXIS Bioinformatics Agent",
    requires: [
      { name: "pandas", standard: true },
      { name: "numpy", standard: true },
      { name: "matplotlib", standard: true },
      { name: "scipy", standard: true },
      { name: "pydeseq2", standard: false },
    ],
    colabUrl: "https://colab.research.google.com/",
    code: `# PRAXIS: generated bioinformatics module
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# USER: replace with your isolate table path
ISOLATES_CSV = "data/isolates.csv"

def load_isolates(path: str) -> pd.DataFrame:
    """Load MIC + genotype table for clinical isolates."""
    df = pd.read_csv(path)
    df["mic_log2"] = np.log2(df["mic_ugml"].astype(float))
    return df

def haplotype(row) -> str:
    s83 = row.get("gyrA_83", "WT")
    d87 = row.get("gyrA_87", "WT")
    return f"{s83}/{d87}"

def summarize(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["haplotype"] = df.apply(haplotype, axis=1)
    grouped = df.groupby("haplotype")["mic_log2"]
    return grouped.agg(["count", "median", "mean", "std"]).reset_index()

def plot_distribution(df: pd.DataFrame, out_png: str = "mic_dist.png"):
    fig, ax = plt.subplots(figsize=(8, 5))
    df.boxplot(column="mic_log2", by="haplotype", ax=ax, grid=False)
    ax.set_ylabel("log2 MIC (\u00b5g/mL)")
    ax.set_title("MIC distribution by gyrA haplotype")
    plt.suptitle("")
    plt.tight_layout()
    fig.savefig(out_png, dpi=200)
    return out_png

if __name__ == "__main__":
    iso = load_isolates(ISOLATES_CSV)
    summary = summarize(iso)
    print(summary.to_string(index=False))
    plot_distribution(iso)
`,
  },
  {
    name: "variant_call.py",
    language: "python",
    purpose: "Call codon 83 and 87 substitutions in the gyrA QRDR from aligned Sanger reads and emit a per-isolate haplotype table.",
    generatedBy: "PRAXIS Bioinformatics Agent",
    requires: [
      { name: "biopython", standard: true },
      { name: "pysam", standard: true },
      { name: "scanpy", standard: false },
    ],
    code: `# PRAXIS: generated variant caller for gyrA QRDR
from Bio import SeqIO
from collections import defaultdict

REFERENCE = "ATGAGCGACCTTGCGAGAGAAATTACAACCG"  # gyrA QRDR (truncated)
CODON_OFFSETS = {83: 4, 87: 16}

# USER: point at your aligned Sanger reads directory
READS_DIR = "data/sanger/"

def translate(codon: str) -> str:
    table = {"TCT":"S","TCC":"S","TCA":"S","TCG":"S",
             "TTA":"L","TTG":"L","CTT":"L","CTC":"L","CTA":"L","CTG":"L",
             "GAC":"D","GAT":"D","AAC":"N","AAT":"N"}
    return table.get(codon.upper(), "X")

def call_isolate(seq: str) -> dict:
    out = {}
    for pos, off in CODON_OFFSETS.items():
        codon = seq[off:off+3]
        out[f"gyrA_{pos}"] = translate(codon)
    return out

def main():
    rows = []
    import glob, os
    for path in glob.glob(os.path.join(READS_DIR, "*.fasta")):
        rec = next(SeqIO.parse(path, "fasta"))
        rows.append({"isolate": rec.id, **call_isolate(str(rec.seq))})
    return rows

if __name__ == "__main__":
    for r in main():
        print(r)
`,
  },
  {
    name: "resistance_plot.R",
    language: "r",
    purpose: "Render publication-grade ggplot2 figure summarizing fold-change in MIC across haplotypes with confidence intervals.",
    generatedBy: "PRAXIS Bioinformatics Agent",
    requires: [
      { name: "ggplot2", standard: true },
      { name: "dplyr", standard: true },
      { name: "readr", standard: true },
    ],
    code: `# PRAXIS: generated R visualization
library(ggplot2)
library(dplyr)
library(readr)

# USER: replace path with your summary CSV
summary <- read_csv("mic_summary.csv")

plot <- summary %>%
  mutate(haplotype = factor(haplotype,
         levels = c("WT/WT", "S83L/WT", "WT/D87N", "S83L/D87N"))) %>%
  ggplot(aes(x = haplotype, y = median, fill = haplotype)) +
  geom_col(width = 0.7) +
  geom_errorbar(aes(ymin = median - std, ymax = median + std), width = 0.2) +
  scale_fill_manual(values = c("#5a7a9a","#f0a500","#9d6fff","#ff4d4d")) +
  labs(x = NULL, y = "log2 MIC", title = "MIC by gyrA haplotype") +
  theme_minimal(base_size = 12)

ggsave("resistance.png", plot, width = 7, height = 4.5, dpi = 220)
`,
  },
];

interface State {
  status: GlobalStatus;
  agents: Record<AgentId, AgentRecord>;
  trace: TraceEntry[];
  papers: Paper[];
  protocol: ProtocolStep[];
  budget: BudgetData;
  timeline: any | null;
  funding: FundingData;
  gtm: any | null;
  bioinformatics: CodeScript[];
  tamarind: TamarindData | null;
  audit: AuditFlag[];
  keyFinding: string | null;
  hasData: { science?: boolean; protocol?: boolean; code?: boolean; budget?: boolean; funding?: boolean; risks?: boolean };
  error: string | null;
}

const initialAgents = AGENTS.reduce(
  (acc, a) => ({ ...acc, [a.id]: { state: "idle" } as AgentRecord }),
  {} as Record<AgentId, AgentRecord>
);

const initialState: State = {
  status: "READY",
  agents: initialAgents,
  trace: [],
  papers: [],
  protocol: [],
  budget: { reagents: [], estimatedWeeks: undefined },
  timeline: null,
  funding: { grants: [] },
  gtm: null,
  bioinformatics: [],
  tamarind: null,
  audit: [],
  keyFinding: null,
  hasData: {},
  error: null,
};

type Action =
  | { type: "RESET" }
  | { type: "START" }
  | { type: "AGENT_RUNNING"; agent: AgentId }
  | { type: "AGENT_COMPLETE"; agent: AgentId; data?: any }
  | { type: "AGENT_ERROR"; agent: AgentId }
  | { type: "TRACE"; entry: TraceEntry }
  | { type: "PAPERS"; papers: Paper[] }
  | { type: "PROTOCOL"; steps: ProtocolStep[] }
  | { type: "REAGENTS"; data: BudgetData }
  | { type: "TIMELINE"; data: any }
  | { type: "FUNDING"; data: FundingData }
  | { type: "GTM"; data: any }
  | { type: "BIOINFORMATICS"; data: CodeScript[] }
  | { type: "TAMARIND"; data: TamarindData }
  | { type: "AUDIT"; flags: AuditFlag[] }
  | { type: "KEY_FINDING"; text: string }
  | { type: "DISMISS_KEY_FINDING" }
  | { type: "COMPLETE" }
  | { type: "ERROR"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return { ...initialState };
    case "START":
      return { ...initialState, status: "RUNNING" };
    case "AGENT_RUNNING":
      return {
        ...state,
        agents: { ...state.agents, [action.agent]: { state: "running", startedAt: Date.now() } },
      };
    case "AGENT_COMPLETE": {
      const prev = state.agents[action.agent];
      const startedAt = prev?.startedAt ?? Date.now();
      const durationMs = Date.now() - startedAt;
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agent]: { state: "complete", startedAt, completedAt: Date.now(), durationMs, data: action.data },
        },
      };
    }
    case "AGENT_ERROR":
      return { ...state, agents: { ...state.agents, [action.agent]: { ...state.agents[action.agent], state: "error" } } };
    case "TRACE":
      return { ...state, trace: [...state.trace, action.entry].slice(-50) };
    case "PAPERS":
      return { ...state, papers: action.papers, hasData: { ...state.hasData, science: true } };
    case "PROTOCOL":
      return { ...state, protocol: action.steps, hasData: { ...state.hasData, protocol: true } };
    case "REAGENTS":
      return { ...state, budget: action.data, hasData: { ...state.hasData, budget: action.data.reagents.length > 0 } };
    case "TIMELINE":
      return { ...state, timeline: action.data };
    case "FUNDING":
      return { ...state, funding: action.data, hasData: { ...state.hasData, funding: action.data.grants.length > 0 } };
    case "GTM":
      return { ...state, gtm: action.data };
    case "BIOINFORMATICS":
      return { ...state, bioinformatics: action.data, hasData: { ...state.hasData, code: action.data.length > 0 } };
    case "TAMARIND":
      return { ...state, tamarind: action.data, hasData: { ...state.hasData, science: true } };
    case "AUDIT":
      return { ...state, audit: action.flags, hasData: { ...state.hasData, risks: true } };
    case "KEY_FINDING":
      return { ...state, keyFinding: action.text };
    case "DISMISS_KEY_FINDING":
      return { ...state, keyFinding: null };
    case "COMPLETE":
      return { ...state, status: "COMPLETE" };
    case "ERROR":
      return { ...state, status: "READY", error: action.message };
    default:
      return state;
  }
}

const AGENT_EVENTS: AgentId[] = ["context","literature","bioinformatics","protocol","reagents","timeline","funding","gtm"];

function nowTs(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function usePraxisPipeline() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const demoTimers = useRef<number[]>([]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    demoTimers.current.forEach((t) => window.clearTimeout(t));
    demoTimers.current = [];
  }, []);

  const handleEvent = useCallback((evt: string, payload: any) => {
    if (AGENT_EVENTS.includes(evt as AgentId)) {
      const agent = evt as AgentId;
      const phase = payload?.phase ?? (payload?.complete ? "complete" : "complete");
      if (phase === "running" || payload?.status === "running") {
        dispatch({ type: "AGENT_RUNNING", agent });
        return;
      }
      if (phase === "error") { dispatch({ type: "AGENT_ERROR", agent }); return; }
      // complete
      dispatch({ type: "AGENT_COMPLETE", agent, data: payload });
      if (agent === "literature" && payload?.papers) dispatch({ type: "PAPERS", papers: payload.papers });
      if (agent === "protocol"   && payload?.steps)  dispatch({ type: "PROTOCOL", steps: payload.steps });
      if (agent === "reagents") {
        const reagents: Reagent[] = Array.isArray(payload?.reagents)
          ? payload.reagents
          : Array.isArray(payload) ? payload : [];
        dispatch({ type: "REAGENTS", data: { reagents, estimatedWeeks: payload?.estimatedWeeks } });
      }
      if (agent === "timeline")     dispatch({ type: "TIMELINE", data: payload });
      if (agent === "funding") {
        const grants: FundingGrant[] = Array.isArray(payload?.grants)
          ? payload.grants
          : Array.isArray(payload?.opportunities) ? payload.opportunities
          : Array.isArray(payload) ? payload : [];
        dispatch({ type: "FUNDING", data: { grants } });
      }
      if (agent === "gtm")          dispatch({ type: "GTM",      data: payload });
      if (agent === "bioinformatics") {
        const scripts: CodeScript[] = Array.isArray(payload?.scripts)
          ? payload.scripts
          : Array.isArray(payload) ? payload : [];
        dispatch({ type: "BIOINFORMATICS", data: scripts });
      }
      return;
    }
    if (evt === "tamarind")    dispatch({ type: "TAMARIND", data: payload });
    else if (evt === "audit")  dispatch({ type: "AUDIT", flags: payload?.flags ?? payload ?? [] });
    else if (evt === "key_finding") dispatch({ type: "KEY_FINDING", text: payload?.text ?? String(payload ?? "") });
    else if (evt === "trace")  dispatch({ type: "TRACE", entry: { ts: nowTs(), agent: payload?.agent ?? "system", message: payload?.message ?? String(payload ?? "") } });
    else if (evt === "complete") dispatch({ type: "COMPLETE" });
    else if (evt === "error")  dispatch({ type: "ERROR", message: payload?.message ?? "Unknown error" });
  }, []);

  const startDemo = useCallback((hypothesis: string) => {
    // Demo run when no live backend is available
    let t = 0;
    const at = (ms: number, fn: () => void) => {
      const id = window.setTimeout(fn, ms);
      demoTimers.current.push(id);
    };
    const trace = (agent: AgentId | "system", message: string) =>
      dispatch({ type: "TRACE", entry: { ts: nowTs(), agent, message } });

    trace("system", `hypothesis received · ${hypothesis.slice(0, 80)}`);

    AGENTS.forEach((agent, i) => {
      const startAt = (t += 600);
      const endAt = (t += 1200 + i * 300);
      at(startAt, () => {
        dispatch({ type: "AGENT_RUNNING", agent: agent.id });
        trace(agent.id, "started");
      });
      at(endAt, () => {
        dispatch({ type: "AGENT_COMPLETE", agent: agent.id });
        trace(agent.id, "completed");
        // emit synthetic data per agent
        if (agent.id === "literature") {
          dispatch({
            type: "PAPERS",
            papers: [
              { title: "Resistance-conferring mutations in DNA gyrase", authors: "Chen J, Kumar R, Suzuki M", journal: "Nature Microbiology", year: 2023, relevance: 0.94,
                abstract: "We characterize fluoroquinolone resistance via GyrA mutations across 412 isolates and identify dominant haplotypes.",
                claims: ["IC50: 890 nM [GyrA D87N]", "MIC shift 16x [S83L]", "n=412 isolates"] },
              { title: "Structural basis of fluoroquinolone binding", authors: "Park H, et al.", journal: "Cell", year: 2022, relevance: 0.81,
                abstract: "Cryo-EM structures of the gyrase–DNA–quinolone ternary complex at 2.6 Å.", claims: ["Resolution 2.6 Å", "Mg2+ coordination required"] },
              { title: "Computational prediction of resistance evolution", authors: "Okafor N, Weiss D", journal: "PNAS", year: 2024, relevance: 0.72,
                abstract: "ML model forecasts resistance trajectories from genomic surveillance.", claims: ["AUC 0.91", "5-yr forecast horizon"] },
            ],
          });
        }
        if (agent.id === "protocol") {
          dispatch({
            type: "PROTOCOL",
            steps: [
              { title: "Bacterial culture preparation", description: "Streak isolates onto MH agar; incubate 18h at 37°C.", volume: "—", time: "18h", equipment: "Incubator", controls: ["ATCC 25922"], missingControls: ["vehicle control"] },
              { title: "MIC determination by broth microdilution", description: "Serial 2-fold dilutions per CLSI M07.", volume: "100 µL/well", time: "20h", equipment: "96-well plate, plate reader", controls: ["positive: ciprofloxacin", "negative: media"] },
              { title: "DNA extraction & gyrA sequencing", description: "Boil-prep, PCR amplify QRDR, Sanger sequence.", volume: "25 µL rxn", time: "6h", equipment: "Thermocycler", controls: ["no-template control"] },
              { title: "Variant analysis", description: "Align to reference; call codon 83/87 substitutions.", time: "1h", equipment: "Bioinformatics", controls: [] },
            ],
          });
        }
        if (agent.id === "reagents") {
          dispatch({ type: "REAGENTS", data: DEMO_BUDGET });
        }
        if (agent.id === "timeline") dispatch({ type: "TIMELINE", data: { weeks: 6, milestones: 4 } });
        if (agent.id === "funding") dispatch({ type: "FUNDING", data: DEMO_FUNDING });
        if (agent.id === "gtm") dispatch({ type: "GTM", data: { tam: "1.2B", segments: ["clinical micro labs", "AMR surveillance"] } });
        if (agent.id === "bioinformatics") dispatch({ type: "BIOINFORMATICS", data: DEMO_SCRIPTS });
      });
    });

    at((t += 800), () => {
      // Initial: structural job complete metadata, PDB streaming next.
      dispatch({
        type: "TAMARIND",
        data: {
          pdb: undefined,
          confidence: 0.874,
          residues: 237,
          source: "TAMARIND BIO · ALPHAFOLD",
          proteinName: "GyrA · E. coli · D87N MUTANT",
          mutationSites: ["D87N", "S83L"],
        },
      });
      // Fetch a real public PDB so the 3Dmol viewer has something to render in the demo.
      // 1KZN = DNA gyrase B fragment with novobiocin — small, fast to load, biologically relevant.
      fetch("https://files.rcsb.org/download/1KZN.pdb")
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error("PDB fetch failed"))))
        .then((pdb) => {
          dispatch({
            type: "TAMARIND",
            data: {
              pdb,
              confidence: 0.874,
              residues: 237,
              source: "TAMARIND BIO · ALPHAFOLD",
              proteinName: "GyrA · E. coli · D87N MUTANT",
              mutationSites: ["D87N", "S83L"],
            },
          });
        })
        .catch(() => {
          dispatch({
            type: "TAMARIND",
            data: {
              confidence: 0.874,
              residues: 237,
              source: "TAMARIND BIO · ALPHAFOLD",
              proteinName: "GyrA · E. coli · D87N MUTANT",
              mutationSites: ["D87N", "S83L"],
              error: "Protein not found in AlphaFold database",
            },
          });
        });
    });
    at((t += 600), () => {
      dispatch({ type: "KEY_FINDING", text: "GyrA S83L confers 16× MIC shift; D87N adds 4× — combined haplotype dominates clinical isolates." });
    });
    at((t += 600), () => {
      dispatch({ type: "AUDIT", flags: [
        { severity: "HIGH", title: "Missing vehicle control in step 01", detail: "Add DMSO vehicle to baseline growth comparison." },
        { severity: "MEDIUM", title: "Sample size below CLSI recommendation", detail: "n=412 acceptable; replicates per isolate not specified." },
        { severity: "LOW", title: "Reagent vendor lock-in", detail: "Single source for ciprofloxacin standard." },
      ] });
      dispatch({ type: "COMPLETE" });
      trace("system", "pipeline complete");
    });
  }, []);

  const run = useCallback(async (hypothesis: string) => {
    stop();
    dispatch({ type: "START" });

    // Try the live backend first; fall back to demo if unreachable.
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("http://localhost:8000/pipeline/stream", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ hypothesis }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error("backend unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let evt = "message";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trimEnd();
          if (!line) { evt = "message"; continue; }
          if (line.startsWith("event:")) { evt = line.slice(6).trim(); continue; }
          if (line.startsWith("data:")) {
            const dataStr = line.slice(5).trim();
            let payload: any = dataStr;
            try { payload = JSON.parse(dataStr); } catch { /* keep string */ }
            handleEvent(evt, payload);
          }
        }
      }
    } catch {
      // Backend unreachable — run a simulated pipeline so the UI still demos.
      startDemo(hypothesis);
    }
  }, [handleEvent, startDemo, stop]);

  const reset = useCallback(() => {
    stop();
    dispatch({ type: "RESET" });
  }, [stop]);

  const dismissKeyFinding = useCallback(() => dispatch({ type: "DISMISS_KEY_FINDING" }), []);

  return { state, run, reset, dismissKeyFinding };
}