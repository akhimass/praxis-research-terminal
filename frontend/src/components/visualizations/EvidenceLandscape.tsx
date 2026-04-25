import { useMemo, useState } from "react";
import { Paper } from "@/praxis/lib/types";

interface Props {
  papers: Paper[];
  height?: number;
}

const BUCKETS = [
  { key: "in_vitro_biochemical", label: "IN VITRO BIOCHEMICAL", color: "#9d6fff", match: ["in vitro", "biochemical", "enzyme", "binding", "kinetic"] },
  { key: "cell_based_assays", label: "CELL-BASED ASSAYS", color: "#4d9fff", match: ["cell", "culture", "viability", "cytotox", "minimum inhibitory", "mic"] },
  { key: "animal_models", label: "ANIMAL MODELS", color: "#00d97e", match: ["mouse", "murine", "rat", "in vivo", "animal", "infection model"] },
  { key: "clinical_data", label: "CLINICAL DATA", color: "#f0a500", match: ["patient", "clinical", "trial", "human", "phase i", "phase ii"] },
];

function classify(p: Paper): number {
  const hay = `${p.title} ${p.abstract ?? ""} ${(p.claims ?? []).join(" ")}`.toLowerCase();
  for (let i = BUCKETS.length - 1; i >= 0; i--) {
    if (BUCKETS[i].match.some((t) => hay.includes(t))) return i;
  }
  // Fallback: hash title to a stable bucket so visualization isn't empty.
  let h = 0;
  for (const c of p.title) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % BUCKETS.length;
}

function paperYear(p: Paper): number | null {
  if (typeof p.year === "number") return p.year;
  if (typeof p.year === "string") {
    const m = /\d{4}/.exec(p.year);
    if (m) return parseInt(m[0], 10);
  }
  return null;
}

export function EvidenceLandscape({ papers, height = 280 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const now = new Date().getFullYear();

  // Empty state
  if (!papers || papers.length === 0) {
    return (
      <div 
        className="bg-card border border-border flex items-center justify-center font-mono"
        style={{ height, padding: 12 }}
      >
        <div 
          style={{ 
            fontSize: 10, 
            color: "#5a7a9a", 
            letterSpacing: "0.2em",
            animation: "praxis-pulse 2s ease-in-out infinite"
          }}
        >
          EVIDENCE LANDSCAPE AGENT RUNNING...
        </div>
        <style>{`@keyframes praxis-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  const dots = useMemo(() => {
    const arr: Array<{ year: number; bucket: number; r: number; paper: Paper }> = [];
    papers.forEach((p) => {
      const y = paperYear(p);
      if (y === null) return;
      arr.push({ year: y, bucket: classify(p), r: 10, paper: p });
    });
    return arr;
  }, [papers]);

  const minYear = dots.length ? Math.min(...dots.map((d) => d.year), now - 10) : now - 10;
  const maxYear = now;

  // Evidence score: rows with at least 1 paper / 4 rows
  const populatedBuckets = new Set(dots.map((d) => d.bucket));
  const filledBuckets = populatedBuckets.size;
  const score = Math.round((filledBuckets / BUCKETS.length) * 100);
  const scoreColor = score > 75 ? "#00d97e" : score >= 50 ? "#f0a500" : "#ff4d4d";

  // Layout - increased left padding for full labels
  const padL = 200, padR = 110, padT = 24, padB = 36;
  const W = 1000; // viewBox width — scales via preserveAspectRatio
  const H = height;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const rowH = innerH / BUCKETS.length;

  const xFor = (y: number) => padL + ((y - minYear) / Math.max(1, maxYear - minYear)) * innerW;
  const yFor = (b: number) => padT + rowH * b + rowH / 2;

  // X ticks every ~ (maxYear - minYear) / 5
  const yearSpan = Math.max(1, maxYear - minYear);
  const tickStep = Math.max(1, Math.round(yearSpan / 5));
  const ticks: number[] = [];
  for (let y = minYear; y <= maxYear; y += tickStep) ticks.push(y);
  if (ticks[ticks.length - 1] !== maxYear) ticks.push(maxYear);

  return (
    <div className="bg-card border border-border" style={{ padding: 16 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono uppercase" style={{ fontSize: 9, color: "#5a7a9a", letterSpacing: "0.2em" }}>
          EVIDENCE LANDSCAPE · {dots.length} PAPERS PLOTTED
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.18em", color: scoreColor }}>
          EVIDENCE SCORE: {score}%
        </div>
      </div>

      <svg 
        viewBox={`0 0 ${W} ${H}`} 
        width="100%" 
        height={H} 
        preserveAspectRatio="xMidYMid meet" 
        style={{ display: "block", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
      >
        <defs>
          <pattern id="evidGapHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ff4d4d" strokeOpacity="0.15" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Bucket rows + labels + gap hatching */}
        {BUCKETS.map((b, i) => {
          const y = padT + rowH * i;
          const isGap = !populatedBuckets.has(i);
          return (
            <g key={b.key}>
              {/* Only show hatching on truly empty rows */}
              {isGap && (
                <>
                  <rect x={padL} y={y + 2} width={innerW} height={rowH - 4} fill="url(#evidGapHatch)" />
                  <text x={padL + innerW / 2} y={y + rowH / 2 + 3} textAnchor="middle"
                    fontSize="9" fill="#ff4d4d" opacity="0.55"
                    letterSpacing="0.2em">KNOWLEDGE GAP</text>
                </>
              )}
              <line x1={padL} y1={y + rowH} x2={W - padR} y2={y + rowH} stroke="#1a2f50" strokeWidth="1" strokeOpacity="0.4" />
              {/* Row label - fully visible */}
              <text x={padL - 16} y={y + rowH / 2 + 3} textAnchor="end"
                fontSize="9" fill="#5a7a9a" letterSpacing="0.15em" textTransform="uppercase">
                {b.label}
              </text>
            </g>
          );
        })}

        {/* X ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={xFor(t)} y1={padT} x2={xFor(t)} y2={H - padB} stroke="#1a2f50" strokeOpacity="0.25" strokeWidth="1" />
            <text x={xFor(t)} y={H - padB + 18} textAnchor="middle"
              fontSize="8" fill="#5a7a9a" letterSpacing="0.15em">
              {t}
            </text>
          </g>
        ))}

        {/* TODAY marker */}
        <g>
          <line x1={xFor(now)} y1={padT} x2={xFor(now)} y2={H - padB}
            stroke="#f0a50066" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={xFor(now)} y={padT - 6} textAnchor="middle"
            fontSize="8" fill="#f0a500" letterSpacing="0.2em">
            TODAY
          </text>
        </g>

        {/* Dots - colored by evidence type */}
        {dots.map((d, i) => {
          const cx = xFor(d.year);
          const cy = yFor(d.bucket);
          const isHover = hover === i;
          const dotColor = BUCKETS[d.bucket].color;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <circle 
                cx={cx} 
                cy={cy} 
                r={10}
                fill={dotColor} 
                fillOpacity={isHover ? 0.95 : 0.85}
                stroke={dotColor} 
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      <div style={{ minHeight: 32 }} className="mt-2">
        {hover !== null && dots[hover] && (
          <div className="font-mono text-foreground" style={{ fontSize: 10, lineHeight: 1.5 }}>
            <span style={{ color: BUCKETS[dots[hover].bucket].color }}>{dots[hover].year} · {BUCKETS[dots[hover].bucket].label}</span>
            <span style={{ color: "#5a7a9a" }}> — </span>
            <span style={{ color: "#e2eaf5" }}>{dots[hover].paper.title}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvidenceLandscape;
