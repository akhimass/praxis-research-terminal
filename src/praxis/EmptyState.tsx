import { Card } from "@/components/ui/card";

const TILES = [
  { icon: "⚗",   title: "Protocol Synthesis",    color: "#fafafa" },
  { icon: "🧬",  title: "Literature Mining",     color: "#fafafa" },
  { icon: "</>", title: "Bioinformatics Code",   color: "#fafafa" },
  { icon: "💰",  title: "Funding Intelligence",  color: "#a1a1a1" },
];

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh]">
      <h1 className="font-mono font-extrabold text-card text-[80px] tracking-[0.15em] leading-none select-none">
        PRAXIS
      </h1>
      <p className="mt-3 mb-10 text-[11px] tracking-[0.2em] uppercase text-text-muted">
        Enter hypothesis to begin analysis
      </p>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <Card
            key={t.title}
            className="w-40 p-4 rounded-none bg-surface-deep border-border shadow-none"
          >
            <div className="mb-3 text-[18px] opacity-60" style={{ color: t.color }}>
              {t.icon}
            </div>
            <div className="text-[12px] font-medium tracking-[0.05em] text-text-dim">
              {t.title}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}