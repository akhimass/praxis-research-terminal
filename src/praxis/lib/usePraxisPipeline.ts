import { useCallback, useReducer, useRef } from "react";
import {
  AgentId,
  AGENTS,
  AgentRecord,
  AuditFlag,
  GlobalStatus,
  Paper,
  ProtocolStep,
  TamarindData,
  TraceEntry,
} from "./types";

interface State {
  status: GlobalStatus;
  agents: Record<AgentId, AgentRecord>;
  trace: TraceEntry[];
  papers: Paper[];
  protocol: ProtocolStep[];
  reagents: any[];
  timeline: any | null;
  funding: any | null;
  gtm: any | null;
  bioinformatics: any | null;
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
  reagents: [],
  timeline: null,
  funding: null,
  gtm: null,
  bioinformatics: null,
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
  | { type: "REAGENTS"; data: any }
  | { type: "TIMELINE"; data: any }
  | { type: "FUNDING"; data: any }
  | { type: "GTM"; data: any }
  | { type: "BIOINFORMATICS"; data: any }
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
      return { ...state, reagents: action.data, hasData: { ...state.hasData, budget: true } };
    case "TIMELINE":
      return { ...state, timeline: action.data };
    case "FUNDING":
      return { ...state, funding: action.data, hasData: { ...state.hasData, funding: true } };
    case "GTM":
      return { ...state, gtm: action.data };
    case "BIOINFORMATICS":
      return { ...state, bioinformatics: action.data, hasData: { ...state.hasData, code: true } };
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
      if (agent === "reagents")     dispatch({ type: "REAGENTS", data: payload?.reagents ?? payload });
      if (agent === "timeline")     dispatch({ type: "TIMELINE", data: payload });
      if (agent === "funding")      dispatch({ type: "FUNDING",  data: payload });
      if (agent === "gtm")          dispatch({ type: "GTM",      data: payload });
      if (agent === "bioinformatics") dispatch({ type: "BIOINFORMATICS", data: payload });
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
          dispatch({ type: "REAGENTS", data: { items: [
            { name: "Mueller-Hinton broth", vendor: "BD", cost: 142 },
            { name: "Ciprofloxacin reference standard", vendor: "Sigma", cost: 89 },
            { name: "PCR mastermix 2x", vendor: "NEB", cost: 312 },
          ], total: 543 } });
        }
        if (agent.id === "timeline") dispatch({ type: "TIMELINE", data: { weeks: 6, milestones: 4 } });
        if (agent.id === "funding") dispatch({ type: "FUNDING", data: { opportunities: [
          { agency: "NIH NIAID", program: "R21 AI", amount: 275000, deadline: "2025-06-16" },
          { agency: "Wellcome Trust", program: "Discovery Award", amount: 600000, deadline: "2025-09-01" },
        ] } });
        if (agent.id === "gtm") dispatch({ type: "GTM", data: { tam: "1.2B", segments: ["clinical micro labs", "AMR surveillance"] } });
        if (agent.id === "bioinformatics") dispatch({ type: "BIOINFORMATICS", data: { snippets: 3 } });
      });
    });

    at((t += 800), () => {
      dispatch({ type: "TAMARIND", data: { pdb: undefined, confidence: 0.87, residues: 875, source: "AlphaFold / Tamarind Bio" } });
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