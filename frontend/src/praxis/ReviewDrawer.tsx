import { useEffect, useMemo, useState } from "react";
import { BudgetData, ProtocolStep, TamarindData } from "./lib/types";

type Role = "PI" | "POSTDOC" | "GRAD STUDENT" | "LAB TECH";
type Verdict = "CORRECT" | "CLOSE" | "WRONG" | null;

interface SectionItem {
  id: string;
  group: string;        // "PROTOCOL" | "REAGENTS" | ...
  label: string;        // visible row label
  original: string;     // generated text shown in correction panel
}

interface SectionReview {
  verdict?: Verdict;
  correction?: string;
  reason?: string;
  saved?: boolean;
}

interface PriorReview {
  ts: number;
  role: Role | null;
  rating: number;
  corrections: { sectionId: string; group: string; label: string; correction: string; reason: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  protocol: ProtocolStep[];
  budget: BudgetData;
  tamarind: TamarindData | null;
}

const STORAGE_KEY = "praxis.reviews.v1";

function loadPriorReviews(): PriorReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function savePriorReviews(list: PriorReview[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-50))); } catch { /* noop */ }
}

export function ReviewDrawer({ open, onClose, protocol, budget, tamarind }: Props) {
  const [role, setRole] = useState<Role | null>("PI");
  const [rating, setRating] = useState(0);
  const [reviews, setReviews] = useState<Record<string, SectionReview>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prior, setPrior] = useState<PriorReview[]>([]);

  useEffect(() => { if (open) setPrior(loadPriorReviews()); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sections: SectionItem[] = useMemo(() => {
    const out: SectionItem[] = [];
    protocol.forEach((s, i) => out.push({
      id: `protocol-${i}`,
      group: "PROTOCOL",
      label: `Step ${String(i + 1).padStart(2, "0")} · ${s.title}`,
      original: [s.description, s.volume && `Vol: ${s.volume}`, s.time && `Time: ${s.time}`, s.equipment && `Equip: ${s.equipment}`]
        .filter(Boolean).join(" — "),
    }));
    budget.reagents.forEach((r, i) => out.push({
      id: `reagent-${i}`,
      group: "REAGENTS",
      label: `${r.name} (${r.vendor} ${r.catalog})`,
      original: `${r.qty} × $${r.unitPrice.toFixed(2)} = $${(r.qty * r.unitPrice).toFixed(2)} · Phase ${r.phase}`,
    }));
    if (budget.estimatedWeeks != null) {
      out.push({
        id: "timeline-weeks",
        group: "TIMELINE",
        label: "Estimated duration",
        original: `${budget.estimatedWeeks} weeks end-to-end`,
      });
    }
    const total = budget.reagents.reduce((s, r) => s + r.qty * r.unitPrice, 0);
    if (total > 0) {
      out.push({
        id: "budget-total",
        group: "BUDGET",
        label: "Total reagent cost",
        original: `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} across ${budget.reagents.length} line items`,
      });
    }
    if (tamarind?.proteinName) {
      out.push({
        id: "structure",
        group: "STRUCTURE",
        label: tamarind.proteinName,
        original: `pLDDT ${(((tamarind.confidence ?? 0) * 100).toFixed(1))} · ${tamarind.residues ?? "?"} residues · ${tamarind.source ?? ""}`,
      });
    }
    return out;
  }, [protocol, budget, tamarind]);

  const setVerdict = (id: string, verdict: Verdict, original: string) => {
    setReviews((prev) => {
      const cur = prev[id] ?? {};
      // Toggle off if clicking same verdict
      if (cur.verdict === verdict) {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [id]: {
          verdict,
          correction: cur.correction ?? (verdict === "WRONG" ? original : cur.correction),
          reason: cur.reason ?? "",
          saved: false,
        },
      };
    });
  };

  const updateField = (id: string, field: "correction" | "reason", value: string) => {
    setReviews((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { verdict: "WRONG" as Verdict }), [field]: value, saved: false } }));
  };

  const saveCorrection = (id: string) => {
    setReviews((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), saved: true } }));
  };

  const summary = useMemo(() => {
    const vals = Object.values(reviews);
    return {
      correct: vals.filter((r) => r.verdict === "CORRECT").length,
      close: vals.filter((r) => r.verdict === "CLOSE").length,
      wrong: vals.filter((r) => r.verdict === "WRONG").length,
    };
  }, [reviews]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const payload: PriorReview = {
      ts: Date.now(),
      role,
      rating,
      corrections: sections
        .filter((s) => reviews[s.id]?.verdict === "WRONG" && (reviews[s.id]?.correction ?? "").trim())
        .map((s) => ({
          sectionId: s.id,
          group: s.group,
          label: s.label,
          correction: (reviews[s.id]?.correction ?? "").trim(),
          reason: (reviews[s.id]?.reason ?? "").trim(),
        })),
    };
    try {
      await fetch("/review/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => undefined);
    } finally {
      const next = [...loadPriorReviews(), payload];
      savePriorReviews(next);
      setPrior(next);
      setSubmitted(true);
      setSubmitting(false);
      window.setTimeout(() => setSubmitted(false), 4000);
    }
  };

  // Group sections for display
  const grouped = useMemo(() => {
    const map = new Map<string, SectionItem[]>();
    sections.forEach((s) => { if (!map.has(s.group)) map.set(s.group, []); map.get(s.group)!.push(s); });
    return Array.from(map.entries());
  }, [sections]);

  // Recent corrections that "influenced" this plan (most recent 2)
  const recentCorrections = useMemo(() => {
    const all = prior.flatMap((p) => p.corrections.map((c) => ({ ...c, ts: p.ts })));
    return all.sort((a, b) => b.ts - a.ts).slice(0, 2);
  }, [prior]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-150"
        style={{
          background: "#000000a8",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        aria-hidden
      />
      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 z-50 h-full flex flex-col"
        style={{
          width: 480,
          background: "#0a0a0a",
          borderLeft: "1px solid #262626",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 200ms ease",
          boxShadow: open ? "-12px 0 40px #00000080" : "none",
        }}
        role="dialog"
        aria-label="Scientist review"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
          <div>
            <div className="font-mono font-extrabold" style={{ fontSize: 11, color: "#fafafa", letterSpacing: "0.2em" }}>
              SCIENTIST REVIEW
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 9, color: "#a1a1a1", letterSpacing: "0.1em" }}>
              Your corrections improve future plans
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-mono"
            style={{ width: 28, height: 28, background: "transparent", border: "1px solid #262626", color: "#a1a1a1", cursor: "pointer", fontSize: 14 }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto praxis-scroll" style={{ padding: "16px 20px" }}>
          <RatingHexes rating={rating} onChange={setRating} />
          <RoleSelector value={role} onChange={setRole} />

          <div className="mt-5">
            <Label>SECTION-BY-SECTION REVIEW</Label>
            <div className="mt-2 flex items-center gap-3 font-mono" style={{ fontSize: 9, color: "#a1a1a1", letterSpacing: "0.1em" }}>
              <span><span style={{ color: "#fafafa" }}>{summary.correct}</span> CORRECT</span>
              <span><span style={{ color: "#a1a1a1" }}>{summary.close}</span> CLOSE</span>
              <span><span style={{ color: "#ff4d4d" }}>{summary.wrong}</span> WRONG</span>
              <span className="ml-auto" style={{ color: "#404040" }}>{sections.length} ITEMS</span>
            </div>

            {sections.length === 0 ? (
              <div className="font-mono mt-4" style={{ fontSize: 10, color: "#404040" }}>
                Run a hypothesis to populate reviewable sections.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {grouped.map(([group, items]) => (
                  <div key={group}>
                    <div className="font-mono uppercase mb-2" style={{ fontSize: 8, color: "#404040", letterSpacing: "0.25em" }}>
                      {group}
                    </div>
                    <div className="flex flex-col" style={{ borderTop: "1px solid #262626" }}>
                      {items.map((s) => (
                        <SectionRow
                          key={s.id}
                          section={s}
                          review={reviews[s.id]}
                          onVerdict={(v) => setVerdict(s.id, v, s.original)}
                          onField={(f, v) => updateField(s.id, f, v)}
                          onSave={() => saveCorrection(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: submit + feedback loop */}
        <div className="shrink-0" style={{ borderTop: "1px solid #262626", padding: "14px 20px", background: "#050505" }}>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || sections.length === 0}
            className="w-full font-mono font-extrabold transition-all duration-150"
            style={{
              height: 40,
              background: submitted ? "#fafafa22" : "#fafafa",
              color: submitted ? "#fafafa" : "#000",
              border: submitted ? "1px solid #fafafa" : "none",
              fontSize: 11,
              letterSpacing: "0.2em",
              cursor: submitting || sections.length === 0 ? "not-allowed" : "pointer",
              opacity: sections.length === 0 ? 0.5 : 1,
            }}
          >
            {submitted
              ? "✓ REVIEW SAVED — NEXT PLAN WILL IMPROVE"
              : submitting
                ? <span className="animate-praxis-dots">SUBMITTING···</span>
                : "SUBMIT REVIEW"}
          </button>

          <FeedbackLoop count={prior.length} corrections={recentCorrections} />
        </div>
      </aside>
    </>
  );
}

/* ---------- Subcomponents ---------- */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono uppercase" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.25em" }}>
      {children}
    </div>
  );
}

function RatingHexes({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || rating;
  return (
    <div>
      <Label>OVERALL QUALITY</Label>
      <div className="flex items-center gap-2 mt-2" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(rating === n ? 0 : n)}
            aria-label={`Rate ${n} of 5`}
            className="transition-transform"
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              transform: active >= n ? "scale(1.05)" : "scale(1)",
            }}
          >
            <Hex filled={active >= n} />
          </button>
        ))}
        <span className="font-mono ml-2" style={{ fontSize: 10, color: "#a1a1a1", letterSpacing: "0.15em" }}>
          {rating ? `${rating}/5` : "—"}
        </span>
      </div>
    </div>
  );
}

