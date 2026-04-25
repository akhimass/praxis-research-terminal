import { useState } from 'react'

interface DockingResult {
  compound_name: string
  binding_affinity_kcal: number
  rmsd: number
  pose_count: number
  interacting_residues: string[]
  reference_affinity?: number
  confidence: "high" | "medium" | "low"
}

interface DockingScorePanelProps {
  results: DockingResult[]
  target_name: string
  mutation_context?: string
}

const RESISTANCE_MUTATIONS = ["D87N", "S83L", "S80I"]

function getResidueType(residue: string): { type: string; color: string } {
  const code = residue.slice(0, 3)
  const acidic = ["Asp", "Glu"]
  const basic = ["Arg", "Lys", "His"]
  const polar = ["Ser", "Thr", "Asn", "Gln"]
  const hydrophobic = ["Ala", "Val", "Leu", "Ile", "Met", "Phe", "Trp", "Pro", "Tyr"]
  
  if (acidic.includes(code)) return { type: "Acidic", color: "#ff4d4d" }
  if (basic.includes(code)) return { type: "Basic", color: "#4d9fff" }
  if (polar.includes(code)) return { type: "Polar", color: "#9d6fff" }
  if (hydrophobic.includes(code)) return { type: "Hydrophobic", color: "#f0a500" }
  if (code === "Gly") return { type: "Glycine", color: "#5a7a9a" }
  return { type: "Other", color: "#5a7a9a" }
}

function getShortResidue(residue: string): string {
  const match = residue.match(/([A-Z][a-z]{2})(\d+)/)
  if (!match) return residue.slice(0, 4)
  const codes: Record<string, string> = {
    Asp: "D", Glu: "E", Arg: "R", Lys: "K", His: "H",
    Ser: "S", Thr: "T", Asn: "N", Gln: "Q", Gly: "G",
    Ala: "A", Val: "V", Leu: "L", Ile: "I", Met: "M",
    Phe: "F", Trp: "W", Pro: "P", Tyr: "Y", Cys: "C"
  }
  return (codes[match[1]] || match[1][0]) + match[2]
}

function isResistanceMutation(residue: string): boolean {
  const short = getShortResidue(residue)
  return RESISTANCE_MUTATIONS.some(m => short.startsWith(m.slice(0, -1)))
}

function getAffinityColor(affinity: number): string {
  if (affinity < -9.0) return "#00d97e"
  if (affinity >= -9.0 && affinity < -7.0) return "#4d9fff"
  if (affinity >= -7.0 && affinity < -5.0) return "#f0a500"
  return "#ff4d4d"
}

