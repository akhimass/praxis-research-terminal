import { useState, useMemo } from 'react'

interface MutationCell {
  strain: string
  compound: string
  mic_value: number
  fold_shift: number
  classification: "susceptible" | "intermediate" | "resistant" | "highly_resistant"
  mutations: string[]
}

interface MutationHeatmapProps {
  cells: MutationCell[]
  strains: string[]
  compounds: string[]
  wt_strain?: string
}

const CLASSIFICATION_COLORS: Record<string, { base: string; range: [number, number] }> = {
  susceptible: { base: "#00d97e", range: [0.1, 0.3] },
  intermediate: { base: "#f0a500", range: [0.2, 0.5] },
  resistant: { base: "#ff4d4d", range: [0.2, 0.5] },
  highly_resistant: { base: "#ff4d4d", range: [0.6, 0.9] }
}

function getCellColor(classification: string, fold_shift: number): string {
  const config = CLASSIFICATION_COLORS[classification]
  if (!config) return "#1a2f50"
  
  // Map fold shift to opacity within the range
  const logFold = Math.log2(Math.max(1, fold_shift))
  const maxLog = Math.log2(256)
  const t = Math.min(1, logFold / maxLog)
  const opacity = config.range[0] + t * (config.range[1] - config.range[0])
  
  // Convert hex to rgba
  const r = parseInt(config.base.slice(1, 3), 16)
  const g = parseInt(config.base.slice(3, 5), 16)
  const b = parseInt(config.base.slice(5, 7), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function isYourCompound(compound: string): boolean {
  return compound.toLowerCase().startsWith("compound")
}

export default function MutationHeatmap({
  cells,
  strains,
  compounds,
  wt_strain
}: MutationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ strain: string; compound: string } | null>(null)
  const [selectedStrain, setSelectedStrain] = useState<string | null>(null)
  const [selectedCompound, setSelectedCompound] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<{ type: "strain" | "compound"; key: string; asc: boolean } | null>(null)
  
  // Create cell lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, MutationCell>()
    cells.forEach(cell => {
      map.set(`${cell.strain}|${cell.compound}`, cell)
    })
    return map
  }, [cells])
  
  // Calculate summary stats
  const compoundStats = useMemo(() => {
    return compounds.map(compound => {
      const compoundCells = cells.filter(c => c.compound === compound)
      const micValues = compoundCells.map(c => c.mic_value).filter(v => v > 0)
      const geoMean = micValues.length > 0 
        ? Math.pow(micValues.reduce((a, b) => a * b, 1), 1 / micValues.length)
        : 0
      const worstClass = compoundCells.reduce((worst, cell) => {
        const order = ["susceptible", "intermediate", "resistant", "highly_resistant"]
        return order.indexOf(cell.classification) > order.indexOf(worst) ? cell.classification : worst
      }, "susceptible" as string)
      return { compound, geoMean, worstClass }
    })
  }, [cells, compounds])
  
  const strainStats = useMemo(() => {
    return strains.map(strain => {
      const strainCells = cells.filter(c => c.strain === strain)
      const resistantCount = strainCells.filter(c => 
        c.classification === "resistant" || c.classification === "highly_resistant"
      ).length
      return { strain, resistantCount, total: strainCells.length }
    })
  }, [cells, strains])
  
  // Sort strains and compounds
  const sortedStrains = useMemo(() => {
    if (!sortBy || sortBy.type !== "compound") return strains
    return [...strains].sort((a, b) => {
      const cellA = cellMap.get(`${a}|${sortBy.key}`)
      const cellB = cellMap.get(`${b}|${sortBy.key}`)
      const valA = cellA?.fold_shift || 0
      const valB = cellB?.fold_shift || 0
      return sortBy.asc ? valA - valB : valB - valA
    })
  }, [strains, sortBy, cellMap])
  
  const sortedCompounds = useMemo(() => {
    if (!sortBy || sortBy.type !== "strain") return compounds
    return [...compounds].sort((a, b) => {
      const statsA = compoundStats.find(s => s.compound === a)
      const statsB = compoundStats.find(s => s.compound === b)
      const valA = statsA?.geoMean || 0
      const valB = statsB?.geoMean || 0
      return sortBy.asc ? valA - valB : valB - valA
    })
  }, [compounds, sortBy, compoundStats])
  
  const cellSize = 40
  const labelWidth = 180
  const labelHeight = 80
  const summaryRowHeight = 20
  const summaryColWidth = 80
  
  const hoveredCellData = hoveredCell 
    ? cellMap.get(`${hoveredCell.strain}|${hoveredCell.compound}`)
    : null

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="flex">
        {/* Main grid area */}
        <div>
          <svg
            width={labelWidth + sortedCompounds.length * cellSize + summaryColWidth}
            height={labelHeight + sortedStrains.length * cellSize + summaryRowHeight + 60}
          >
            {/* Compound labels (rotated) */}
            {sortedCompounds.map((compound, i) => {
              const isYours = isYourCompound(compound)
              return (
                <g
                  key={compound}
                  transform={`translate(${labelWidth + i * cellSize + cellSize / 2}, ${labelHeight - 8}) rotate(-45)`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (sortBy?.type === "compound" && sortBy.key === compound) {
                      setSortBy({ ...sortBy, asc: !sortBy.asc })
                    } else {
                      setSortBy({ type: "compound", key: compound, asc: true })
                    }
                  }}
                >
                  <text
                    fontSize="9"
                    fill={isYours ? "#00d97e" : "#f0a500"}
                    textAnchor="start"
                    dominantBaseline="middle"
                  >
                    {compound}
                  </text>
                </g>
              )
            })}
            
            {/* Summary column header */}
            <text
              x={labelWidth + sortedCompounds.length * cellSize + summaryColWidth / 2}
              y={labelHeight - 8}
              fontSize="8"
              fill="#5a7a9a"
              textAnchor="middle"
            >
              RESISTANT
            </text>
            
            {/* Strain rows */}
            {sortedStrains.map((strain, rowIndex) => {
              const isWT = wt_strain && strain.includes(wt_strain.split(" ")[0])
              const stats = strainStats.find(s => s.strain === strain)
              const resistantRatio = stats ? stats.resistantCount / stats.total : 0
              const isHighlyResistant = resistantRatio > 0.5
              
              // Extract mutations from strain name
              const mutationMatch = strain.match(/\(([^)]+)\)/)
              const mutations = mutationMatch ? mutationMatch[1].split("+") : []
              
              return (
                <g key={strain} transform={`translate(0, ${labelHeight + rowIndex * cellSize})`}>
                  {/* Strain label */}
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedStrain(selectedStrain === strain ? null : strain)
                    }}
                  >
                    <text
                      x={labelWidth - 8}
                      y={cellSize / 2 + 4}
                      fontSize="10"
                      fill={isWT ? "#f0a500" : isHighlyResistant ? "#ff4d4d" : "#a0b8d0"}
                      textAnchor="end"
                    >
                      {strain.replace(/\s*\([^)]*\)/, "")}
                      {isWT && " (WT)"}
                    </text>
                    {mutations.length > 0 && (
                      <g transform={`translate(${labelWidth - 6}, ${cellSize / 2 - 6})`}>
                        {mutations.map((mut, mi) => (
                          <rect
                            key={mi}
                            x={mi * 28 - mutations.length * 28}
                            y={-4}
                            width={26}
                            height={12}
                            fill="#ff4d4d20"
                            stroke="#ff4d4d"
                            strokeWidth="0.5"
                          />
                        ))}
                        {mutations.map((mut, mi) => (
                          <text
                            key={`t-${mi}`}
                            x={mi * 28 - mutations.length * 28 + 13}
                            y={4}
                            fontSize="7"
                            fill="#ff4d4d"
                            textAnchor="middle"
                          >
                            {mut}
                          </text>
                        ))}
                      </g>
                    )}
                  </g>
                  
                  {/* Cells */}
                  {sortedCompounds.map((compound, colIndex) => {
                    const cell = cellMap.get(`${strain}|${compound}`)
                    if (!cell) return null
                    
                    const isRowSelected = selectedStrain === strain
                    const isColSelected = selectedCompound === compound
                    const isHighlighted = isRowSelected || isColSelected
                    
                    return (
                      <g
                        key={compound}
                        transform={`translate(${labelWidth + colIndex * cellSize}, 0)`}
                        onMouseEnter={() => setHoveredCell({ strain, compound })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          setSelectedStrain(strain)
                          setSelectedCompound(compound)
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <rect
                          width={cellSize}
                          height={cellSize}
                          fill={getCellColor(cell.classification, cell.fold_shift)}
                          stroke={isHighlighted ? "#fff" : "#1a2f50"}
                          strokeWidth={isHighlighted ? 2 : 1}
                        />
                        <text
                          x={cellSize / 2}
                          y={cellSize / 2 + 4}
                          fontSize="9"
                          fontWeight="800"
                          fill={cell.classification === "highly_resistant" ? "#fff" : "#e2eaf5"}
                          textAnchor="middle"
                        >
                          {cell.fold_shift === 1 ? "1×" : `${cell.fold_shift}×`}
                        </text>
                        {cell.mutations.length > 0 && (
                          <circle
                            cx={cellSize - 6}
                            cy={6}
                            r={3}
                            fill="#ff4d4d"
                          />
                        )}
                      </g>
                    )
                  })}
                  
                  {/* Summary cell */}
                  <g transform={`translate(${labelWidth + sortedCompounds.length * cellSize}, 0)`}>
                    <text
                      x={summaryColWidth / 2}
                      y={cellSize / 2 + 4}
                      fontSize="9"
                      fill={isHighlyResistant ? "#ff4d4d" : "#5a7a9a"}
                      textAnchor="middle"
                    >
                      {stats?.resistantCount}/{stats?.total}
                    </text>
                  </g>
                </g>
              )
            })}
            
            {/* Summary row */}
            <g transform={`translate(0, ${labelHeight + sortedStrains.length * cellSize + 4})`}>
              <text
                x={labelWidth - 8}
                y={summaryRowHeight / 2 + 4}
                fontSize="8"
                fill="#5a7a9a"
                textAnchor="end"
              >
                GEO MEAN
              </text>
              {compoundStats.map((stats, i) => {
                const barWidth = (stats.geoMean / 10) * (cellSize - 4)
                return (
                  <g key={stats.compound} transform={`translate(${labelWidth + i * cellSize}, 0)`}>
                    <rect
                      x={2}
                      y={summaryRowHeight / 2 - 3}
                      width={Math.min(barWidth, cellSize - 4)}
                      height={6}
                      fill={CLASSIFICATION_COLORS[stats.worstClass]?.base || "#5a7a9a"}
                      opacity={0.6}
                    />
                  </g>
                )
              })}
            </g>
            
            {/* Color scale legend */}
            <g transform={`translate(${labelWidth}, ${labelHeight + sortedStrains.length * cellSize + summaryRowHeight + 20})`}>
              <defs>
                <linearGradient id="scale-gradient">
                  <stop offset="0%" stopColor="#00d97e" stopOpacity="0.2" />
                  <stop offset="33%" stopColor="#f0a500" stopOpacity="0.4" />
                  <stop offset="66%" stopColor="#ff4d4d" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ff4d4d" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <rect
                width={200}
                height={12}
                fill="url(#scale-gradient)"
              />
              <text x={0} y={24} fontSize="7" fill="#5a7a9a">SUSCEPTIBLE</text>
              <text x={200} y={24} fontSize="7" fill="#5a7a9a" textAnchor="end">RESISTANT</text>
              <text x={100} y={-4} fontSize="8" fill="#5a7a9a" textAnchor="middle">FOLD-SHIFT</text>
              {[1, 4, 16, 64, 256].map((tick, i) => (
                <g key={tick} transform={`translate(${i * 50}, 0)`}>
                  <line y1={12} y2={16} stroke="#5a7a9a" strokeWidth="1" />
                  <text y={26} fontSize="6" fill="#2a4060" textAnchor="middle">{tick}×</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
      
      {/* Tooltip */}
      {hoveredCellData && hoveredCell && (
        <div 
          className="fixed z-50 p-3"
          style={{
            background: "#0d1e35",
            border: "1px solid #1a2f50",
            pointerEvents: "none",
            left: "50%",
            top: "20px",
            transform: "translateX(-50%)"
          }}
        >
          <div className="text-[10px] font-bold mb-1" style={{ color: "#e2eaf5" }}>
            {hoveredCell.strain}
          </div>
          <div className="text-[10px] mb-2" style={{ color: "#5a7a9a" }}>
            {hoveredCell.compound}
          </div>
          <div className="text-[9px] space-y-1">
            <div style={{ color: "#e2eaf5" }}>
              MIC: {hoveredCellData.mic_value} μg/mL
            </div>
            <div style={{ color: "#e2eaf5" }}>
              Fold-shift: {hoveredCellData.fold_shift}× vs WT
            </div>
            <div>
              <span
                className="px-1.5 py-0.5 text-[8px] uppercase"
                style={{
                  background: CLASSIFICATION_COLORS[hoveredCellData.classification]?.base + "30",
                  color: CLASSIFICATION_COLORS[hoveredCellData.classification]?.base
                }}
              >
                {hoveredCellData.classification.replace("_", " ")}
              </span>
            </div>
            {hoveredCellData.mutations.length > 0 && (
              <div style={{ color: "#ff4d4d" }}>
                Mutations: {hoveredCellData.mutations.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
