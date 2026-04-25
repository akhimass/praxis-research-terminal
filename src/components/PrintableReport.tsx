import type {
  ProtocolStep,
  Paper,
  BudgetData,
  Reagent,
  FundingData,
  FundingGrant,
  AuditFlag,
} from "@/praxis/lib/types";

export interface ResearchProgram {
  hypothesis: string;
  papers: Paper[];
  protocol: ProtocolStep[];
  budget: BudgetData;
  funding: FundingData;
  audit: AuditFlag[];
  keyFinding: string | null;
  estimatedWeeks?: number;
  noveltySignal?: "NOT FOUND" | "SIMILAR EXISTS" | "EXACT MATCH";
}

interface Props {
  program: ResearchProgram;
}

const fmtUSD = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

function PageFooter({ page, total }: { page: number; total: number }) {
  return (
    <div className="pp-footer-bar">
      <span>PRAXIS · praxis.ai · Confidential</span>
      <span>Page {page} of {total}</span>
    </div>
  );
}

export function PrintableReport({ program }: Props) {
  const TOTAL_PAGES = 6;
  const reagents = program.budget.reagents ?? [];
  const phases: (1 | 2 | 3)[] = [1, 2, 3];

  const phaseTotals = phases.map((p) => ({
    phase: p,
    total: reagents
      .filter((r) => r.phase === p)
      .reduce((sum, r) => sum + r.unitPrice * r.qty, 0),
  }));
  const grandTotal = phaseTotals.reduce((s, p) => s + p.total, 0);

  const novelty = program.noveltySignal ?? "NOT FOUND";
  const noveltyIcon =
    novelty === "EXACT MATCH" ? "●" : novelty === "SIMILAR EXISTS" ? "◐" : "●";

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const topGrants = [...(program.funding.grants ?? [])]
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 3);

  // ---------- PAGE 1 — COVER ----------
  const Page1 = (
    <section className="pp-page" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", paddingTop: "1in" }}>
      <div style={{ fontSize: "48pt", fontWeight: 800, letterSpacing: "0.18em", color: "#111" }}>
        PRAXIS
      </div>
      <div style={{ fontSize: "10pt", color: "#666", letterSpacing: "0.3em", marginTop: 8 }}>
        AI RESEARCH EXECUTION SYSTEM
      </div>
      <hr style={{ width: "60%", border: "none", borderTop: "0.5px solid #111", margin: "26pt 0" }} />
      <div style={{ maxWidth: 500, fontSize: "14pt", fontStyle: "italic", color: "#222", lineHeight: 1.5 }}>
        “{program.hypothesis || "No hypothesis provided."}”
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", width: "85%", marginTop: 50, gap: 16 }}>
        {[
          { n: program.protocol.length, label: "PROTOCOL STEPS" },
          { n: reagents.length, label: "REAGENTS" },
          { n: grandTotal ? fmtUSD(grandTotal) : "—", label: "BUDGET" },
          { n: program.estimatedWeeks ? `${program.estimatedWeeks} wk` : "—", label: "TIMELINE" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ fontSize: "20pt", fontWeight: 700, color: "#111" }}>{s.n}</div>
            <div style={{ fontSize: "8pt", color: "#666", letterSpacing: "0.2em", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ position: "absolute", bottom: "0.5in", left: 0, right: 0, fontSize: "8pt", color: "#888", textAlign: "center" }}>
        Generated {today} · Powered by PRAXIS
      </div>
    </section>
  );

  // ---------- PAGE 2 — LITERATURE QC ----------
  const Page2 = (
    <section className="pp-page">
      <div className="pp-section-header">Literature Quality Control</div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: "8pt", color: "#666", letterSpacing: "0.2em", marginBottom: 6 }}>
          NOVELTY SIGNAL
        </div>
        <div className={`pp-badge ${novelty === "EXACT MATCH" ? "solid" : ""}`}>
          [ {noveltyIcon} {novelty} ]
        </div>
      </div>

      <div style={{ fontSize: "9pt", color: "#666", letterSpacing: "0.18em", marginBottom: 6, textTransform: "uppercase" }}>
        References ({program.papers.length})
      </div>
      <table className="pp-table">
        <thead>
          <tr>
            <th style={{ width: "40%" }}>Title</th>
            <th style={{ width: "25%" }}>Authors</th>
            <th style={{ width: "20%" }}>Journal</th>
            <th style={{ width: "10%" }}>Year</th>
          </tr>
        </thead>
        <tbody>
          {program.papers.length === 0 ? (
            <tr><td colSpan={4} style={{ color: "#888" }}>No references collected.</td></tr>
          ) : program.papers.map((p, i) => (
            <tr key={i} className={i % 2 === 1 ? "alt" : ""}>
              <td>{p.title}</td>
              <td>{p.authors ?? "—"}</td>
              <td>{p.journal ?? "—"}</td>
              <td>{p.year ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {program.keyFinding && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: "9pt", color: "#666", letterSpacing: "0.18em", marginBottom: 6, textTransform: "uppercase" }}>
            Key Finding
          </div>
          <div style={{ fontStyle: "italic", paddingLeft: 22, borderLeft: "2px solid #111", color: "#222" }}>
            {program.keyFinding}
          </div>
        </div>
      )}

      <PageFooter page={2} total={TOTAL_PAGES} />
    </section>
  );

  // ---------- PAGE 3 — PROTOCOL ----------
  const Page3 = (
    <section className="pp-page">
      <div className="pp-section-header">Experiment Protocol</div>
      {program.protocol.length === 0 ? (
        <div style={{ color: "#888" }}>No protocol generated.</div>
      ) : program.protocol.map((s, i) => {
        const num = String(i + 1).padStart(2, "0");
        return (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 18, breakInside: "avoid" }}>
            <div style={{ fontSize: "22pt", fontWeight: 800, color: "#bbb", lineHeight: 1, minWidth: 42 }}>{num}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11pt", fontWeight: 700, color: "#111" }}>{s.title}</div>
              {s.description && (
                <div style={{ fontSize: "10pt", color: "#333", marginTop: 4, paddingLeft: 10 }}>{s.description}</div>
              )}
              <div style={{ marginTop: 6, paddingLeft: 10, fontSize: "9.5pt", color: "#222" }}>
                {s.volume && <div>▸ Volume: {s.volume}</div>}
                {s.time && <div>▸ Time: {s.time}</div>}
                {s.equipment && <div>▸ Equipment: <i>{s.equipment}</i></div>}
              </div>
              {(s.controls?.length ?? 0) > 0 && (
                <div style={{ marginTop: 6, padding: "6pt 8pt", background: "#f1f1f1", border: "0.5px solid #ddd", fontSize: "9pt" }}>
                  <b>Controls:</b> {s.controls!.join(", ")}
                </div>
              )}
              {(s.missingControls?.length ?? 0) > 0 && (
                <div style={{ marginTop: 4, fontSize: "9pt", color: "#a00" }}>
                  ⚠ Missing controls: {s.missingControls!.join(", ")}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <PageFooter page={3} total={TOTAL_PAGES} />
    </section>
  );

  // ---------- PAGE 4 — MATERIALS + BUDGET ----------
  const sortedReagents: { reagent: Reagent; idx: number }[] = [];
  let rowIdx = 1;
  phases.forEach((p) => {
    reagents.filter((r) => r.phase === p).forEach((r) => {
      sortedReagents.push({ reagent: r, idx: rowIdx++ });
    });
  });

  const Page4 = (
    <section className="pp-page">
      <div className="pp-section-header">Materials &amp; Budget</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 20 }}>
        <div>
          <table className="pp-table">
            <thead>
              <tr>
                <th>#</th><th>Reagent</th><th>Vendor</th><th>Catalog</th>
                <th style={{ textAlign: "right" }}>Unit</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((p) => {
                const rows = sortedReagents.filter((r) => r.reagent.phase === p);
                if (rows.length === 0) return null;
                const subtotal = phaseTotals.find((pt) => pt.phase === p)?.total ?? 0;
                return (
                  <>
                    {rows.map(({ reagent, idx }, i) => (
                      <tr key={`r-${idx}`} className={i % 2 === 1 ? "alt" : ""}>
                        <td>{idx}</td>
                        <td>{reagent.name}</td>
                        <td>{reagent.vendor}</td>
                        <td>{reagent.catalog}</td>
                        <td style={{ textAlign: "right" }}>{fmtUSD(reagent.unitPrice)}</td>
                        <td style={{ textAlign: "right" }}>{reagent.qty}</td>
                        <td style={{ textAlign: "right" }}>{fmtUSD(reagent.unitPrice * reagent.qty)}</td>
                      </tr>
                    ))}
                    <tr key={`s-${p}`} className="subtotal">
                      <td colSpan={7}>Phase {p} Subtotal: {fmtUSD(subtotal)}</td>
                    </tr>
                  </>
                );
              })}
              <tr className="grand">
                <td colSpan={6}>GRAND TOTAL</td>
                <td style={{ textAlign: "right" }}>{fmtUSD(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ border: "1.5px solid #111", padding: 12, alignSelf: "start" }}>
          <div style={{ fontSize: "8pt", letterSpacing: "0.2em", color: "#666" }}>TOTAL BUDGET</div>
          <div style={{ fontSize: "18pt", fontWeight: 800, marginTop: 4 }}>{fmtUSD(grandTotal)}</div>
          <hr style={{ border: "none", borderTop: "0.5px solid #ccc", margin: "10pt 0" }} />
          <div style={{ fontSize: "8pt", letterSpacing: "0.2em", color: "#666", marginBottom: 6 }}>BY PHASE</div>
          {phaseTotals.map((pt) => {
            const pct = grandTotal ? (pt.total / grandTotal) * 100 : 0;
            const blocks = Math.round(pct / 5);
            return (
              <div key={pt.phase} style={{ marginBottom: 6, fontSize: "8.5pt" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Phase {pt.phase}</span>
                  <span>{fmtUSD(pt.total)}</span>
                </div>
                <div style={{ fontFamily: "inherit", letterSpacing: 0, color: "#111" }}>
                  {"█".repeat(blocks)}{"░".repeat(20 - blocks)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PageFooter page={4} total={TOTAL_PAGES} />
    </section>
  );

  // ---------- PAGE 5 — TIMELINE ----------
  const totalWeeks = program.estimatedWeeks ?? program.budget.estimatedWeeks ?? 8;
  const tasks = [
    { weeks: [1, 2], label: "MIC Assay", phase: "PHASE 1", critical: true },
    { weeks: [2, 3], label: "DNA Extraction", phase: "PHASE 2", critical: false },
    { weeks: [3, 5], label: "Sanger Sequencing", phase: "PHASE 2", critical: true },
    { weeks: [4, 6], label: "Variant Analysis", phase: "PHASE 2", critical: false },
    { weeks: [6, 7], label: "WGS Confirmation", phase: "PHASE 3", critical: true },
    { weeks: [7, totalWeeks], label: "Reporting", phase: "PHASE 3", critical: false },
  ];
  const BAR_LEN = 24;
  const renderBar = (start: number, end: number) => {
    const pre = Math.max(0, Math.round(((start - 1) / totalWeeks) * BAR_LEN));
    const fill = Math.max(1, Math.round(((end - start + 1) / totalWeeks) * BAR_LEN));
    const post = Math.max(0, BAR_LEN - pre - fill);
    return "░".repeat(pre) + "█".repeat(fill) + "░".repeat(post);
  };

  const Page5 = (
    <section className="pp-page">
      <div className="pp-section-header">Research Timeline</div>
      <div style={{ fontFamily: "inherit", fontSize: "9pt" }}>
        {tasks.map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 160px 90px", gap: 8, padding: "4pt 0", borderBottom: "0.5px solid #eee" }}>
            <span style={{ color: "#444" }}>WK {t.weeks[0]}–{t.weeks[1]}</span>
            <span style={{ letterSpacing: 0 }}>{renderBar(t.weeks[0], t.weeks[1])}</span>
            <span>{t.label}</span>
            <span style={{ color: t.critical ? "#a00" : "#666", fontWeight: t.critical ? 700 : 400 }}>
              {t.critical ? "[CRITICAL]" : `[${t.phase}]`}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: "9pt", color: "#666", letterSpacing: "0.18em", marginBottom: 8, textTransform: "uppercase" }}>
          Milestones
        </div>
        <div style={{ fontSize: "10pt", lineHeight: 1.8 }}>
          <div>◆ Week 3: Go/No-Go Decision</div>
          <div>◆ Week 5: Sequencing Complete</div>
          <div>◆ Week {totalWeeks}: IND Enabling Studies Complete</div>
        </div>
      </div>

      <PageFooter page={5} total={TOTAL_PAGES} />
    </section>
  );

  // ---------- PAGE 6 — FUNDING ----------
  const Page6 = (
    <section className="pp-page">
      <div className="pp-section-header">Funding Opportunities</div>
      {topGrants.length === 0 ? (
        <div style={{ color: "#888" }}>No grants identified.</div>
      ) : topGrants.map((g, i) => (
        <GrantBlock key={g.id} grant={g} last={i === topGrants.length - 1} />
      ))}
      <PageFooter page={6} total={TOTAL_PAGES} />
    </section>
  );

  return (
    <div className="praxis-print-root">
      {Page1}
      {Page2}
      {Page3}
      {Page4}
      {Page5}
      {Page6}
    </div>
  );
}

function GrantBlock({ grant, last }: { grant: FundingGrant; last: boolean }) {
  const met = grant.requirements.filter((r) => r.met);
  const missing = grant.requirements.filter((r) => !r.met);
  const deadline =
    grant.deadline === "DATE" && grant.deadlineDate
      ? new Date(grant.deadlineDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "Rolling";
  return (
    <div style={{ marginBottom: last ? 0 : 18, paddingBottom: 14, borderBottom: last ? "none" : "0.5px solid #ddd", breakInside: "avoid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ fontSize: "12pt", fontWeight: 700 }}>{grant.name}</div>
        <div style={{ fontSize: "10pt", fontWeight: 700, whiteSpace: "nowrap" }}>FIT: {grant.fit}/100</div>
      </div>
      <div style={{ fontSize: "9pt", color: "#444", marginTop: 3 }}>
        {grant.organization} · {fmtUSD(grant.amountMin)}–{fmtUSD(grant.amountMax)} · Deadline: {deadline}
      </div>
      <div style={{ fontSize: "9pt", marginTop: 6, color: "#222" }}>
        {grant.rationale.replace(/\{\{(.*?)\}\}/g, "$1")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8, fontSize: "9pt" }}>
        <div>
          <div style={{ fontSize: "8pt", letterSpacing: "0.18em", color: "#666", marginBottom: 3 }}>REQUIREMENTS MET</div>
          {met.length === 0 ? <div style={{ color: "#888" }}>—</div> : met.map((r, i) => (
            <div key={i}>✓ {r.text}</div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: "8pt", letterSpacing: "0.18em", color: "#666", marginBottom: 3 }}>REQUIREMENTS MISSING</div>
          {missing.length === 0 ? <div style={{ color: "#888" }}>—</div> : missing.map((r, i) => (
            <div key={i} style={{ color: "#a00" }}>✗ {r.text}</div>
          ))}
        </div>
      </div>
      {grant.url && (
        <div style={{ fontSize: "8.5pt", color: "#444", marginTop: 6 }}>
          More info: {grant.url}
        </div>
      )}
    </div>
  );
}
