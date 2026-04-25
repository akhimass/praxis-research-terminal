import { cn } from "@/lib/utils";

export type TabId = "SCIENCE" | "PROTOCOL" | "CODE" | "BUDGET" | "FUNDING" | "RISKS";
export type TabDotStatus = "none" | "ok" | "warn" | "error" | "running";

const TABS: TabId[] = ["SCIENCE", "PROTOCOL", "CODE", "BUDGET", "FUNDING", "RISKS"];

interface Props {
  active: TabId;
  onChange: (t: TabId) => void;
  hasData: Partial<Record<Lowercase<TabId>, boolean>>;
  /** Optional per-tab status override (running/ok/warn/error). Falls back to hasData. */
  status?: Partial<Record<TabId, TabDotStatus>>;
}

function dotColor(s: TabDotStatus): string {
  switch (s) {
    case "ok":      return "#fafafa";
    case "warn":    return "hsl(var(--accent-amber))";
    case "error":   return "hsl(var(--destructive))";
    case "running": return "hsl(var(--accent-amber))";
    default:        return "transparent";
  }
}

export function TabBar({ active, onChange, hasData, status }: Props) {
  return (
    <div className="flex items-stretch border-b border-border bg-background">
      {TABS.map((id) => {
        const isActive = active === id;
        const dataKey = id.toLowerCase() as Lowercase<TabId>;
        const has = hasData[dataKey];
        const s: TabDotStatus = status?.[id] ?? (has ? "ok" : "none");
        const color = dotColor(s);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "relative w-[120px] h-10 text-[11px] font-semibold uppercase tracking-[0.15em] transition-all border-b-2",
              isActive
                ? "bg-card text-foreground border-foreground/60"
                : "bg-transparent text-text-muted border-transparent hover:text-text-dim",
            )}
            aria-label={`${id} tab${s !== "none" ? `, status ${s}` : ""}`}
          >
            {id}
            {s !== "none" && (
              <span
                className={cn(
                  "absolute top-2 right-3.5 w-1.5 h-1.5 rounded-full",
                  s === "running" && "animate-status-pulse",
                )}
                style={{
                  background: color,
                  boxShadow: s === "ok" ? `0 0 6px ${color}` : `0 0 4px ${color}aa`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
