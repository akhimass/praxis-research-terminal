import { useState } from "react";
import { Paper, TamarindData } from "../lib/types";
import { ProteinViewer } from "../ProteinViewer";

interface Props { papers: Paper[]; tamarind: TamarindData | null; isStructureLoading?: boolean; }

export function ScienceTab({ papers, tamarind, isStructureLoading = false }: Props) {
  return (
    <div className="grid w-full h-full animate-praxis-fade" style={{ gridTemplateColumns: "55fr 45fr", gap: 16 }}>
      <LiteratureColumn papers={papers} />
      <div className="min-h-0">
        <ProteinViewer tamarind={tamarind} isLoading={isStructureLoading} />
      </div>
    </div>
  );
}

function LiteratureColumn({ papers }: { papers: Paper[] }) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="font-mono mb-3 uppercase" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.2em" }}>
        LITERATURE · {papers.length} PAPERS
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto praxis-scroll pr-1">
        {papers.length === 0 && <EmptyHint>No literature retrieved yet.</EmptyHint>}
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