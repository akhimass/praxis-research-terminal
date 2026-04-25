export type TabId = "SCIENCE" | "PROTOCOL" | "CODE" | "BUDGET" | "FUNDING" | "RISKS";
export const TABS: { id: TabId; dot: string }[] = [
  { id: "SCIENCE",  dot: "#9d6fff" },
  { id: "PROTOCOL", dot: "#00d97e" },
  { id: "CODE",     dot: "#4d9fff" },
  { id: "BUDGET",   dot: "#f0a500" },
  { id: "FUNDING",  dot: "#00d97e" },
  { id: "RISKS",    dot: "#ff4d4d" },
];

interface Props {
  active: TabId;
  onChange: (t: TabId) => void;
  hasData: Partial<Record<Lowercase<TabId>, boolean>>;
}

export function TabBar({ active, onChange, hasData }: Props) {
  return (
    <div className="flex items-stretch" style={{ borderBottom: "1px solid #1a2f50", background: "#050a14" }}>
      {TABS.map((t) => {
        const isActive = active === t.id;
        const dataKey = t.id.toLowerCase() as Lowercase<TabId>;
        const has = hasData[dataKey];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="font-mono font-bold uppercase transition-all duration-150 relative"
            style={{
              width: 120,
              height: 40,
              fontSize: 10,
              letterSpacing: "0.15em",
              background: isActive ? "#0d1e35" : "transparent",
              borderBottom: isActive ? "2px solid #00d97e" : "2px solid transparent",
              color: isActive ? "#e2eaf5" : "#2a4060",
              cursor: "pointer",
            }}
          >
            {t.id}
            {has && (
              <span
                style={{
                  position: "absolute",
                  top: 8, right: 14,
                  width: 4, height: 4,
                  background: t.dot,
                  boxShadow: `0 0 6px ${t.dot}`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}