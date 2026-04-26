import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  { icon: "📋", title: "PROTOCOL", desc: "Step-by-step SOP with volumes, controls, equipment" },
  { icon: "🔬", title: "LITERATURE QC", desc: "Novelty signal from 214M papers before plan generates" },
  { icon: "🧪", title: "REAGENTS", desc: "Real catalog numbers, vendors, current pricing" },
  { icon: "📊", title: "BUDGET & TIMELINE", desc: "Phase breakdown, Gantt chart, critical path" },
  { icon: "🧬", title: "STRUCTURE", desc: "AlphaFold protein structure via Tamarind Bio" },
  { icon: "</>", title: "ANALYSIS CODE", desc: "Runnable Python & R scripts, download ready" },
  { icon: "💰", title: "FUNDING", desc: "NIH, BARDA, Wellcome — grant fit scored automatically" },
  { icon: "🔄", title: "LEARNING LOOP", desc: "Corrections improve future plans automatically" },
];

interface Props {
  onSelectHypothesis?: (hypothesis: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function EmptyState({ onSelectHypothesis, textareaRef }: Props) {
  const handlePillClick = (hypothesis: string) => {
    onSelectHypothesis?.(hypothesis);
    setTimeout(() => {
      textareaRef?.current?.focus();
    }, 50);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] py-12 bg-background text-foreground">
      <div className="max-w-[720px] mx-auto px-4 text-center">
        <p className="font-mono text-[11px] font-normal tracking-[0.3em] uppercase mb-3 text-muted-foreground">
          THE AI SCIENTIST
        </p>

        <h1 className="font-mono font-extrabold text-[64px] md:text-[72px] tracking-[0.1em] leading-none select-none mb-6 text-foreground">
          PRAXIS
        </h1>

        <p className="font-mono text-[14px] font-normal mb-2 text-muted-foreground">
          From hypothesis to executable experiment plan in 90 seconds.
        </p>

        <p className="font-mono text-[11px] font-normal leading-[1.8] mb-8 max-w-[560px] mx-auto text-muted-foreground">
          Type a scientific question. PRAXIS searches 214M papers,
          designs your protocol, sources your reagents, builds your
          budget, generates your analysis code, and finds your funding.
        </p>

        <p className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase mb-2.5 text-muted-foreground">
          TRY AN EXAMPLE
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {EXAMPLE_HYPOTHESES.map((ex, i) => (
            <Button
              key={i}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePillClick(ex.hypothesis)}
              className={cn(
                "h-auto min-h-9 rounded-md border-border bg-card px-3.5 py-2 font-mono text-[10px] font-normal",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "whitespace-normal text-left max-w-[280px]",
              )}
            >
              <span className="mr-1.5 opacity-90">{ex.emoji}</span>
              {ex.label}
            </Button>
          ))}
        </div>

        <p className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase mb-3 text-muted-foreground">
          WHAT PRAXIS GENERATES
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-left">
          {FEATURE_TILES.map((tile, i) => (
            <Card
              key={i}
              className="rounded-md border-border bg-card text-card-foreground shadow-none"
            >
              <CardHeader className="space-y-1 p-4 pb-2">
                <div className="text-[22px] leading-none opacity-90">{tile.icon}</div>
                <CardTitle className="font-mono text-[11px] font-bold tracking-[0.03em] text-foreground">
                  {tile.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <CardDescription className="font-mono text-[9px] leading-[1.5] text-muted-foreground">
                  {tile.desc}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="font-mono text-[9px] mt-6 text-muted-foreground">
          ← Type your hypothesis or click an example above
        </p>
      </div>
    </div>
  );
}