export default function DockingScorePanel({
  results,
  target_name,
  mutation_context
}: DockingScorePanelProps) {
  const [hoveredCompound, setHoveredCompound] = useState<string | null>(null)
  
  const sortedResults = [...results].sort((a, b) => a.binding_affinity_kcal - b.binding_affinity_kcal)
  const bestResult = sortedResults[0]
  
  const minAffinity = -12
  const maxAffinity = 0
  const range = maxAffinity - minAffinity
  
  const chartWidth = 400
  const chartHeight = results.length * 44 + 60
  const barHeight = 28
  const barGap = 16
  const leftPadding = 100
  const rightPadding = 100
  const topPadding = 30
  
  const axisX = (value: number) => {
    return leftPadding + ((value - minAffinity) / range) * (chartWidth - leftPadding - rightPadding)
  }
  
  const referenceAffinity = results.find(r => r.reference_affinity)?.reference_affinity

  return (
    <div className="flex gap-6" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Left Section: Binding Affinity */}
      <div className="flex-[55]">
        <div className="text-[9px] uppercase tracking-wider mb-3" style={{ color: "#5a7a9a" }}>
          BINDING AFFINITY
        </div>
        
        <svg width={chartWidth} height={chartHeight}>
          {/* Axis labels */}
          <text x={leftPadding - 8} y={topPadding - 12} 
                fontSize="8" fill="#5a7a9a" fontStyle="italic" textAnchor="end">
            STRONGER BINDING ←
          </text>
          
          {/* Grid and axis */}
          {[-12, -10, -8, -6, -4, -2, 0].map(tick => (
            <g key={tick}>
              <line 
                x1={axisX(tick)} 
                y1={topPadding} 
                x2={axisX(tick)} 
                y2={chartHeight - 20}
                stroke="#1a2f50"
                strokeDasharray={tick === 0 ? "none" : "2,2"}
              />
              <text 
                x={axisX(tick)} 
                y={chartHeight - 6}
                fontSize="8" 
                fill="#2a4060" 
                textAnchor="middle"
              >
                {tick}
              </text>
            </g>
          ))}
          
          {/* Zero axis label */}
          <text x={axisX(0) + 4} y={topPadding - 6} fontSize="7" fill="#5a7a9a">
            0 kcal/mol
          </text>
          
          {/* Reference drug line */}
          {referenceAffinity && (
            <g>
              <line
                x1={axisX(referenceAffinity)}
                y1={topPadding}
                x2={axisX(referenceAffinity)}
                y2={chartHeight - 20}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="4,3"
                opacity="0.5"
              />
              <text 
                x={axisX(referenceAffinity)} 
                y={topPadding - 6}
                fontSize="7" 
                fill="#5a7a9a" 
                textAnchor="middle"
              >
                REFERENCE DRUG
              </text>
            </g>
          )}
          
          {/* Bars */}
          {sortedResults.map((result, i) => {
            const y = topPadding + i * (barHeight + barGap)
            const color = getAffinityColor(result.binding_affinity_kcal)
            const barWidth = axisX(0) - axisX(result.binding_affinity_kcal)
            const barX = axisX(result.binding_affinity_kcal)
            const isHovered = hoveredCompound === result.compound_name
            
            return (
              <g 
                key={result.compound_name}
                onMouseEnter={() => setHoveredCompound(result.compound_name)}
                onMouseLeave={() => setHoveredCompound(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Bar with gradient */}
                <defs>
                  <linearGradient id={`grad-${i}`} x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <rect
                  x={barX}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={`url(#grad-${i})`}
                  opacity={isHovered ? 1 : 0.85}
                />
                
                {/* Compound name */}
                <text
                  x={barX - 6}
                  y={y + barHeight / 2 + 4}
                  fontSize="10"
                  fontWeight="600"
                  fill="#e2eaf5"
                  textAnchor="end"
                >
                  {result.compound_name}
                </text>
                
                {/* Affinity value */}
                <text
                  x={axisX(0) + 6}
                  y={y + barHeight / 2 + 4}
                  fontSize="11"
                  fontWeight="700"
                  fill={color}
                >
                  {result.binding_affinity_kcal.toFixed(1)} kcal/mol
                </text>
                
                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={barX + barWidth / 2 - 60}
                      y={y - 32}
                      width={120}
                      height={26}
                      fill="#0d1e35"
                      stroke="#1a2f50"
                    />
                    <text x={barX + barWidth / 2} y={y - 18} fontSize="8" fill="#e2eaf5" textAnchor="middle">
                      RMSD: {result.rmsd.toFixed(1)}Å | {result.pose_count} poses
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      
      {/* Right Section: Interaction Fingerprint */}
      <div className="flex-[45]">
        <div className="text-[9px] uppercase tracking-wider mb-3" style={{ color: "#5a7a9a" }}>
          KEY INTERACTIONS
        </div>
        
        <div className="text-[10px] mb-4" style={{ color: "#e2eaf5" }}>
          {bestResult.compound_name} → {target_name}
          {mutation_context && (
            <span style={{ color: "#ff4d4d" }}> ({mutation_context})</span>
          )}
        </div>
        
        {/* Residue grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {bestResult.interacting_residues.map(residue => {
            const { type, color } = getResidueType(residue)
            const isResistance = isResistanceMutation(residue)
            
            return (
              <div key={residue} className="flex flex-col items-center">
                <div
                  className="w-8 h-8 flex items-center justify-center relative"
                  style={{
                    background: "#0d1e35",
                    border: `2px solid ${color}`,
                    boxShadow: isResistance ? `0 0 8px ${color}` : "none",
                    animation: isResistance ? "pulse 2s infinite" : "none"
                  }}
                >
                  <span className="text-[9px] font-bold" style={{ color: "#e2eaf5" }}>
                    {getShortResidue(residue)}
                  </span>
                </div>
                <span className="text-[7px] mt-1" style={{ color: "#5a7a9a" }}>
                  {type}
                </span>
                {isResistance && (
                  <span className="text-[6px] mt-0.5" style={{ color: "#ff4d4d" }}>
                    ⚠ RESISTANCE
                  </span>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Confidence indicator */}
        <div className="flex items-center gap-2 text-[9px]" style={{ color: "#5a7a9a" }}>
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: bestResult.confidence === "high" ? "#00d97e" : 
                         bestResult.confidence === "medium" ? "#f0a500" : "#ff4d4d"
            }}
          />
          MODEL CONFIDENCE: {bestResult.confidence.toUpperCase()}
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 8px #ff4d4d; }
          50% { box-shadow: 0 0 16px #ff4d4d; }
        }
      `}</style>
    </div>
  )
}
