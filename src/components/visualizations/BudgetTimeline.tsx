import { useMemo, useState } from "react";
import { Reagent, ReagentPhase } from "@/praxis/lib/types";

interface Props {
  reagents: Reagent[];
  estimatedWeeks?: number;
  width?: number;
  height?: number;
}

const PHASE_NAME: Record<ReagentPhase, string> = {
  1: "VALIDATION",
  2: "CONFIRMATION",
  3: "SCALE",
};

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(n)}`;
}

export function BudgetTimeline({ reagents, estimatedWeeks = 12, width = 560, height = 180 }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; week: number; spend: number; label?: string } | null>(null);

  const data = useMemo(() => {
    const totals: Record<ReagentPhase, number> = { 1: 0, 2: 0, 3: 0 };
    for (const r of reagents) totals[r.phase] += r.unitPrice * r.qty;
    const grand = totals[1] + totals[2] + totals[3];

    // Distribute weeks across phases by spend share (min 1 wk each phase that has spend)
    const weeks = Math.max(3, estimatedWeeks);
    const phases: ReagentPhase[] = [1, 2, 3];
    const active = phases.filter((p) => totals[p] > 0);
    const baseShare = active.map((p) => totals[p] / Math.max(1, grand));
    let assigned = active.map((_, i) => Math.max(1, Math.round(baseShare[i] * weeks)));
    // Adjust to match weeks total
    let diff = weeks - assigned.reduce((s, n) => s + n, 0);
    while (diff !== 0 && active.length > 0) {
      const idx = diff > 0 ? assigned.indexOf(Math.min(...assigned)) : assigned.indexOf(Math.max(...assigned));
      assigned[idx] += diff > 0 ? 1 : -1;
      diff += diff > 0 ? -1 : 1;
    }

    let cumWeek = 0, cumSpend = 0;
    const points: Array<{ week: number; spend: number; phase?: ReagentPhase; label?: string }> = [
      { week: 0, spend: 0 },
    ];
    const phaseStarts: Array<{ week: number; phase: ReagentPhase }> = [];
    active.forEach((p, i) => {
      phaseStarts.push({ week: cumWeek, phase: p });
      cumWeek += assigned[i];
      cumSpend += totals[p];
      points.push({ week: cumWeek, spend: cumSpend, phase: p, label: `${PHASE_NAME[p]} END` });
    });

    // Milestones: end of each phase
    const milestones = points.filter((p) => p.label).map((p, i) => ({ ...p, name: `M${i + 1}: ${p.label}` }));

    return { totals, grand, weeks, points, phaseStarts, milestones };
  }, [reagents, estimatedWeeks]);

  if (data.grand === 0) {
    return (
      <div className="bg-card border border-border flex items-center justify-center font-mono text-text-muted"
        style={{ height, fontSize: 10, letterSpacing: "0.2em" }}>
        BUDGET TIMELINE · AWAITING DATA
      </div>
    );
  }

  const padL = 50, padR = 18, padT = 18, padB = 28;
  const W = width, H = height;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xFor = (w: number) => padL + (w / data.weeks) * innerW;
  const yFor = (s: number) => padT + innerH - (s / data.grand) * innerH;

  // Build path
  const linePath = data.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.week)} ${yFor(p.spend)}`).join(" ");
  const upper = data.points.map((p) => `${xFor(p.week)},${yFor(Math.min(data.grand, p.spend * 1.2))}`);
  const lower = [...data.points].reverse().map((p) => `${xFor(p.week)},${yFor(Math.max(0, p.spend * 0.8))}`);
  const envelopePoints = [...upper, ...lower].join(" ");

  // X ticks
  const xStep = Math.max(1, Math.round(data.weeks / 6));
  const xTicks: number[] = [];
  for (let w = 0; w <= data.weeks; w += xStep) xTicks.push(w);
  if (xTicks[xTicks.length - 1] !== data.weeks) xTicks.push(data.weeks);

  return (
    <div className="bg-card border border-border" style={{ padding: 12 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
          CUMULATIVE SPEND · {data.weeks} WEEKS · {fmtUSD(data.grand)} TOTAL
        </div>
        <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: "0.18em" }}>
          ±20% ENVELOPE · ◆ MILESTONE
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="spendGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="hsl(var(--foreground))" />
            <stop offset="100%" stopColor="hsl(var(--accent-amber))" />
          </linearGradient>
        </defs>

        {/* Y grid lines + labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = yFor(data.grand * f);
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="hsl(var(--border))" strokeOpacity={0.3} strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end"
                fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="hsl(var(--text-muted))" letterSpacing="0.1em">
                {fmtUSD(data.grand * f)}
              </text>
            </g>
          );
        })}

        {/* Phase backgrounds */}
        {data.phaseStarts.map((ps, i) => {
          const next = data.phaseStarts[i + 1];
          const x1 = xFor(ps.week);
          const x2 = next ? xFor(next.week) : xFor(data.weeks);
          return (
            <g key={i}>
              <rect x={x1} y={padT} width={x2 - x1} height={innerH}
                fill="hsl(var(--foreground))" fillOpacity={0.025 + i * 0.015} />
              <text x={x1 + 4} y={padT + 10}
                fontFamily="'IBM Plex Mono', monospace" fontSize="8"
                fill="hsl(var(--text-muted))" letterSpacing="0.18em">
                P{ps.phase}: {PHASE_NAME[ps.phase]}
              </text>
              {i > 0 && (
                <line x1={x1} y1={padT} x2={x1} y2={H - padB}
                  stroke="hsl(var(--text-muted))" strokeOpacity={0.5} strokeDasharray="3 3" strokeWidth={1} />
              )}
            </g>
          );
        })}

        {/* X ticks */}
        {xTicks.map((w) => (
          <g key={w}>
            <text x={xFor(w)} y={H - padB + 14} textAnchor="middle"
              fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="hsl(var(--text-muted))" letterSpacing="0.1em">
              W{w}
            </text>
          </g>
        ))}

        {/* Confidence envelope */}
        <polygon points={envelopePoints}
          fill="hsl(var(--foreground))" fillOpacity={0.06} stroke="none" />

        {/* Spend line */}
        <path d={linePath} fill="none" stroke="url(#spendGrad)" strokeWidth={2} />

        {/* Data points */}
        {data.points.map((p, i) => (
          <circle key={i} cx={xFor(p.week)} cy={yFor(p.spend)} r={3}
            fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth={1} />
        ))}

        {/* Milestones */}
        {data.milestones.map((m, i) => {
          const x = xFor(m.week), y = yFor(m.spend);
          return (
            <g key={i}
              onMouseEnter={() => setHover({ x, y, week: m.week, spend: m.spend, label: m.name })}
              style={{ cursor: "pointer" }}>
              <polygon points={`${x},${y - 7} ${x + 6},${y} ${x},${y + 7} ${x - 6},${y}`}
                fill="hsl(var(--accent-amber))" stroke="hsl(var(--background))" strokeWidth={1} />
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hover && (
          <g pointerEvents="none">
            <rect x={hover.x + 8} y={hover.y - 28} width={140} height={32}
              fill="hsl(var(--surface-deep))" stroke="hsl(var(--border))" />
            <text x={hover.x + 14} y={hover.y - 16}
              fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="hsl(var(--foreground))" letterSpacing="0.1em">
              {hover.label}
            </text>
            <text x={hover.x + 14} y={hover.y - 4}
              fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="hsl(var(--text-muted))" letterSpacing="0.1em">
              W{hover.week} · {fmtUSD(hover.spend)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
