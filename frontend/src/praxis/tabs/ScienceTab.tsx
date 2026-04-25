import { useState } from "react";
import { Paper, TamarindData } from "../lib/types";
import { ProteinViewer } from "../ProteinViewer";
import { AgentError } from "@/components/AgentError";
import { EvidenceLandscape } from "@/components/visualizations/EvidenceLandscape";

export type LiteratureStatus = "ok" | "no_results" | "api_error";
export type NoveltySignal = "NOT FOUND" | "SIMILAR EXISTS" | "EXACT MATCH";

interface Props {
  papers: Paper[];
  tamarind: TamarindData | null;
  isStructureLoading?: boolean;
  /** Alias: literature agent still streaming */
  isLoadingLiterature?: boolean;
  /** Alias: structure / tamarind agent still streaming */
  isLoadingTamarind?: boolean;
  literatureStatus?: LiteratureStatus;
  novelty?: NoveltySignal;
  hypothesisTerms?: string;
  onRetry?: () => void;
}

export function ScienceTab({
  papers,
  tamarind,
  isStructureLoading = false,
  isLoadingLiterature = false,
  isLoadingTamarind = false,
  literatureStatus = "ok",
  novelty,
  hypothesisTerms,
  onRetry,
}: Props) {
  const litBusy = isLoadingLiterature;
  const structBusy = isLoadingTamarind || isStructureLoading;
  return (
    <div className="flex flex-col gap-4 w-full animate-praxis-fade">
      {litBusy && (
        <div className="font-mono text-[10px] tracking-[0.15em] text-ax-amber border border-ax-amber/30 px-2 py-1 w-fit">
          LITERATURE AGENT RUNNING…
        </div>
      )}
      <div className="grid w-full" style={{ gridTemplateColumns: "55fr 45fr", gap: 16, minHeight: 320 }}>
        <LiteratureColumn
          papers={papers}
          status={literatureStatus}
          novelty={novelty}
          hypothesisTerms={hypothesisTerms}
          onRetry={onRetry}
        />
        <div className="min-h-0">
          <ProteinViewer tamarind={tamarind} isLoading={structBusy} onRetry={onRetry} />
        </div>
      </div>
      {papers.length > 0 && <EvidenceLandscape papers={papers} />}
    </div>
  );
}

function NoveltyBanner({ signal }: { signal: NoveltySignal }) {
  const icon = signal === "EXACT MATCH" ? "●" : signal === "SIMILAR EXISTS" ? "◐" : "●";
  const tone =
    signal === "NOT FOUND" ? "border-foreground/60 text-foreground"   // good news
    : signal === "EXACT MATCH" ? "border-destructive/60 text-destructive"
    : "border-ax-amber/60 text-ax-amber";
  return (
    <div className={`mb-3 inline-flex items-center gap-2 px-3 py-1.5 border ${tone} font-mono text-[10px] font-bold tracking-[0.18em] uppercase`}>
      <span>NOVELTY:</span>
      <span>[ {icon} {signal} ]</span>
    </div>
  );
}

function LiteratureColumn({
  papers, status, novelty, hypothesisTerms, onRetry,
}: {
  papers: Paper[];
  status: LiteratureStatus;
  novelty?: NoveltySignal;
  hypothesisTerms?: string;
  onRetry?: () => void;
}) {
  const pubmedHref = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(hypothesisTerms ?? "")}`;
  const cached = status === "api_error" && papers.length > 0;
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono uppercase" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.2em" }}>
          LITERATURE · {papers.length} PAPERS
        </span>
        {cached && (
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase px-2 py-0.5 border border-ax-amber/40 text-ax-amber/80">
            CACHED DATA
          </span>
        )}
      </div>

      {novelty && <NoveltyBanner signal={novelty} />}

      {status === "no_results" && papers.length === 0 && (
        <AgentError
          agent="LITERATURE"
          title="No literature found"
          message="Tavily search returned no results for this hypothesis."
          suggestion="Try simplifying the hypothesis or searching manually."
          canRetry={!!onRetry}
          onRetry={onRetry}
          actions={[{ label: "SEARCH PUBMED ↗", href: pubmedHref, variant: "primary" }]}
          className="mb-3"
        />
      )}

      {status === "api_error" && (
        <AgentError
          agent="LITERATURE"
          title="Literature search unavailable"
          message="Tavily API unreachable. Using cached results."
          suggestion="Results may be less current. Full search will resume automatically."
          canRetry={!!onRetry}
          onRetry={onRetry}
          className="mb-3"
        />
      )}

      <div className="flex flex-col gap-2 overflow-y-auto praxis-scroll pr-1">
        {papers.length === 0 && status === "ok" && <EmptyHint>No literature retrieved yet.</EmptyHint>}
        {papers.map((p, i) => <PaperCard key={i} paper={p} />)}
      </div>
    </div>
  );
}

function PaperCard({ paper }: { paper: Paper }) {
  const [open, setOpen] = useState(false);
  const rel = Math.max(0, Math.min(1, paper.relevance ?? 0));
  return (
    <div
      className="cursor-pointer transition-all duration-150"
      style={{ background: "#0a0a0a", borderLeft: "3px solid #fafafa", padding: "12px 14px", borderTop: "1px solid #262626", borderRight: "1px solid #262626", borderBottom: "1px solid #262626" }}
      onClick={() => setOpen((o) => !o)}
    >
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono font-semibold" style={{ fontSize: 12, color: "#fafafa" }}>{paper.title}</div>
          <div className="font-mono mt-1" style={{ fontSize: 9, color: "#a1a1a1" }}>
            {paper.authors} · {paper.journal} · {paper.year}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0" title={`Relevance ${(rel * 100).toFixed(0)}%`}>
          <div style={{ width: 4, height: 40, background: "#262626", position: "relative" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 4, height: `${rel * 100}%`, background: "#fafafa", boxShadow: "0 0 6px #fafafa88" }} />
          </div>
          <span className="font-mono" style={{ fontSize: 8, color: "#a1a1a1" }}>{(rel * 100).toFixed(0)}</span>
        </div>
      </div>
      {open && (
        <div className="mt-3 pt-3 animate-praxis-fade" style={{ borderTop: "1px solid #262626" }}>
          {paper.abstract && (
            <div className="font-mono mb-3" style={{ fontSize: 10, color: "#a1a1a1", lineHeight: 1.6 }}>
              {paper.abstract}
            </div>
          )}
          {paper.claims && paper.claims.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {paper.claims.map((c, i) => (
                <span key={i} className="font-mono" style={{ fontSize: 9, padding: "3px 8px", background: "#a1a1a112", color: "#a1a1a1", border: "1px solid #a1a1a144" }}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="font-mono" style={{ fontSize: 10, color: "#404040" }}>{children}</div>;
}
