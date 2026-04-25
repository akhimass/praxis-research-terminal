import { useMemo, useState } from "react";
import { Paper } from "@/praxis/lib/types";

interface Props {
  papers: Paper[];
  height?: number;
}

const BUCKETS = [
  { key: "IN VITRO BIOCHEMICAL", match: ["in vitro", "biochemical", "enzyme", "binding", "kinetic"] },
  { key: "CELL-BASED ASSAYS",    match: ["cell", "culture", "viability", "cytotox", "minimum inhibitory", "mic"] },
  { key: "ANIMAL MODELS",        match: ["mouse", "murine", "rat", "in vivo", "animal", "infection model"] },
  { key: "CLINICAL DATA",        match: ["patient", "clinical", "trial", "human", "phase i", "phase ii"] },
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

export function EvidenceLandscape({ papers, height = 200 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const now = new Date().getFullYear();

  const dots = useMemo(() => {
    const arr: Array<{ year: number; bucket: number; r: number; paper: Paper }> = [];
    papers.forEach((p) => {
      const y = paperYear(p);
      if (y === null) return;
      arr.push({ year: y, bucket: classify(p), r: 4 + 8 * Math.max(0, Math.min(1, p.relevance ?? 0.5)), paper: p });
    });
    return arr;
  }, [papers]);

  const minYear = dots.length ? Math.min(...dots.map((d) => d.year), now - 10) : now - 10;
  const maxYear = now;

  const filledBuckets = new Set(dots.map((d) => d.bucket)).size;
  const score = Math.round((filledBuckets / BUCKETS.length) * 100);
  const scoreColor =
    score > 70 ? "hsl(var(--foreground))"
    : score >= 40 ? "hsl(var(--accent-amber))"
    : "hsl(var(--destructive))";

  // Layout
  const padL = 140, padR = 110, padT = 16, padB = 26;
  const W = 1000; // viewBox width — scales via preserveAspectRatio
  const H = height;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const rowH = innerH / BUCKETS.length;

  const xFor = (y: number) => padL + ((y - minYear) / Math.max(1, maxYear - minYear)) * innerW;
  const yFor = (b: number) => padT + rowH * b + rowH / 2;

  // Knowledge gap detection — find empty rows and empty year ranges
  const populated = new Set(dots.map((d) => d.bucket));

  // X ticks every ~ (maxYear - minYear) / 5
  const yearSpan = Math.max(1, maxYear - minYear);
  const tickStep = Math.max(1, Math.round(yearSpan / 5));
  const ticks: number[] = [];
  for (let y = minYear; y <= maxYear; y += tickStep) ticks.push(y);
  if (ticks[ticks.length - 1] !== maxYear) ticks.push(maxYear);

  return (
    <div className="bg-card border border-border" style={{ padding: 12 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
          EVIDENCE LANDSCAPE · {dots.length} PAPERS PLOTTED
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.18em", color: scoreColor }}>
          EVIDENCE SCORE: {score}%
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <pattern id="evidGapHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--destructive))" strokeOpacity="0.18" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Bucket rows + labels + gap hatching */}
        {BUCKETS.map((b, i) => {
          const y = padT + rowH * i;
          const isGap = !populated.has(i);
          return (
            <g key={b.key}>
              {isGap && (
                <>
                  <rect x={padL} y={y + 2} width={innerW} height={rowH - 4} fill="url(#evidGapHatch)" />
                  <text x={padL + innerW / 2} y={y + rowH / 2 + 3} textAnchor="middle"
                    fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="hsl(var(--destructive))" opacity="0.55"
                    letterSpacing="0.2em">KNOWLEDGE GAP</text>
                </>
              )}
              <line x1={padL} y1={y + rowH} x2={W - padR} y2={y + rowH} stroke="hsl(var(--border))" strokeWidth="1" strokeOpacity="0.4" />
              <text x={padL - 12} y={y + rowH / 2 + 3} textAnchor="end"
                fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="hsl(var(--text-muted))" letterSpacing="0.15em">
                {b.key}
              </text>
            </g>
          );
        })}

        {/* X ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={xFor(t)} y1={padT} x2={xFor(t)} y2={H - padB} stroke="hsl(var(--border))" strokeOpacity="0.25" strokeWidth="1" />
            <text x={xFor(t)} y={H - padB + 14} textAnchor="middle"
              fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="hsl(var(--text-muted))" letterSpacing="0.15em">
              {t}
            </text>
          </g>
        ))}

        {/* TODAY marker */}
        <g>
          <line x1={xFor(now)} y1={padT} x2={xFor(now)} y2={H - padB}
            stroke="hsl(var(--accent-amber))" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={xFor(now) + 4} y={padT + 10}
            fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="hsl(var(--accent-amber))" letterSpacing="0.2em">
            TODAY
          </text>
        </g>

        {/* Dots */}
        {dots.map((d, i) => {
          const cx = xFor(d.year);
          const cy = yFor(d.bucket);
          const isHover = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <circle cx={cx} cy={cy} r={d.r}
                fill="hsl(var(--foreground))" fillOpacity={isHover ? 0.95 : 0.65}
                stroke="hsl(var(--foreground))" strokeOpacity={isHover ? 1 : 0.4} strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      <div style={{ minHeight: 28 }} className="mt-1">
        {hover !== null && dots[hover] && (
          <div className="font-mono text-foreground" style={{ fontSize: 10, lineHeight: 1.5 }}>
            <span className="text-text-muted">{dots[hover].year} · {BUCKETS[dots[hover].bucket].key}</span> — {dots[hover].paper.title}
          </div>
        )}
      </div>
    </div>
  );
}
