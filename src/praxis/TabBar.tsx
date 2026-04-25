import { cn } from "@/lib/utils";

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
    <div className="flex items-stretch border-b border-border bg-background">
      {TABS.map((t) => {
        const isActive = active === t.id;
        const dataKey = t.id.toLowerCase() as Lowercase<TabId>;
        const has = hasData[dataKey];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "relative w-[120px] h-10 text-[11px] font-semibold uppercase tracking-[0.15em] transition-all border-b-2",
              isActive
                ? "bg-card text-foreground border-ax-green"
                : "bg-transparent text-text-muted border-transparent hover:text-text-dim",
            )}
          >
            {t.id}
            {has && (
              <span
                className="absolute top-2 right-3.5 w-1 h-1"
                style={{
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