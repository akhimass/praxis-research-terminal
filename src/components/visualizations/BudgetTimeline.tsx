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

const PHASE_COLOR: Record<ReagentPhase, string> = {
  1: "#00d97e",
  2: "#f0a500",
  3: "#4d9fff",
};

function fmtUSD(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `$${k >= 10 ? Math.round(k) : k.toFixed(1)}K`;
  }
  // Round to nearest $100 for cleanliness if >= 100
  if (n >= 100) return `$${Math.round(n / 100) * 100}`;
  return `$${Math.round(n)}`;
}

export function BudgetTimeline({ reagents, estimatedWeeks = 12, width = 560, height = 240 }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; week: number; spend: number; label?: string } | null>(null);

  // Empty state
  if (!reagents || reagents.length === 0) {
    return (
      <div 
        className="bg-card border border-border flex items-center justify-center font-mono"
        style={{ height, padding: 12, fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
      >
        <div 
          style={{ 
            fontSize: 10, 
            color: "#5a7a9a", 
            letterSpacing: "0.2em",
            animation: "praxis-pulse 2s ease-in-out infinite"
          }}
        >
          BUDGET TIMELINE AGENT RUNNING...
        </div>
        <style>{`@keyframes praxis-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

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
      <div 
        className="bg-card border border-border flex items-center justify-center font-mono"
        style={{ height, fontSize: 10, letterSpacing: "0.2em", color: "#5a7a9a", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
      >
        BUDGET TIMELINE · AWAITING DATA
      </div>
    );
  }

  // Increased right padding to prevent cutoff
  const padL = 56, padR = 80, padT = 28, padB = 36;
  const W = width, H = height;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xFor = (w: number) => padL + (w / data.weeks) * innerW;
  const yFor = (s: number) => padT + innerH - (s / data.grand) * innerH;

  // Build path
  const linePath = data.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.week)} ${yFor(p.spend)}`).join(" ");
  
  // Confidence envelope - upper and lower bounds
  const upperPath = data.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.week)} ${yFor(Math.min(data.grand, p.spend * 1.2))}`).join(" ");
  const lowerPath = [...data.points].reverse().map((p, i) => `${i === 0 ? "L" : "L"} ${xFor(p.week)} ${yFor(Math.max(0, p.spend * 0.8))}`).join(" ");
  const envelopePath = upperPath + " " + lowerPath + " Z";

  // X ticks
  const xStep = Math.max(1, Math.round(data.weeks / 6));
  const xTicks: number[] = [];
  for (let w = 0; w <= data.weeks; w += xStep) xTicks.push(w);
  if (xTicks[xTicks.length - 1] !== data.weeks) xTicks.push(data.weeks);

  return (
    <div className="bg-card border border-border" style={{ padding: 16 }}>
      {/* Header with proper layout */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono uppercase" style={{ fontSize: 9, color: "#5a7a9a", letterSpacing: "0.2em", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
          CUMULATIVE SPEND
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 9, color: "#5a7a9a", letterSpacing: "0.18em", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
          {data.weeks} WEEKS
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 9, color: "#00d97e", letterSpacing: "0.18em", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
          {fmtUSD(data.grand)} TOTAL
        </div>
      </div>
      
      <svg 
        viewBox={`0 0 ${W} ${H}`} 
        width="100%" 
        height={H} 
        preserveAspectRatio="xMidYMid meet" 
        style={{ display: "block", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="spendGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#00d97e" />
            <stop offset="50%" stopColor="#f0a500" />
            <stop offset="100%" stopColor="#4d9fff" />
          </linearGradient>
        </defs>

        {/* Legend - inside chart bounds */}
        <g>
          <text x={W - padR - 4} y={padT + 12} textAnchor="end" fontSize="8" fill="#5a7a9a" letterSpacing="0.1em">
            ±20% ENVELOPE
          </text>
          <text x={W - padR - 4} y={padT + 24} textAnchor="end" fontSize="8" fill="#5a7a9a" letterSpacing="0.1em">
            ◆ MILESTONE
          </text>
        </g>

        {/* Y grid lines + labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = yFor(data.grand * f);
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1a2f50" strokeOpacity={0.3} strokeWidth={1} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#2a4060" letterSpacing="0.1em">
                {fmtUSD(data.grand * f)}
              </text>
            </g>
          );
        })}

        {/* Phase backgrounds + dividers */}
        {data.phaseStarts.map((ps, i) => {
          const next = data.phaseStarts[i + 1];
          const x1 = xFor(ps.week);
          const x2 = next ? xFor(next.week) : xFor(data.weeks);
          const phaseColor = PHASE_COLOR[ps.phase];
          return (
            <g key={i}>
              <rect x={x1} y={padT} width={x2 - x1} height={innerH}
                fill={phaseColor} fillOpacity={0.03} />
              {/* Phase label with background */}
              <rect x={x1 + 2} y={padT - 14} width={80} height={12} fill="#050a14" />
              <text x={x1 + 6} y={padT - 5} fontSize="9" fill={phaseColor} letterSpacing="0.18em">
                P{ps.phase}: {PHASE_NAME[ps.phase]}
              </text>
              {/* Phase divider - more visible */}
              {i > 0 && (
                <line x1={x1} y1={padT} x2={x1} y2={H - padB}
                  stroke="#1a2f50" strokeWidth={1.5} strokeDasharray="6 3" />
              )}
            </g>
          );
        })}

        {/* X ticks */}
        {xTicks.map((w) => (
          <g key={w}>
            <text x={xFor(w)} y={H - padB + 18} textAnchor="middle" fontSize="8" fill="#5a7a9a" letterSpacing="0.1em">
              W{w}
            </text>
          </g>
        ))}

        {/* Confidence envelope - more visible */}
        <path d={envelopePath} fill="#ffffff" fillOpacity={0.04} stroke="none" />
        {/* Upper bound line */}
        <path 
          d={data.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.week)} ${yFor(Math.min(data.grand, p.spend * 1.2))}`).join(" ")} 
          fill="none" 
          stroke="#ffffff" 
          strokeOpacity={0.15} 
          strokeWidth={1} 
        />
        {/* Lower bound line */}
        <path 
          d={data.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.week)} ${yFor(Math.max(0, p.spend * 0.8))}`).join(" ")} 
          fill="none" 
          stroke="#ffffff" 
          strokeOpacity={0.15} 
          strokeWidth={1} 
        />

        {/* Spend line */}
        <path d={linePath} fill="none" stroke="url(#spendGrad)" strokeWidth={2} />

        {/* Data points */}
        {data.points.map((p, i) => (
          <circle key={i} cx={xFor(p.week)} cy={yFor(p.spend)} r={3}
            fill="#e2eaf5" stroke="#050a14" strokeWidth={1} />
        ))}

        {/* Milestones - filled with phase color */}
        {data.milestones.map((m, i) => {
          const x = xFor(m.week), y = yFor(m.spend);
          const phaseColor = m.phase ? PHASE_COLOR[m.phase] : "#f0a500";
          return (
            <g key={i}
              onMouseEnter={() => setHover({ x, y, week: m.week, spend: m.spend, label: m.name })}
              style={{ cursor: "pointer" }}>
              <polygon 
                points={`${x},${y - 7} ${x + 6},${y} ${x},${y + 7} ${x - 6},${y}`}
                fill={phaseColor} 
                stroke={phaseColor} 
                strokeWidth={1.5} 
              />
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hover && (
          <g pointerEvents="none">
            <rect x={hover.x + 8} y={hover.y - 32} width={140} height={36}
              fill="#0a1628" stroke="#1a2f50" />
            <text x={hover.x + 14} y={hover.y - 18} fontSize="9" fill="#e2eaf5" letterSpacing="0.1em">
              {hover.label}
            </text>
            <text x={hover.x + 14} y={hover.y - 4} fontSize="9" fill="#5a7a9a" letterSpacing="0.1em">
              W{hover.week} · {fmtUSD(hover.spend)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default BudgetTimeline;
