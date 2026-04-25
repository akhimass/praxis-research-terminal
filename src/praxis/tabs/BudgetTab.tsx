import { useEffect, useMemo, useState } from "react";
import { BudgetData, Reagent, ReagentPhase } from "../lib/types";
import { AgentError } from "@/components/AgentError";
import { ReagentOriginMap } from "@/components/visualizations/ReagentOriginMap";
import { BudgetTimeline } from "@/components/visualizations/BudgetTimeline";

const PHASE_COLOR: Record<ReagentPhase, string> = {
  1: "#fafafa",
  2: "#a1a1a1",
  3: "#fafafa",
};
const PHASE_LABEL: Record<ReagentPhase, string> = {
  1: "PHASE 1: VALIDATION",
  2: "PHASE 2: CONFIRMATION",
  3: "PHASE 3: SCALE",
};

function fmtUSD(n: number, opts: Intl.NumberFormatOptions = {}) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, ...opts });
}
function fmtUSD2(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function totalColor(total: number): { text: string; border: string } {
  if (total < 500) return { text: "#fafafa", border: "#fafafa" };
  if (total < 2000) return { text: "#a1a1a1", border: "#a1a1a1" };
  return { text: "#ff4d4d", border: "#ff4d4d" };
}
function totalTier(total: number): "low" | "med" | "high" {
  return total < 500 ? "low" : total < 2000 ? "med" : "high";
}

type SortKey = "name" | "vendor" | "catalog" | "unitPrice" | "qty" | "total" | "phase";
type SortDir = "asc" | "desc";

interface Props { data: BudgetData; loading: boolean; onRetry?: () => void; }

export function BudgetTab({ data, loading, onRetry }: Props) {
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<ReagentPhase | null>(null);
  const [tierFilter, setTierFilter] = useState<"low" | "med" | "high" | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<string | null>(null);

  // Build effective reagents with override quantities + computed total.
  const enriched = useMemo(() => data.reagents.map((r) => {
    const id = `${r.vendor}::${r.catalog}::${r.name}`;
    const qty = qtyOverrides[id] ?? r.qty;
    return { ...r, _id: id, qty, total: r.unitPrice * qty };
  }), [data.reagents, qtyOverrides]);

  const vendors = useMemo(() => Array.from(new Set(enriched.map((r) => r.vendor))).sort(), [enriched]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((r) => {
      if (q && !`${r.name} ${r.vendor} ${r.catalog}`.toLowerCase().includes(q)) return false;
      if (vendorFilter && r.vendor !== vendorFilter) return false;
      if (phaseFilter && r.phase !== phaseFilter) return false;
      if (tierFilter && totalTier(r.total) !== tierFilter) return false;
      return true;
    });
  }, [enriched, search, vendorFilter, phaseFilter, tierFilter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av: any = (a as any)[sortKey];
      const bv: any = (b as any)[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Aggregates (over enriched, not filtered — these are the project totals)
  const grandTotal = useMemo(() => enriched.reduce((s, r) => s + r.total, 0), [enriched]);
  const phaseTotals = useMemo(() => {
    const m: Record<ReagentPhase, number> = { 1: 0, 2: 0, 3: 0 };
    enriched.forEach((r) => { m[r.phase] += r.total; });
    return m;
  }, [enriched]);

  const reagentCount = enriched.length;
  const vendorCount = vendors.length;
  const weeks = data.estimatedWeeks ?? 6;

  const totalColorTier =
    grandTotal < 10000 ? "#fafafa" : grandTotal < 25000 ? "#a1a1a1" : "#ff4d4d";

  // Filtered total for footer
  const visibleTotal = useMemo(() => sorted.reduce((s, r) => s + r.total, 0), [sorted]);

  // Reagents with empty/missing catalog count as "unmatched".
  const unmatched = useMemo(
    () => enriched.filter((r) => !r.catalog || r.catalog.trim() === "" || r.catalog === "—"),
    [enriched]
  );

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "name" || k === "vendor" || k === "catalog" ? "asc" : "desc"); }
  };

  const exportCsv = () => {
    const header = ["#", "reagent", "vendor", "catalog", "unit_price", "qty", "total", "phase"];
    const rows = sorted.map((r, i) => [i + 1, r.name, r.vendorFull ?? r.vendor, r.catalog, r.unitPrice.toFixed(2), r.qty, r.total.toFixed(2), `P${r.phase}`]);
    const csv = [header, ...rows].map((r) => r.map((c) => {
      const s = String(c);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "praxis_budget.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (reagentCount === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: 320 }}>
        <div className="font-mono animate-praxis-dots" style={{ fontSize: 11, color: "#a1a1a1", letterSpacing: "0.2em" }}>
          {loading ? "REAGENT AGENT RUNNING···" : "REAGENT AGENT PENDING···"}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full animate-praxis-fade overflow-y-auto praxis-scroll"
      style={{ background: "#000000", height: "100%", minHeight: 480 }}
    >
      {unmatched.length > 0 && (
        <div style={{ padding: "12px 20px 0" }}>
          <AgentError
            agent="REAGENTS"
            title="Some reagents not found in database"
            message={`${unmatched.length} reagent${unmatched.length === 1 ? "" : "s"} could not be matched to catalog numbers.`}
            suggestion="Unmatched reagents shown without catalog # — verify manually."
            canRetry={!!onRetry}
            onRetry={onRetry}
            compact
          />
        </div>
      )}
      <CommandCenter
        grandTotal={grandTotal}
        totalColor={totalColorTier}
        reagentCount={reagentCount}
        vendorCount={vendorCount}
        weeks={weeks}
        phaseTotals={phaseTotals}
        onExport={exportCsv}
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        vendors={vendors}
        vendorFilter={vendorFilter}
        onVendor={setVendorFilter}
        phaseFilter={phaseFilter}
        onPhase={setPhaseFilter}
        tierFilter={tierFilter}
        onTier={setTierFilter}
      />

      <ReagentTable
        rows={sorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        selected={selected}
        onSelect={setSelected}
        onQty={(id, q) => setQtyOverrides((prev) => ({ ...prev, [id]: q }))}
        visibleTotal={visibleTotal}
        totalCount={enriched.length}
      />

      {enriched.length > 0 && (
        <div style={{ padding: "12px 20px 20px" }} className="flex flex-col gap-3">
          <BudgetTimeline reagents={enriched} estimatedWeeks={weeks} />
          <ReagentOriginMap
            reagents={enriched}
            vendorFilter={vendorFilter}
            onVendorFilter={setVendorFilter}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- COMMAND CENTER ---------------- */

function CommandCenter({
  grandTotal, totalColor, reagentCount, vendorCount, weeks, phaseTotals, onExport,
}: {
  grandTotal: number; totalColor: string; reagentCount: number; vendorCount: number; weeks: number;
  phaseTotals: Record<ReagentPhase, number>; onExport: () => void;
}) {
  const total = phaseTotals[1] + phaseTotals[2] + phaseTotals[3] || 1;
  const seg = (p: ReagentPhase) => Math.max(0, (phaseTotals[p] / total) * 100);

  return (
    <div
      className="shrink-0"
      style={{ background: "#0a0a0a", borderBottom: "1px solid #262626", padding: "16px 20px" }}
    >
      <div className="flex items-stretch">
        <Tile
          label="TOTAL COST"
          value={fmtUSD(grandTotal)}
          valueColor={totalColor}
          accent
          width={220}
        />
        <Divider />
        <Tile label="REAGENT COUNT" value={String(reagentCount)} valueColor="#fafafa" />
        <Divider />
        <Tile label="VENDORS" value={String(vendorCount)} valueColor="#fafafa" />
        <Divider />
        <Tile label="ESTIMATED WEEKS" value={String(weeks)} valueColor="#fafafa" />

        <div className="ml-auto flex items-center pl-4">
          <ExportButton onClick={onExport} />
        </div>
      </div>

      {/* phase breakdown bar */}
      <div className="mt-4 flex" style={{ height: 6 }}>
        {([1, 2, 3] as ReagentPhase[]).map((p) => {
          const w = seg(p);
          if (w === 0) return null;
          return (
            <div
              key={p}
              title={`${PHASE_LABEL[p]} · ${fmtUSD(phaseTotals[p])}`}
              style={{ width: `${w}%`, background: PHASE_COLOR[p], transition: "width 200ms ease" }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.15em" }}>
        {([1, 2, 3] as ReagentPhase[]).map((p) => (
          <span key={p} style={{ color: PHASE_COLOR[p] }}>
            {PHASE_LABEL[p]} · {fmtUSD(phaseTotals[p])}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, valueColor, accent, width }: { label: string; value: string; valueColor: string; accent?: boolean; width?: number }) {
  return (
    <div
      className="flex flex-col justify-center"
      style={{
        padding: "0 20px",
        width: width,
        borderLeft: accent ? `3px solid ${valueColor}` : undefined,
        paddingLeft: accent ? 16 : 20,
      }}
    >
      <div className="font-mono font-extrabold" style={{ fontSize: 28, color: valueColor, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
        {value}
      </div>
      <div className="font-mono mt-1 uppercase" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.1em" }}>
        {label}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: "#262626", margin: "4px 0" }} />;
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono font-bold transition-all duration-150"
      style={{
        height: 28,
        padding: "0 14px",
        background: "transparent",
        border: "1px solid #262626",
        color: "#a1a1a1",
        fontSize: 10,
        letterSpacing: "0.15em",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#fafafa"; e.currentTarget.style.color = "#fafafa"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#262626"; e.currentTarget.style.color = "#a1a1a1"; }}
    >
      ↓ EXPORT CSV
    </button>
  );
}

/* ---------------- FILTER BAR ---------------- */

function FilterBar({
  search, onSearch, vendors, vendorFilter, onVendor, phaseFilter, onPhase, tierFilter, onTier,
}: {
  search: string; onSearch: (s: string) => void;
  vendors: string[]; vendorFilter: string | null; onVendor: (v: string | null) => void;
  phaseFilter: ReagentPhase | null; onPhase: (p: ReagentPhase | null) => void;
  tierFilter: "low" | "med" | "high" | null; onTier: (t: "low" | "med" | "high" | null) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4"
      style={{ height: 40, background: "#000000", borderBottom: "1px solid #262626" }}
    >
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="FILTER REAGENTS"
        spellCheck={false}
        className="font-mono outline-none bg-transparent transition-all duration-150"
        style={{
          width: 240,
          height: 28,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "#fafafa",
          border: "none",
          borderBottom: `1px solid ${focused ? "#fafafa" : "transparent"}`,
          padding: "0 4px",
        }}
      />
      <div className="ml-auto flex items-center gap-1.5 flex-wrap">
        {/* vendor pills */}
        {vendors.slice(0, 6).map((v) => (
          <Pill key={v} active={vendorFilter === v} color="#fafafa" onClick={() => onVendor(vendorFilter === v ? null : v)}>
            {v}
          </Pill>
        ))}
        <Sep />
        {([1, 2, 3] as ReagentPhase[]).map((p) => (
          <Pill key={p} active={phaseFilter === p} color={PHASE_COLOR[p]} onClick={() => onPhase(phaseFilter === p ? null : p)}>
            P{p}
          </Pill>
        ))}
        <Sep />
        {(["low", "med", "high"] as const).map((t) => {
          const c = t === "low" ? "#fafafa" : t === "med" ? "#a1a1a1" : "#ff4d4d";
          return (
            <Pill key={t} active={tierFilter === t} color={c} onClick={() => onTier(tierFilter === t ? null : t)}>
              {t === "low" ? "<$500" : t === "med" ? "$500–2K" : ">$2K"}
            </Pill>
          );
        })}
      </div>
    </div>
  );
}

function Sep() { return <div style={{ width: 1, height: 16, background: "#262626", margin: "0 2px" }} />; }

function Pill({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono uppercase transition-all duration-150"
      style={{
        height: 24,
        padding: "0 8px",
        fontSize: 9,
        letterSpacing: "0.1em",
        background: active ? `${color}14` : "transparent",
        border: `1px solid ${active ? color : "#262626"}`,
        color: active ? color : "#a1a1a1",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ---------------- TABLE ---------------- */

const COLS: { key: SortKey | "_idx"; label: string; width: number | string; align?: "right" | "center" }[] = [
  { key: "_idx",      label: "#",          width: 32, align: "right" },
  { key: "name",      label: "REAGENT",    width: "auto" },
  { key: "vendor",    label: "VENDOR",     width: 120 },
  { key: "catalog",   label: "CAT #",      width: 120 },
  { key: "unitPrice", label: "UNIT PRICE", width: 96, align: "right" },
  { key: "qty",       label: "QTY",        width: 64, align: "center" },
  { key: "total",     label: "TOTAL",      width: 100, align: "right" },
  { key: "phase",     label: "PHASE",      width: 80, align: "center" },
];

function ReagentTable({
  rows, sortKey, sortDir, onSort, selected, onSelect, onQty, visibleTotal, totalCount,
}: {
  rows: (Reagent & { _id: string; total: number })[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onQty: (id: string, q: number) => void;
  visibleTotal: number;
  totalCount: number;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-auto praxis-scroll" style={{ background: "#000000" }}>
      <table className="w-full" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          {COLS.map((c, i) => (
            <col key={i} style={{ width: typeof c.width === "number" ? `${c.width}px` : c.width }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ height: 32, background: "#050505" }}>
            {COLS.map((c) => {
              const sortable = c.key !== "_idx";
              const active = sortable && sortKey === (c.key as SortKey);
              return (
                <th
                  key={String(c.key)}
                  onClick={() => sortable && onSort(c.key as SortKey)}
                  className="font-mono font-bold uppercase select-none"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.15em",
                    color: active ? "#fafafa" : "#404040",
                    textAlign: c.align ?? "left",
                    padding: "0 12px",
                    borderBottom: "2px solid #262626",
                    borderRight: "1px solid #262626",
                    cursor: sortable ? "pointer" : "default",
                    position: "sticky", top: 0, zIndex: 2,
                    background: "#050505",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortable && (
                      <span style={{ color: active ? "#fafafa" : "#262626", fontSize: 8 }}>
                        {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Row
              key={r._id}
              idx={i + 1}
              row={r}
              selected={selected === r._id}
              onSelect={() => onSelect(selected === r._id ? null : r._id)}
              onQty={(q) => onQty(r._id, q)}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="font-mono" style={{ padding: 24, textAlign: "center", color: "#404040", fontSize: 10, letterSpacing: "0.15em" }}>
                NO REAGENTS MATCH FILTER
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ height: 40, background: "#050505", position: "sticky", bottom: 0, zIndex: 2 }}>
            <td colSpan={6} className="font-mono font-extrabold" style={{ borderTop: "2px solid #262626", padding: "0 12px", fontSize: 11, color: "#fafafa", letterSpacing: "0.15em" }}>
              TOTAL
            </td>
            <td className="font-mono font-extrabold" style={{ borderTop: "2px solid #262626", padding: "0 12px", fontSize: 14, color: "#fafafa", textAlign: "right" }}>
              {fmtUSD(visibleTotal)}
            </td>
            <td className="font-mono" style={{ borderTop: "2px solid #262626", padding: "0 12px", fontSize: 9, color: "#404040", textAlign: "center", letterSpacing: "0.15em" }}>
              {rows.length}/{totalCount}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Row({
  idx, row, selected, onSelect, onQty,
}: {
  idx: number;
  row: Reagent & { _id: string; total: number };
  selected: boolean;
  onSelect: () => void;
  onQty: (q: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [editingQty, setEditingQty] = useState(false);
  const [draftQty, setDraftQty] = useState(String(row.qty));
  const [copiedFlash, setCopiedFlash] = useState(false);

  useEffect(() => { setDraftQty(String(row.qty)); }, [row.qty]);

  const tier = totalColor(row.total);
  const phaseColor = PHASE_COLOR[row.phase];
  const isUnmatched = !row.catalog || row.catalog.trim() === "" || row.catalog === "—";

  const commitQty = () => {
    const n = Math.max(1, Math.floor(Number(draftQty) || row.qty));
    onQty(n);
    setEditingQty(false);
  };

  const copyCatalog = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(row.catalog); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = row.catalog; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopiedFlash(true);
    window.setTimeout(() => setCopiedFlash(false), 700);
  };

  const rowBg = isUnmatched
    ? (selected ? "hsl(var(--accent-amber) / 0.16)" : hover ? "hsl(var(--accent-amber) / 0.12)" : "hsl(var(--accent-amber) / 0.07)")
    : selected ? "#111111" : hover ? "#11111180" : "transparent";

  const cell: React.CSSProperties = {
    padding: "0 12px",
    borderBottom: "1px solid #111111",
    borderRight: "1px solid #111111",
    fontSize: 11,
    fontFamily: '"IBM Plex Mono", monospace',
    verticalAlign: "middle",
  };

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      style={{ height: 40, background: rowBg, transition: "background 100ms ease", cursor: "pointer", borderLeft: selected ? "2px solid #fafafa" : "2px solid transparent" }}
    >
      <td style={{ ...cell, color: "#404040", textAlign: "right" }}>{String(idx).padStart(2, "0")}</td>

      <td style={{ ...cell, color: "#fafafa", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.name}>
        {row.name}
      </td>

      <td style={{ ...cell, color: "#fafafa" }} title={row.vendorFull ?? row.vendor}>
        {row.vendor}
      </td>

      <td
        style={{ ...cell, color: copiedFlash ? "#fafafa" : "#a1a1a1", transition: "color 150ms ease" }}
        onClick={copyCatalog}
        title={copiedFlash ? "Copied" : "Click to copy"}
      >
        {row.catalog && row.catalog !== "—" ? row.catalog : (
          <span className="inline-flex items-center gap-2">
            <span
              className="font-mono font-bold"
              style={{ fontSize: 9, padding: "2px 6px", border: "1px solid hsl(var(--accent-amber) / 0.5)", color: "hsl(var(--accent-amber))", letterSpacing: "0.15em" }}
            >
              VERIFY
            </span>
            <a
              href={`https://www.sigmaaldrich.com/US/en/search/${encodeURIComponent(row.name)}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono"
              style={{ fontSize: 9, color: "#a1a1a1", textDecoration: "underline", letterSpacing: "0.1em" }}
            >
              SEARCH SIGMA ↗
            </a>
          </span>
        )}
      </td>

      <td style={{ ...cell, color: "#a1a1a1", textAlign: "right" }}>{fmtUSD2(row.unitPrice)}</td>

      <td style={{ ...cell, textAlign: "center", padding: 0 }} onClick={(e) => { e.stopPropagation(); setEditingQty(true); }}>
        {editingQty ? (
          <input
            autoFocus
            value={draftQty}
            onChange={(e) => setDraftQty(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={commitQty}
            onKeyDown={(e) => { if (e.key === "Enter") commitQty(); if (e.key === "Escape") { setDraftQty(String(row.qty)); setEditingQty(false); } }}
            className="font-mono outline-none text-center"
            style={{
              width: "70%", height: 24, background: "#111111", border: "1px solid #fafafa",
              color: "#fafafa", fontSize: 11, padding: 0,
            }}
          />
        ) : (
          <span style={{ color: "#fafafa" }}>{row.qty}</span>
        )}
      </td>

      <td
        style={{
          ...cell,
          color: tier.text, fontWeight: 700, textAlign: "right",
          borderLeft: `2px solid ${tier.border}`,
        }}
      >
        {fmtUSD(row.total)}
      </td>

      <td style={{ ...cell, textAlign: "center" }}>
        <span
          className="font-mono font-bold inline-block"
          style={{ fontSize: 9, padding: "3px 8px", color: phaseColor, background: `${phaseColor}20`, letterSpacing: "0.15em" }}
        >
          P{row.phase}
        </span>
      </td>
    </tr>
  );
}