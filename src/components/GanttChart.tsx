import React, { useState, useMemo } from "react";

interface GanttItem {
  task: string;
  week_start: number;
  week_end: number;
  phase: "validation" | "confirmation" | "scale";
  is_critical_path: boolean;
  milestone?: boolean;
  parallel_with?: string | null;
  cost_range?: string;
}

interface GanttChartProps {
  items: GanttItem[];
  total_weeks: number;
  current_week?: number;
}

const PHASE_COLORS = {
  validation: "#00d97e",
  confirmation: "#f0a500",
  scale: "#4d9fff",
} as const;

const DESIGN = {
  background: "#050a14",
  surface: "#0a1628",
  border: "#1a2f50",
  taskLabelColor: "#5a7a9a",
  weekHeaderColor: "#2a4060",
  gridLineColor: "#0d1e35",
  criticalPathColor: "#ff4d4d",
  currentWeekColor: "#f0a50066",
  tooltipBg: "#0d1e35",
  tooltipBorder: "#1a2f50",
} as const;

const LEFT_COLUMN_WIDTH = 200;
const ROW_HEIGHT = 36;
const BAR_HEIGHT = 20;
const HEADER_HEIGHT = 32;
const FOOTER_HEIGHT = 48;

export default function GanttChart({
  items,
  total_weeks,
  current_week,
}: GanttChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const chartWidth = 800;
  const gridWidth = chartWidth - LEFT_COLUMN_WIDTH;
  const weekWidth = gridWidth / total_weeks;
  const chartHeight = HEADER_HEIGHT + items.length * ROW_HEIGHT + FOOTER_HEIGHT;

  const criticalPathWeeks = useMemo(() => {
    const criticalItems = items.filter((item) => item.is_critical_path);
    if (criticalItems.length === 0) return 0;
    const maxEnd = Math.max(...criticalItems.map((item) => item.week_end));
    const minStart = Math.min(...criticalItems.map((item) => item.week_start));
    return maxEnd - minStart + 1;
  }, [items]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <svg
      width={chartWidth}
      height={chartHeight}
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        background: DESIGN.background,
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Week Headers */}
      <g>
        {Array.from({ length: total_weeks }, (_, i) => {
          const weekNum = i + 1;
          const x = LEFT_COLUMN_WIDTH + i * weekWidth + weekWidth / 2;
          return (
            <text
              key={`week-${weekNum}`}
              x={x}
              y={20}
              textAnchor="middle"
              fill={DESIGN.weekHeaderColor}
              fontSize={9}
            >
              WK {weekNum}
            </text>
          );
        })}
      </g>

      {/* Vertical Grid Lines */}
      <g>
        {Array.from({ length: total_weeks + 1 }, (_, i) => {
          const x = LEFT_COLUMN_WIDTH + i * weekWidth;
          return (
            <line
              key={`grid-${i}`}
              x1={x}
              y1={HEADER_HEIGHT}
              x2={x}
              y2={HEADER_HEIGHT + items.length * ROW_HEIGHT}
              stroke={DESIGN.gridLineColor}
              strokeWidth={1}
            />
          );
        })}
      </g>

      {/* Current Week Indicator */}
      {current_week !== undefined &&
        current_week >= 1 &&
        current_week <= total_weeks && (
          <line
            x1={LEFT_COLUMN_WIDTH + (current_week - 0.5) * weekWidth}
            y1={HEADER_HEIGHT}
            x2={LEFT_COLUMN_WIDTH + (current_week - 0.5) * weekWidth}
            y2={HEADER_HEIGHT + items.length * ROW_HEIGHT}
            stroke={DESIGN.currentWeekColor}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}

      {/* Task Rows */}
      {items.map((item, index) => {
        const y = HEADER_HEIGHT + index * ROW_HEIGHT;
        const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
        const barX = LEFT_COLUMN_WIDTH + (item.week_start - 1) * weekWidth;
        const barWidth = (item.week_end - item.week_start + 1) * weekWidth;
        const phaseColor = PHASE_COLORS[item.phase];
        const borderColor = item.is_critical_path
          ? DESIGN.criticalPathColor
          : phaseColor;

        const showLabelInBar = item.week_end - item.week_start + 1 > 3;

        return (
          <g key={`task-${index}`}>
            {/* Row background for hover effect */}
            <rect
              x={0}
              y={y}
              width={chartWidth}
              height={ROW_HEIGHT}
              fill="transparent"
            />

            {/* Task Label (left column) */}
            <text
              x={12}
              y={y + ROW_HEIGHT / 2 + 4}
              fill={DESIGN.taskLabelColor}
              fontSize={10}
            >
              {item.task.length > 24
                ? item.task.substring(0, 22) + "..."
                : item.task}
            </text>

            {/* Task Bar or Milestone */}
            {item.milestone ? (
              /* Diamond milestone marker at week_end */
              <g
                transform={`translate(${LEFT_COLUMN_WIDTH + (item.week_end - 0.5) * weekWidth}, ${barY + BAR_HEIGHT / 2})`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "pointer" }}
              >
                <polygon
                  points="0,-6 6,0 0,6 -6,0"
                  fill={phaseColor}
                  stroke={borderColor}
                  strokeWidth={1}
                />
              </g>
            ) : (
              /* Regular task bar */
              <g
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={BAR_HEIGHT}
                  fill={`${phaseColor}40`}
                  rx={0}
                  ry={0}
                />
                {/* Left border accent */}
                <rect
                  x={barX}
                  y={barY}
                  width={3}
                  height={BAR_HEIGHT}
                  fill={borderColor}
                  rx={0}
                  ry={0}
                />
                {/* Bar label if wide enough */}
                {showLabelInBar && (
                  <text
                    x={barX + 10}
                    y={barY + BAR_HEIGHT / 2 + 3}
                    fill="#ffffff"
                    fontSize={9}
                  >
                    {item.task.length > Math.floor(barWidth / 7)
                      ? item.task.substring(0, Math.floor(barWidth / 7) - 2) +
                        "..."
                      : item.task}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* Critical Path Summary */}
      <g>
        <text
          x={12}
          y={HEADER_HEIGHT + items.length * ROW_HEIGHT + 24}
          fill={DESIGN.criticalPathColor}
          fontSize={10}
          fontWeight="bold"
        >
          CRITICAL PATH: {criticalPathWeeks} WEEKS
        </text>
        <text
          x={LEFT_COLUMN_WIDTH + 20}
          y={HEADER_HEIGHT + items.length * ROW_HEIGHT + 24}
          fill={DESIGN.taskLabelColor}
          fontSize={10}
        >
          TOTAL TIMELINE: {total_weeks} WEEKS
        </text>
      </g>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <g
          transform={`translate(${Math.min(mousePos.x + 12, chartWidth - 180)}, ${Math.min(mousePos.y + 12, chartHeight - 80)})`}
        >
          <rect
            x={0}
            y={0}
            width={170}
            height={items[hoveredIndex].cost_range ? 72 : 58}
            fill={DESIGN.tooltipBg}
            stroke={DESIGN.tooltipBorder}
            strokeWidth={1}
            rx={0}
            ry={0}
          />
          <text x={8} y={16} fill="#ffffff" fontSize={10} fontWeight="bold">
            {items[hoveredIndex].task.length > 20
              ? items[hoveredIndex].task.substring(0, 18) + "..."
              : items[hoveredIndex].task}
          </text>
          <text x={8} y={32} fill={DESIGN.taskLabelColor} fontSize={9}>
            Weeks {items[hoveredIndex].week_start}-
            {items[hoveredIndex].week_end}
          </text>
          <text
            x={8}
            y={46}
            fill={PHASE_COLORS[items[hoveredIndex].phase]}
            fontSize={9}
          >
            Phase: {items[hoveredIndex].phase.toUpperCase()}
          </text>
          {items[hoveredIndex].cost_range && (
            <text x={8} y={60} fill={DESIGN.taskLabelColor} fontSize={9}>
              Cost: {items[hoveredIndex].cost_range}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
