import { useMemo } from "react";
import { Reagent } from "@/praxis/lib/types";

interface Props {
  reagents: Reagent[];
  vendorFilter?: string | null;
  onVendorFilter?: (v: string | null) => void;
  height?: number;
}

// 6-vendor neutral palette — distinguishable greys + amber highlight for selected
const PALETTE = [
  "hsl(0 0% 92%)",
  "hsl(0 0% 76%)",
  "hsl(0 0% 60%)",
  "hsl(0 0% 46%)",
  "hsl(0 0% 34%)",
  "hsl(0 0% 24%)",
];

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(n)}`;
}

export function ReagentOriginMap({ reagents, vendorFilter, onVendorFilter, height = 160 }: Props) {
  const vendors = useMemo(() => {
    const map = new Map<string, { items: number; total: number }>();
    for (const r of reagents) {
      const v = map.get(r.vendor) ?? { items: 0, total: 0 };
      v.items += 1;
      v.total += r.unitPrice * r.qty;
      map.set(r.vendor, v);
    }
    return Array.from(map.entries())
      .map(([name, x]) => ({ name, items: x.items, total: x.total }))
      .sort((a, b) => b.total - a.total);
  }, [reagents]);

  const grand = vendors.reduce((s, v) => s + v.total, 0);

  if (vendors.length === 0) {
    return (
      <div className="bg-card border border-border flex items-center justify-center font-mono text-text-muted"
        style={{ height, fontSize: 10, letterSpacing: "0.2em" }}>
        SUPPLY CHAIN · AWAITING REAGENTS
      </div>
    );
  }

  return (
    <div className="bg-card border border-border" style={{ padding: 12 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
          REAGENT ORIGIN · {vendors.length} VENDORS · {fmtUSD(grand)} TOTAL
        </div>
        {vendorFilter && (
          <button
            type="button"
            onClick={() => onVendorFilter?.(null)}
            className="font-mono uppercase text-ax-amber hover:text-foreground transition-colors"
            style={{ fontSize: 9, letterSpacing: "0.18em" }}
          >
            ✕ CLEAR FILTER · {vendorFilter}
          </button>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        {/* Stacked bar */}
        <div>
          <div className="flex w-full" style={{ height: 36 }}>
            {vendors.map((v, i) => {
              const pct = (v.total / grand) * 100;
              const color = PALETTE[i % PALETTE.length];
              const showLabel = pct > 8;
              const isSelected = vendorFilter === v.name;
              return (
                <button
                  key={v.name}
                  type="button"
                  title={`${v.name} · ${fmtUSD(v.total)} · ${pct.toFixed(0)}%`}
                  onClick={() => onVendorFilter?.(isSelected ? null : v.name)}
                  className="relative overflow-hidden transition-all"
                  style={{
                    width: `${pct}%`,
                    background: color,
                    borderRight: "1px solid hsl(var(--background))",
                    outline: isSelected ? "2px solid hsl(var(--accent-amber))" : "none",
                    outlineOffset: -2,
                    cursor: "pointer",
                  }}
                >
                  {showLabel && (
                    <span
                      className="absolute inset-0 flex items-center justify-center font-mono font-bold"
                      style={{ fontSize: 9, color: "hsl(var(--background))", letterSpacing: "0.1em" }}
                    >
                      {v.name} {pct.toFixed(0)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Vendor label row */}
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(vendors.length, 6)}, minmax(0,1fr))` }}>
            {vendors.slice(0, 6).map((v, i) => (
              <div key={v.name} className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span style={{ width: 8, height: 8, background: PALETTE[i % PALETTE.length] }} />
                  <span className="font-mono uppercase text-foreground" style={{ fontSize: 10, letterSpacing: "0.12em" }}>
                    {v.name}
                  </span>
                </div>
                <span className="font-mono text-text-muted ml-3.5" style={{ fontSize: 9 }}>
                  {v.items} item{v.items === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini table */}
        <div className="border border-border bg-surface-deep" style={{ padding: "8px 10px", maxHeight: 120, overflowY: "auto" }}>
          <div className="grid gap-2 font-mono uppercase text-text-muted pb-1.5 mb-1.5 border-b border-border"
            style={{ gridTemplateColumns: "1.6fr 0.6fr 1fr 0.6fr", fontSize: 8, letterSpacing: "0.18em" }}>
            <span>VENDOR</span><span className="text-right">ITEMS</span><span className="text-right">TOTAL</span><span className="text-right">%</span>
          </div>
          {vendors.map((v, i) => {
            const pct = (v.total / grand) * 100;
            const isSelected = vendorFilter === v.name;
            return (
              <button
                key={v.name}
                type="button"
                onClick={() => onVendorFilter?.(isSelected ? null : v.name)}
                className="w-full grid gap-2 text-left transition-colors hover:bg-card"
                style={{
                  gridTemplateColumns: "1.6fr 0.6fr 1fr 0.6fr",
                  padding: "3px 0",
                  background: isSelected ? "hsl(var(--accent-amber) / 0.1)" : "transparent",
                }}
              >
                <span className="font-mono text-foreground flex items-center gap-1.5" style={{ fontSize: 10 }}>
                  <span style={{ width: 6, height: 6, background: PALETTE[i % PALETTE.length] }} />
                  {v.name}
                </span>
                <span className="font-mono text-text-muted text-right" style={{ fontSize: 10 }}>{v.items}</span>
                <span className="font-mono text-foreground text-right" style={{ fontSize: 10 }}>{fmtUSD(v.total)}</span>
                <span className="font-mono text-text-muted text-right" style={{ fontSize: 10 }}>{pct.toFixed(0)}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
