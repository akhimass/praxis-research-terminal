import { useMemo, useState } from "react";
import { ProtocolStep } from "@/praxis/lib/types";

interface Props {
  steps: ProtocolStep[];
  activeIndex?: number | null;
  onSelectStep?: (i: number) => void;
  height?: number;
}

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  prep: { bg: "#4d9fff15", border: "#4d9fff" },
  assay: { bg: "#00d97e15", border: "#00d97e" },
  analysis: { bg: "#9d6fff15", border: "#9d6fff" },
  decision: { bg: "#f0a50015", border: "#f0a500" },
};

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

function truncateText(text: string, maxChars: number = 14): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

function getCategoryFromStep(step: ProtocolStep): string {
  // Try to infer category from step properties or title
  const title = step.title.toLowerCase();
  if (title.includes("prep") || title.includes("culture") || title.includes("grow")) return "prep";
  if (title.includes("analysis") || title.includes("data") || title.includes("compute")) return "analysis";
  if (title.includes("decision") || title.includes("review") || title.includes("evaluate")) return "decision";
  return "assay"; // default
}

export function ProtocolFlow({ steps, activeIndex, onSelectStep, height = 160 }: Props) {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  // Empty state
  if (!steps || steps.length === 0) {
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
          PROTOCOL FLOW AGENT RUNNING...
        </div>
        <style>{`@keyframes praxis-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  const data = useMemo(() => {
    const durations = steps.map((s) => parseMinutes(s.time));
    const bottleneck = durations.indexOf(Math.max(...durations));
    const categories = steps.map((s) => getCategoryFromStep(s));
    return { durations, bottleneck, categories };
  }, [steps]);

  const nodeW = 130, nodeH = 48, gap = 40;
  const padX = 20, padY = 32;
  const totalW = padX * 2 + nodeW * steps.length + gap * (steps.length - 1);
  const H = height;

  // X positions
  let cursor = padX;
  const nodes = steps.map((s, i) => {
    const x = cursor;
    cursor += nodeW + gap;
    return { x, step: s, i, category: data.categories[i] };
  });

  const needsScroll = steps.length > 6;

  return (
    <div className="bg-card border border-border" style={{ padding: 12 }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="font-mono uppercase" style={{ fontSize: 9, color: "#5a7a9a", letterSpacing: "0.2em", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
          PROTOCOL FLOW · {steps.length} STEPS
        </div>
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.2em", color: "#f0a500", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>
          BOTTLENECK: STEP {String(data.bottleneck + 1).padStart(2, "0")}
        </div>
      </div>
      <div style={{ overflowX: needsScroll ? "auto" : "visible", position: "relative" }} className="praxis-scroll">
        <svg 
          width={totalW} 
          height={H} 
          style={{ display: "block", minWidth: "100%", fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}
        >
          {/* Arrows between nodes */}
          {nodes.slice(0, -1).map((n, i) => {
            const next = nodes[i + 1];
            const x1 = n.x + nodeW;
            const x2 = next.x;
            const y = padY + nodeH / 2;
            // Critical path = both nodes are bottleneck-adjacent
            const isCriticalPath = (i === data.bottleneck || i + 1 === data.bottleneck) && 
                                   steps[i]?.is_critical_path && steps[i + 1]?.is_critical_path;
            const stroke = isCriticalPath ? "#ff4d4d" : "#2a4060";
            return (
              <g key={i}>
                <line x1={x1} y1={y} x2={x2 - 5} y2={y} stroke={stroke} strokeWidth="1.5" />
                <polygon points={`${x2 - 5},${y - 4} ${x2},${y} ${x2 - 5},${y + 4}`} fill={stroke} />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(({ x, step, i, category }) => {
            const isBottleneck = i === data.bottleneck;
            const isHovered = hoveredNode === i;
            const isActive = activeIndex === i;
            const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.assay;
            const label = truncateText(step.title, 14);
            const num = String(i + 1).padStart(2, "0");
            
            // No default selected state - only highlight on hover/click
            const showHighlight = isHovered || isActive;
            
            return (
              <g 
                key={i} 
                onClick={() => onSelectStep?.(i)} 
                onMouseEnter={() => setHoveredNode(i)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Bottleneck glow */}
                {isBottleneck && (
                  <rect 
                    x={x - 3} 
                    y={padY - 3} 
                    width={nodeW + 6} 
                    height={nodeH + 6}
                    fill="none" 
                    stroke="#f0a500" 
                    strokeOpacity="0.3" 
                    strokeWidth="2" 
                  />
                )}
                {/* Node background */}
                <rect 
                  x={x} 
                  y={padY} 
                  width={nodeW} 
                  height={nodeH}
                  fill={colors.bg}
                  stroke={showHighlight ? "#e2eaf5" : "transparent"}
                  strokeWidth={showHighlight ? 1.5 : 0}
                />
                {/* Left border (category color) */}
                <rect 
                  x={x} 
                  y={padY} 
                  width={3} 
                  height={nodeH}
                  fill={colors.border}
                />
                {/* Step number */}
                <text 
                  x={x + 10} 
                  y={padY + 14}
                  fontSize="9" 
                  fontWeight="700"
                  fill="#5a7a9a" 
                  letterSpacing="0.15em"
                >
                  {num}
                </text>
                {/* Title */}
                <text 
                  x={x + 10} 
                  y={padY + 28}
                  fontSize="10" 
                  fontWeight="600"
                  fill="#e2eaf5"
                >
                  {label}
                </text>
                {/* Duration */}
                <text 
                  x={x + 10} 
                  y={padY + nodeH - 8}
                  fontSize="8"
                  fill="#5a7a9a" 
                  letterSpacing="0.1em"
                >
                  {step.time ?? "—"}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Scroll hint */}
        {needsScroll && (
          <div 
            style={{ 
              position: "absolute", 
              right: 0, 
              top: "50%", 
              transform: "translateY(-50%)",
              fontSize: 9,
              color: "#5a7a9a",
              background: "linear-gradient(to right, transparent, #050a14 50%)",
              padding: "8px 12px 8px 24px",
              fontFamily: "'IBM Plex Mono', 'Fira Code', monospace"
            }}
          >
            → scroll
          </div>
        )}
      </div>
    </div>
  );
}

export default ProtocolFlow;