function Hex({ filled }: { filled: boolean }) {
  const fill = filled ? "#fafafa" : "transparent";
  const stroke = filled ? "#fafafa" : "#262626";
  return (
    <svg width={24} height={26} viewBox="0 0 24 26" style={{ display: "block", filter: filled ? "drop-shadow(0 0 4px #fafafa88)" : "none" }}>
      <polygon points="12,1 22,7 22,19 12,25 2,19 2,7" fill={fill} stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

function RoleSelector({ value, onChange }: { value: Role | null; onChange: (r: Role) => void }) {
  const roles: Role[] = ["PI", "POSTDOC", "GRAD STUDENT", "LAB TECH"];
  return (
    <div className="mt-5">
      <Label>YOUR ROLE</Label>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {roles.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className="font-mono font-bold transition-colors"
              style={{
                height: 24,
                padding: "0 10px",
                background: active ? "#fafafa" : "transparent",
                border: `1px solid ${active ? "#fafafa" : "#262626"}`,
                color: active ? "#000" : "#a1a1a1",
                fontSize: 9,
                letterSpacing: "0.15em",
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionRow({
  section, review, onVerdict, onField, onSave,
}: {
  section: SectionItem;
  review: SectionReview | undefined;
  onVerdict: (v: Verdict) => void;
  onField: (field: "correction" | "reason", value: string) => void;
  onSave: () => void;
}) {
  const verdict = review?.verdict ?? null;
  const expanded = verdict === "WRONG";
  return (
    <div style={{ borderBottom: "1px solid #262626", padding: "10px 0" }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 font-mono" style={{ fontSize: 11, color: "#fafafa", lineHeight: 1.5 }}>
          {section.label}
        </div>
        <div className="flex shrink-0 gap-1">
          <VerdictBtn label="✓" full="CORRECT" color="#fafafa" active={verdict === "CORRECT"} onClick={() => onVerdict("CORRECT")} />
          <VerdictBtn label="≈" full="CLOSE"   color="#a1a1a1" active={verdict === "CLOSE"}   onClick={() => onVerdict("CLOSE")} />
          <VerdictBtn label="✗" full="WRONG"   color="#ff4d4d" active={verdict === "WRONG"}   onClick={() => onVerdict("WRONG")} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 animate-praxis-fade" style={{ background: "#000000", border: "1px solid #26262680", padding: 12 }}>
          <FieldLabel>ORIGINAL</FieldLabel>
          <div className="font-mono mt-1" style={{ fontSize: 10, color: "#a1a1a1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {section.original || "—"}
          </div>

          <FieldLabel className="mt-3">CORRECTION</FieldLabel>
          <textarea
            value={review?.correction ?? ""}
            onChange={(e) => onField("correction", e.target.value)}
            rows={3}
            className="w-full font-mono mt-1"
            style={{
              fontSize: 10, color: "#fafafa", background: "#050505",
              border: "1px solid #262626", padding: 8, lineHeight: 1.6, resize: "vertical",
              outline: "none", borderRadius: 0,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#fafafa")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#262626")}
          />

          <FieldLabel className="mt-3">REASON</FieldLabel>
          <input
            value={review?.reason ?? ""}
            onChange={(e) => onField("reason", e.target.value)}
            placeholder="e.g. CLSI guideline M07-A11 specifies different range"
            className="w-full font-mono mt-1"
            style={{
              fontSize: 10, color: "#fafafa", background: "#050505",
              border: "1px solid #262626", padding: "6px 8px",
              outline: "none", borderRadius: 0, height: 28,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#fafafa")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#262626")}
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onSave}
              className="font-mono font-bold transition-colors"
              style={{
                height: 26, padding: "0 12px",
                background: review?.saved ? "#fafafa22" : "transparent",
                border: "1px solid #fafafa44",
                color: "#fafafa",
                fontSize: 9, letterSpacing: "0.15em",
                cursor: "pointer",
              }}
            >
              {review?.saved ? "SAVED ✓" : "SAVE CORRECTION"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono uppercase ${className ?? ""}`} style={{ fontSize: 8, color: "#404040", letterSpacing: "0.25em" }}>
      {children}
    </div>
  );
}

function VerdictBtn({ label, full, color, active, onClick }: { label: string; full: string; color: string; active: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={full}
      aria-label={full}
      className="font-mono font-bold transition-colors"
      style={{
        width: 28, height: 24,
        background: active ? `${color}22` : "transparent",
        border: `1px solid ${active ? color : "#262626"}`,
        color: active || hover ? color : "#a1a1a1",
        fontSize: 12,
        letterSpacing: "0.05em",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function FeedbackLoop({ count, corrections }: { count: number; corrections: PriorReview["corrections"] }) {
  return (
    <div
      className="mt-3"
      style={{ background: "#fafafa0d", border: "1px solid #fafafa33", padding: 10 }}
    >
      <div className="font-mono uppercase" style={{ fontSize: 8, color: "#fafafa", letterSpacing: "0.25em" }}>
        ◆ FEEDBACK APPLIED FROM {count} PRIOR {count === 1 ? "REVIEW" : "REVIEWS"}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {corrections.length === 0 ? (
          <div className="font-mono" style={{ fontSize: 9, color: "#404040", letterSpacing: "0.05em" }}>
            No prior corrections yet — your first review will start the loop.
          </div>
        ) : (
          corrections.map((c, i) => (
            <div key={i} className="font-mono" style={{ fontSize: 9, color: "#fafafa", letterSpacing: "0.05em", lineHeight: 1.5 }}>
              ↳ {c.group.toLowerCase()} corrected: {truncate(c.correction, 60)} <span style={{ color: "#a1a1a1" }}>(from {c.label})</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
