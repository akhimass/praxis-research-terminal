import { useMemo } from "react";
import { ProtocolStep } from "@/praxis/lib/types";

interface Props {
  steps: ProtocolStep[];
  activeIndex?: number | null;
  onSelectStep?: (i: number) => void;
  height?: number;
}

function parseMinutes(s?: string): number {
  if (!s) return 30;
  const lower = s.toLowerCase();
  const m = /(\d+(?:\.\d+)?)\s*(min|m|h|hr|hour|d|day)/.exec(lower);
  if (!m) return 30;
  const n = parseFloat(m[1]);
  const u = m[2];
  if (u.startsWith("h")) return n * 60;
  if (u.startsWith("d")) return n * 60 * 24;
  return n;
}

function complexity(s: ProtocolStep): number {
  let c = 1;
  if (s.controls?.length) c += s.controls.length * 0.3;
  if (s.equipment) c += 0.3;
  if (s.volume) c += 0.2;
  if (s.description) c += Math.min(2, s.description.length / 120);
  return c;
}

export function ProtocolFlow({ steps, activeIndex, onSelectStep, height = 120 }: Props) {
  const data = useMemo(() => {
    if (!steps.length) return null;
    const widths = steps.map((s) => 60 + complexity(s) * 18);
    const durations = steps.map((s) => parseMinutes(s.time));
    const bottleneck = durations.indexOf(Math.max(...durations));
    return { widths, durations, bottleneck };
  }, [steps]);

  if (!data || !steps.length) {
    return (
      <div className="bg-card border border-border flex items-center justify-center font-mono text-text-muted"
        style={{ height, fontSize: 10, letterSpacing: "0.2em" }}>
        PROTOCOL FLOW · AWAITING STEPS
      </div>
    );
  }

  const padX = 16, padY = 22, gap = 28, nodeH = 44;
  const totalW = padX * 2 + data.widths.reduce((a, b) => a + b, 0) + gap * (steps.length - 1);
  const H = height;

  // X positions
  let cursor = padX;
  const nodes = steps.map((s, i) => {
    const x = cursor;
    const w = data.widths[i];
    cursor += w + gap;
    return { x, w, step: s, i };
  });

  return (
    <div className="bg-card border border-border" style={{ padding: 8 }}>
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="font-mono uppercase text-text-muted" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
          PROTOCOL FLOW · {steps.length} STEPS
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.2em", color: "hsl(var(--accent-amber))" }}>
          ⚠ BOTTLENECK: STEP {String(data.bottleneck + 1).padStart(2, "0")}
        </div>
      </div>
      <div style={{ overflowX: "auto" }} className="praxis-scroll">
        <svg width={totalW} height={H} style={{ display: "block", minWidth: "100%" }}>
          {/* Arrows between nodes */}
          {nodes.slice(0, -1).map((n, i) => {
            const next = nodes[i + 1];
            const x1 = n.x + n.w;
            const x2 = next.x;
            const y = padY + nodeH / 2;
            const isBottleneckEdge = i === data.bottleneck - 1 || i === data.bottleneck;
            const stroke = isBottleneckEdge ? "hsl(var(--destructive))" : "hsl(var(--border))";
            return (
              <g key={i}>
                <line x1={x1} y1={y} x2={x2 - 6} y2={y} stroke={stroke} strokeWidth="1.5" />
                <polygon points={`${x2 - 6},${y - 4} ${x2},${y} ${x2 - 6},${y + 4}`} fill={stroke} />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(({ x, w, step, i }) => {
            const isBottleneck = i === data.bottleneck;
            const isActive = activeIndex === i;
            const stroke = isActive
              ? "hsl(var(--foreground))"
              : isBottleneck ? "hsl(var(--accent-amber))"
              : "hsl(var(--border))";
            const sw = isActive || isBottleneck ? 1.5 : 1;
            const label = step.title.length > 12 ? step.title.slice(0, 11) + "…" : step.title;
            const num = String(i + 1).padStart(2, "0");
            return (
              <g key={i} onClick={() => onSelectStep?.(i)} style={{ cursor: "pointer" }}>
                {isBottleneck && (
                  <rect x={x - 2} y={padY - 2} width={w + 4} height={nodeH + 4}
                    fill="none" stroke="hsl(var(--accent-amber))" strokeOpacity="0.3" strokeWidth="3" />
                )}
                <rect x={x} y={padY} width={w} height={nodeH}
                  fill="hsl(var(--surface-deep))" stroke={stroke} strokeWidth={sw} />
                <text x={x + 8} y={padY + 16}
                  fontFamily="'IBM Plex Mono', monospace" fontSize="9" fontWeight="700"
                  fill="hsl(var(--text-muted))" letterSpacing="0.15em">{num}</text>
                <text x={x + 8} y={padY + 32}
                  fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="600"
                  fill="hsl(var(--foreground))">{label}</text>
                <text x={x + w - 8} y={padY + nodeH - 6} textAnchor="end"
                  fontFamily="'IBM Plex Mono', monospace" fontSize="8"
                  fill="hsl(var(--text-muted))" letterSpacing="0.1em">
                  {step.time ?? "—"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
