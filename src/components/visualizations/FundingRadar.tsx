import { useMemo } from "react";
import { FundingGrant } from "@/praxis/lib/types";

interface Props {
  grant: FundingGrant;
  size?: number;
}

const AXES = [
  "DISEASE MATCH",
  "STAGE FIT",
  "EVIDENCE LEVEL",
  "TECHNOLOGY FIT",
  "AMOUNT ALIGNMENT",
];

// Map a grant's fitBreakdown labels into the 5 canonical axes.
function pickScore(grant: FundingGrant, axis: string): number {
  const lc = axis.toLowerCase();
  // Try exact-ish match first
  const direct = grant.fitBreakdown.find((c) => c.label.toLowerCase().includes(lc.split(" ")[0]));
  if (direct) return direct.score;
  // Synonym fallback
  const synonyms: Record<string, string[]> = {
    "DISEASE MATCH": ["disease", "area", "indication"],
    "STAGE FIT": ["stage", "phase", "maturity"],
    "EVIDENCE LEVEL": ["evidence", "data"],
    "TECHNOLOGY FIT": ["technology", "platform", "modality"],
    "AMOUNT ALIGNMENT": ["amount", "size", "budget"],
  };
  for (const k of synonyms[axis] ?? []) {
    const m = grant.fitBreakdown.find((c) => c.label.toLowerCase().includes(k));
    if (m) return m.score;
  }
  return grant.fit; // safe fallback to overall fit
}

function tierColor(fit: number): string {
  if (fit >= 80) return "hsl(var(--foreground))";
  if (fit >= 60) return "hsl(var(--accent-amber))";
  return "hsl(var(--destructive))";
}
function valueColor(score: number): string {
  if (score >= 80) return "hsl(var(--foreground))";
  if (score >= 60) return "hsl(var(--accent-amber))";
  return "hsl(var(--destructive))";
}

export function FundingRadar({ grant, size = 200 }: Props) {
  const scores = useMemo(() => AXES.map((a) => pickScore(grant, a)), [grant]);
  // Ideal profile: 90 across the board for the stage
  const ideal = AXES.map(() => 90);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 28;
  const N = AXES.length;

  function point(value: number, i: number): [number, number] {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const r = (value / 100) * R;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  }

  // Concentric pentagon backgrounds at 33%, 66%, 100%
  const grids = [0.33, 0.66, 1].map((scale) =>
    Array.from({ length: N }, (_, i) => point(100 * scale, i)).map((p) => p.join(",")).join(" ")
  );

  const polygonPoints = scores.map((s, i) => point(s, i).join(",")).join(" ");
  const idealPoints = ideal.map((s, i) => point(s, i).join(",")).join(" ");

  const fillC = tierColor(grant.fit);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        {/* Concentric grid */}
        {grids.map((pts, i) => (
          <polygon key={i} points={pts}
            fill="none" stroke="hsl(var(--border))" strokeOpacity={0.5} strokeWidth={1} />
        ))}
        {/* Axis lines */}
        {Array.from({ length: N }, (_, i) => {
          const [x, y] = point(100, i);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
            stroke="hsl(var(--border))" strokeOpacity={0.5} strokeWidth={1} />;
        })}
        {/* Ideal overlay (dashed) */}
        <polygon points={idealPoints}
          fill="none" stroke="hsl(var(--text-muted))" strokeOpacity={0.5}
          strokeWidth={1} strokeDasharray="3 3" />
        {/* Grant polygon */}
        <polygon points={polygonPoints}
          fill={fillC} fillOpacity={0.18}
          stroke={fillC} strokeWidth={1.5} />
        {/* Score numbers + axis labels */}
        {AXES.map((label, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
          const lr = R + 14;
          const lx = cx + Math.cos(angle) * lr;
          const ly = cy + Math.sin(angle) * lr;
          const [px, py] = point(scores[i], i);
          // Text anchor by side
          const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
          return (
            <g key={label}>
              <text x={lx} y={ly + 3} textAnchor={anchor}
                fontFamily="'IBM Plex Mono', monospace" fontSize="8"
                fill="hsl(var(--text-muted))" letterSpacing="0.12em">
                {label}
              </text>
              <circle cx={px} cy={py} r={2.5} fill={valueColor(scores[i])} />
              <text x={px + (Math.cos(angle) >= 0 ? 5 : -5)} y={py - 4}
                textAnchor={Math.cos(angle) >= 0 ? "start" : "end"}
                fontFamily="'IBM Plex Mono', monospace" fontSize="8" fontWeight="700"
                fill={valueColor(scores[i])}>
                {scores[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="font-mono uppercase mt-1" style={{ fontSize: 8, letterSpacing: "0.18em", color: "hsl(var(--text-muted))" }}>
        OVERALL FIT <span style={{ color: fillC, fontWeight: 700 }}>{grant.fit}/100</span>
        <span className="ml-2" style={{ color: "hsl(var(--text-muted))" }}>· DASHED = IDEAL</span>
      </div>
    </div>
  );
}
