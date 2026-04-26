import { useRef } from "react";

const EXAMPLE_HYPOTHESES = [
  {
    label: "Gut permeability · probiotic · mouse",
    emoji: "🧫",
    hypothesis: `Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.`,
  },
  {
    label: "CRP biosensor · whole blood · 10 min",
    emoji: "🩸",
    hypothesis: `A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing.`,
  },
  {
    label: "Trehalose cryoprotectant · HeLa cells",
    emoji: "🧬",
    hypothesis: `Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.`,
  },
  {
    label: "CO₂ fixation · bioelectrochemical · acetate",
    emoji: "🌿",
    hypothesis: `Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of −400mV vs SHE will fix CO₂ into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.`,
  },
];

const FEATURE_TILES = [
  { icon: "📋", title: "PROTOCOL", desc: "Step-by-step SOP with volumes, controls, equipment", color: "#00d97e" },
  { icon: "🔬", title: "LITERATURE QC", desc: "Novelty signal from 214M papers before plan generates", color: "#9d6fff" },
  { icon: "🧪", title: "REAGENTS", desc: "Real catalog numbers, vendors, current pricing", color: "#f0a500" },
  { icon: "📊", title: "BUDGET & TIMELINE", desc: "Phase breakdown, Gantt chart, critical path", color: "#4d9fff" },
  { icon: "🧬", title: "STRUCTURE", desc: "AlphaFold protein structure via Tamarind Bio", color: "#4d9fff" },
  { icon: "</>", title: "ANALYSIS CODE", desc: "Runnable Python & R scripts, download ready", color: "#00d97e" },
  { icon: "💰", title: "FUNDING", desc: "NIH, BARDA, Wellcome — grant fit scored automatically", color: "#f0a500" },
  { icon: "🔄", title: "LEARNING LOOP", desc: "Corrections improve future plans automatically", color: "#9d6fff" },
];

interface Props {
  onSelectHypothesis?: (hypothesis: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function EmptyState({ onSelectHypothesis, textareaRef }: Props) {
  const handlePillClick = (hypothesis: string) => {
    onSelectHypothesis?.(hypothesis);
    // Focus the textarea after selection
    setTimeout(() => {
      textareaRef?.current?.focus();
    }, 50);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] py-12">
      <div className="max-w-[720px] mx-auto px-4 text-center">
        {/* Top Section */}
        <div
          className="font-mono text-[11px] font-normal tracking-[0.3em] uppercase mb-3"
          style={{ color: "#5a7a9a" }}
        >
          THE AI SCIENTIST
        </div>

        <h1
          className="font-mono font-extrabold text-[52px] tracking-[0.08em] leading-none select-none mb-4"
          style={{ color: "#e2eaf5" }}
        >
          PRAXIS
        </h1>

        <p
          className="font-mono text-[14px] font-normal mb-2"
          style={{ color: "#5a7a9a" }}
        >
          From hypothesis to executable experiment plan in 90 seconds.
        </p>

        <p
          className="font-mono text-[11px] font-normal leading-[1.8] mb-8 max-w-[560px] mx-auto"
          style={{ color: "#2a4060" }}
        >
          Type a scientific question. PRAXIS searches 214M papers,
          designs your protocol, sources your reagents, builds your
          budget, generates your analysis code, and finds your funding.
        </p>

        {/* Example Hypotheses */}
        <div
          className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase mb-2.5"
          style={{ color: "#2a4060" }}
        >
          TRY AN EXAMPLE
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {EXAMPLE_HYPOTHESES.map((ex, i) => (
            <button
              key={i}
              onClick={() => handlePillClick(ex.hypothesis)}
              className="px-3.5 py-2 font-mono text-[10px] cursor-pointer transition-all duration-150"
              style={{
                background: "#0d1e35",
                border: "1px solid #1a2f50",
                color: "#5a7a9a",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#00d97e66";
                e.currentTarget.style.color = "#00d97e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a2f50";
                e.currentTarget.style.color = "#5a7a9a";
              }}
            >
              {ex.emoji}&nbsp;&nbsp;{ex.label}
            </button>
          ))}
        </div>

        {/* What Praxis Generates */}
        <div
          className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase mb-3"
          style={{ color: "#2a4060" }}
        >
          WHAT PRAXIS GENERATES
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {FEATURE_TILES.map((tile, i) => (
            <div
              key={i}
              className="p-3.5 text-left"
              style={{
                background: "#0a1628",
                border: "1px solid #1a2f50",
              }}
            >
              <div className="text-[22px] mb-2 opacity-80">{tile.icon}</div>
              <div
                className="font-mono text-[11px] font-bold mb-1 tracking-[0.03em]"
                style={{ color: tile.color }}
              >
                {tile.title}
              </div>
              <div
                className="font-mono text-[9px] leading-[1.5]"
                style={{ color: "#2a4060" }}
              >
                {tile.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Hint */}
        <div
          className="font-mono text-[9px] mt-6"
          style={{ color: "#1a2f50" }}
        >
          ← Type your hypothesis or click an example above
        </div>
      </div>
    </div>
  );
}
