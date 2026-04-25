const TILES = [
  { icon: "⚗", title: "PROTOCOL SYNTHESIS", color: "#00d97e" },
  { icon: "🧬", title: "LITERATURE MINING", color: "#9d6fff" },
  { icon: "</>", title: "BIOINFORMATICS CODE", color: "#4d9fff" },
  { icon: "💰", title: "FUNDING INTELLIGENCE", color: "#f0a500" },
];

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center w-full" style={{ minHeight: "60vh" }}>
      <div
        className="font-mono font-extrabold select-none"
        style={{ fontSize: 80, color: "#0d1e35", letterSpacing: "0.15em", lineHeight: 1 }}
      >
        PRAXIS
      </div>
      <div className="font-mono mt-3 mb-10" style={{ fontSize: 9, color: "#2a4060", letterSpacing: "0.2em" }}>
        ENTER HYPOTHESIS TO BEGIN ANALYSIS
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((t) => (
          <div key={t.title} style={{ width: 160, background: "#08101f", border: "1px solid #1a2f50", padding: 16 }}>
            <div className="font-mono mb-3" style={{ color: t.color, fontSize: 18, opacity: 0.55 }}>
              {t.icon}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: "#5a7a9a", letterSpacing: "0.1em" }}>
              {t.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}