import { useState } from 'react'

interface FundingOpportunity {
  id: string
  name: string
  short_name: string
  color: string
  scores: {
    disease_match: number
    stage_alignment: number
    evidence_required: number
    technology_fit: number
    amount_alignment: number
    timeline_fit: number
  }
  overall_fit: number
  amount_range: string
}

interface FundingRadarProps {
  opportunities: FundingOpportunity[]
  max_display?: number
}

const DIMENSIONS = [
  { key: "disease_match", label: "DISEASE\nMATCH", angle: -90 },
  { key: "stage_alignment", label: "STAGE\nFIT", angle: -30 },
  { key: "evidence_required", label: "EVIDENCE", angle: 30 },
  { key: "technology_fit", label: "TECHNOLOGY", angle: 90 },
  { key: "amount_alignment", label: "AMOUNT", angle: 150 },
  { key: "timeline_fit", label: "TIMELINE", angle: 210 }
] as const

function polarToCartesian(angle: number, radius: number, cx: number, cy: number) {
  const rad = (angle * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  }
}

function getScoreColor(score: number): string {
  if (score > 85) return "#00d97e"
  if (score >= 70) return "#4d9fff"
  if (score >= 50) return "#f0a500"
  return "#5a7a9a"
}

export default function FundingRadar({
  opportunities,
  max_display = 4
}: FundingRadarProps) {
  const [hoveredGrant, setHoveredGrant] = useState<string | null>(null)
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null)
  const [visibleGrants, setVisibleGrants] = useState<Set<string>>(
    new Set(opportunities.slice(0, max_display).map(o => o.id))
  )
  const [isolatedGrant, setIsolatedGrant] = useState<string | null>(null)
  
  const displayedOpportunities = opportunities.slice(0, max_display)
  const bestGrant = displayedOpportunities.reduce((best, curr) => 
    curr.overall_fit > best.overall_fit ? curr : best
  )
  
  const size = 400
  const cx = size / 2
  const cy = size / 2
  const maxRadius = 150
  const levels = [0.25, 0.5, 0.75, 1]
  
  const getPolygonPoints = (scores: Record<string, number>, radius: number) => {
    return DIMENSIONS.map(dim => {
      const score = scores[dim.key as keyof typeof scores] / 100
      const r = score * radius
      const point = polarToCartesian(dim.angle, r, cx, cy)
      return `${point.x},${point.y}`
    }).join(" ")
  }
  
  const hexagonPoints = (radius: number) => {
    return DIMENSIONS.map(dim => {
      const point = polarToCartesian(dim.angle, radius, cx, cy)
      return `${point.x},${point.y}`
    }).join(" ")
  }
  
  const toggleVisibility = (id: string) => {
    if (isolatedGrant === id) {
      setIsolatedGrant(null)
    } else if (isolatedGrant) {
      setIsolatedGrant(id)
    } else {
      const newVisible = new Set(visibleGrants)
      if (newVisible.has(id)) {
        newVisible.delete(id)
      } else {
        newVisible.add(id)
      }
      setVisibleGrants(newVisible)
    }
  }
  
  const handleDoubleClick = (id: string) => {
    if (isolatedGrant === id) {
      setIsolatedGrant(null)
    } else {
      setIsolatedGrant(id)
    }
  }
  
  const isGrantVisible = (id: string) => {
    if (isolatedGrant) return id === isolatedGrant
    return visibleGrants.has(id)
  }

  return (
    <div className="flex gap-8" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Radar Chart */}
      <div className="flex-shrink-0">
        <svg width={size} height={size}>
          {/* Grid hexagons */}
          {levels.map(level => (
            <polygon
              key={level}
              points={hexagonPoints(maxRadius * level)}
              fill="none"
              stroke="#1a2f50"
              strokeWidth="1"
            />
          ))}
          
          {/* Axis lines */}
          {DIMENSIONS.map(dim => {
            const end = polarToCartesian(dim.angle, maxRadius, cx, cy)
            const isHighlighted = hoveredDimension === dim.key
            return (
              <line
                key={dim.key}
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke={isHighlighted ? "#4d9fff" : "#1a2f50"}
                strokeWidth={isHighlighted ? 2 : 1}
                style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
              />
            )
          })}
          
          {/* Ideal profile (dashed) */}
          <polygon
            points={hexagonPoints(maxRadius)}
            fill="none"
            stroke="#ffffff20"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <text
            x={cx}
            y={cy - maxRadius - 8}
            fontSize="8"
            fill="#5a7a9a"
            textAnchor="middle"
          >
            IDEAL
          </text>
          
          {/* Grant polygons */}
          {displayedOpportunities.map(opp => {
            const visible = isGrantVisible(opp.id)
            const isHovered = hoveredGrant === opp.id
            
            return (
              <g 
                key={opp.id}
                opacity={visible ? 1 : 0.1}
                onMouseEnter={() => setHoveredGrant(opp.id)}
                onMouseLeave={() => setHoveredGrant(null)}
              >
                <polygon
                  points={getPolygonPoints(opp.scores, maxRadius)}
                  fill={opp.color}
                  fillOpacity={isHovered ? 0.3 : 0.15}
                  stroke={opp.color}
                  strokeWidth="2"
                  style={{ transition: "fill-opacity 0.2s" }}
                />
                
                {/* Score dots */}
                {DIMENSIONS.map(dim => {
                  const score = opp.scores[dim.key as keyof typeof opp.scores]
                  const r = (score / 100) * maxRadius
                  const point = polarToCartesian(dim.angle, r, cx, cy)
                  const isDimHighlighted = hoveredDimension === dim.key
                  
                  return (
                    <g key={dim.key}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isHovered || isDimHighlighted ? 10 : 6}
                        fill={opp.color}
                        style={{ transition: "r 0.2s" }}
                      />
                      {(isHovered || isDimHighlighted) && (
                        <text
                          x={point.x}
                          y={point.y - 14}
                          fontSize="9"
                          fill="#e2eaf5"
                          textAnchor="middle"
                          fontWeight="700"
                        >
                          {score}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}
          
          {/* Axis labels */}
          {DIMENSIONS.map(dim => {
            const labelRadius = maxRadius + 30
            const point = polarToCartesian(dim.angle, labelRadius, cx, cy)
            const lines = dim.label.split("\n")
            
            return (
              <text
                key={dim.key}
                x={point.x}
                y={point.y}
                fontSize="9"
                fill="#5a7a9a"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={point.x} dy={i === 0 ? 0 : 11}>
                    {line}
                  </tspan>
                ))}
              </text>
            )
          })}
        </svg>
      </div>
      
      {/* Legend and Table */}
      <div className="flex-1 min-w-[280px]">
        {/* Legend */}
        <div className="mb-6">
          <div className="text-[9px] uppercase tracking-wider mb-3" style={{ color: "#5a7a9a" }}>
            FUNDING SOURCES
          </div>
          {displayedOpportunities.map(opp => {
            const isBest = opp.id === bestGrant.id
            const isVisible = isGrantVisible(opp.id)
            
            return (
              <div
                key={opp.id}
                className="flex items-center justify-between py-1.5 cursor-pointer"
                style={{ opacity: isVisible ? 1 : 0.4 }}
                onClick={() => toggleVisibility(opp.id)}
                onDoubleClick={() => handleDoubleClick(opp.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2"
                    style={{ background: opp.color }}
                  />
                  <span 
                    className="text-[10px]"
                    style={{ 
                      color: "#e2eaf5",
                      fontWeight: isBest ? 700 : 400
                    }}
                  >
                    {opp.short_name}
                  </span>
                  {isBest && (
                    <span 
                      className="text-[7px] px-1.5 py-0.5"
                      style={{ background: "#00d97e20", color: "#00d97e" }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <span 
                  className="text-[10px]"
                  style={{ 
                    color: getScoreColor(opp.overall_fit),
                    fontWeight: 700
                  }}
                >
                  {opp.overall_fit}/100
                </span>
              </div>
            )
          })}
        </div>
        
        {/* Comparison Table */}
        <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: "#5a7a9a" }}>
          SCORE COMPARISON
        </div>
        <div style={{ border: "1px solid #1a2f50" }}>
          {/* Header */}
          <div className="flex" style={{ borderBottom: "1px solid #1a2f50" }}>
            <div className="w-24 p-2" style={{ color: "#5a7a9a" }} />
            {displayedOpportunities.map(opp => (
              <div
                key={opp.id}
                className="flex-1 p-2 text-center text-[9px] font-bold"
                style={{
                  color: "#e2eaf5",
                  background: opp.id === bestGrant.id ? "#00d97e15" : "transparent"
                }}
              >
                {opp.short_name}
              </div>
            ))}
          </div>
          
          {/* Rows */}
          {DIMENSIONS.map(dim => (
            <div 
              key={dim.key} 
              className="flex"
              style={{ borderBottom: "1px solid #1a2f50" }}
            >
              <div 
                className="w-24 p-2 text-[8px]"
                style={{ color: "#5a7a9a" }}
              >
                {dim.label.replace("\n", " ")}
              </div>
              {displayedOpportunities.map(opp => {
                const score = opp.scores[dim.key as keyof typeof opp.scores]
                return (
                  <div
                    key={opp.id}
                    className="flex-1 p-2 text-center text-[10px] font-bold cursor-pointer"
                    style={{
                      color: getScoreColor(score),
                      background: opp.id === bestGrant.id ? "#00d97e08" : "transparent"
                    }}
                    onMouseEnter={() => setHoveredDimension(dim.key)}
                    onMouseLeave={() => setHoveredDimension(null)}
                  >
                    {score}
                  </div>
                )
              })}
            </div>
          ))}
          
          {/* Amount row */}
          <div className="flex">
            <div 
              className="w-24 p-2 text-[8px]"
              style={{ color: "#5a7a9a" }}
            >
              AMOUNT
            </div>
            {displayedOpportunities.map(opp => (
              <div
                key={opp.id}
                className="flex-1 p-2 text-center text-[9px]"
                style={{
                  color: "#e2eaf5",
                  background: opp.id === bestGrant.id ? "#00d97e08" : "transparent"
                }}
              >
                {opp.amount_range}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
