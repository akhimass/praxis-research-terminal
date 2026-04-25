import { useState, useMemo } from 'react'

interface ProtocolStep {
  id: string
  title: string
  category: "prep" | "assay" | "analysis" | "decision"
  duration_hours: number
  inputs: string[]
  outputs: string[]
  critical: boolean
  parallel_group?: string
}

interface ProtocolSankeyProps {
  steps: ProtocolStep[]
  title?: string
}

const CATEGORY_CONFIG: Record<string, { color: string; label: string; column: number }> = {
  prep: { color: "#4d9fff", label: "PREPARATION", column: 0 },
  assay: { color: "#00d97e", label: "EXECUTION", column: 1 },
  analysis: { color: "#9d6fff", label: "MEASUREMENT", column: 2 },
  decision: { color: "#f0a500", label: "DECISION", column: 3 }
}

// Demo data
const DEFAULT_STEPS: ProtocolStep[] = [
  { id: "prep1", title: "Media Preparation", category: "prep", duration_hours: 1.5, inputs: ["Mueller-Hinton Broth"], outputs: ["Prepared Media"], critical: true },
  { id: "prep2", title: "Strain Culture", category: "prep", duration_hours: 16, inputs: ["Bacterial Stock"], outputs: ["Log-Phase Culture"], critical: true },
  { id: "prep3", title: "Compound Dilution", category: "prep", duration_hours: 1, inputs: ["Compound Stock"], outputs: ["Serial Dilutions"], critical: false, parallel_group: "prep-parallel" },
  { id: "assay1", title: "Inoculation", category: "assay", duration_hours: 1, inputs: ["Log-Phase Culture", "Serial Dilutions"], outputs: ["Inoculated Plates"], critical: true },
  { id: "assay2", title: "Incubation", category: "assay", duration_hours: 18, inputs: ["Inoculated Plates"], outputs: ["Incubated Plates"], critical: true },
  { id: "analysis1", title: "OD Reading", category: "analysis", duration_hours: 0.5, inputs: ["Incubated Plates"], outputs: ["Raw OD Data"], critical: true },
  { id: "analysis2", title: "MIC Determination", category: "analysis", duration_hours: 1, inputs: ["Raw OD Data"], outputs: ["MIC Values"], critical: true },
  { id: "decision1", title: "Go/No-Go", category: "decision", duration_hours: 0.5, inputs: ["MIC Values"], outputs: ["Advancement Decision"], critical: true }
]

export default function ProtocolSankey({
  steps = DEFAULT_STEPS,
  title = "MIC ASSAY PROTOCOL"
}: ProtocolSankeyProps) {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  
  const nodeWidth = 140
  const nodeHeight = 40
  const columnWidth = 180
  const rowGap = 60
  const leftPadding = 120
  const topPadding = 80
  
  // Organize steps by column
  const columns = useMemo(() => {
    const cols: ProtocolStep[][] = [[], [], [], []]
    steps.forEach(step => {
      const colIndex = CATEGORY_CONFIG[step.category]?.column ?? 0
      cols[colIndex].push(step)
    })
    return cols
  }, [steps])
  
  // Calculate node positions
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    columns.forEach((col, colIndex) => {
      col.forEach((step, rowIndex) => {
        positions[step.id] = {
          x: leftPadding + colIndex * columnWidth,
          y: topPadding + rowIndex * (nodeHeight + rowGap)
        }
      })
    })
    return positions
  }, [columns])
  
  // Find connections between steps based on inputs/outputs
  const connections = useMemo(() => {
    const conns: { source: string; target: string; label: string }[] = []
    
    steps.forEach(targetStep => {
      targetStep.inputs.forEach(input => {
        // Find a step that outputs this input
        const sourceStep = steps.find(s => s.outputs.includes(input))
        if (sourceStep && sourceStep.id !== targetStep.id) {
          conns.push({
            source: sourceStep.id,
            target: targetStep.id,
            label: input
          })
        }
      })
    })
    
    return conns
  }, [steps])
  
  // Get all unique inputs (from outside the system)
  const externalInputs = useMemo(() => {
    const allOutputs = new Set(steps.flatMap(s => s.outputs))
    const inputs = new Set<string>()
    steps.forEach(step => {
      step.inputs.forEach(input => {
        if (!allOutputs.has(input)) {
          inputs.add(input)
        }
      })
    })
    return Array.from(inputs)
  }, [steps])
  
  // Get final outputs
  const finalOutputs = useMemo(() => {
    const allInputs = new Set(steps.flatMap(s => s.inputs))
    return steps
      .filter(s => s.outputs.some(o => !allInputs.has(o)))
      .flatMap(s => s.outputs.filter(o => !allInputs.has(o)))
  }, [steps])
  
  // Calculate critical path duration
  const criticalDuration = useMemo(() => {
    return steps.filter(s => s.critical).reduce((sum, s) => sum + s.duration_hours, 0)
  }, [steps])
  
  const svgWidth = leftPadding + 4 * columnWidth + 80
  const maxRows = Math.max(...columns.map(c => c.length))
  const svgHeight = topPadding + maxRows * (nodeHeight + rowGap) + 60
  
  const hoveredStepData = hoveredStep ? steps.find(s => s.id === hoveredStep) : null
  const connectedOutputs = hoveredStepData?.outputs || []
  const connectedInputs = hoveredStepData?.inputs || []

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-bold tracking-wider" style={{ color: "#e2eaf5" }}>
          {title}
        </div>
        <button
          className="px-3 py-1 text-[8px] uppercase tracking-wider"
          style={{
            background: showCriticalPath ? "#ff4d4d20" : "#0d1e35",
            border: "1px solid #1a2f50",
            color: showCriticalPath ? "#ff4d4d" : "#e2eaf5"
          }}
          onClick={() => setShowCriticalPath(!showCriticalPath)}
        >
          CRITICAL PATH
        </button>
      </div>
      
      <svg width={svgWidth} height={svgHeight}>
        {/* Column headers */}
        {Object.entries(CATEGORY_CONFIG).map(([_, config]) => (
          <text
            key={config.label}
            x={leftPadding + config.column * columnWidth + nodeWidth / 2}
            y={30}
            fontSize="9"
            fill="#5a7a9a"
            textAnchor="middle"
            letterSpacing="1"
          >
            {config.label}
          </text>
        ))}
        
        {/* External inputs */}
        {externalInputs.map((input, i) => {
          // Find which step uses this input
          const targetStep = steps.find(s => s.inputs.includes(input))
          if (!targetStep) return null
          const targetPos = nodePositions[targetStep.id]
          if (!targetPos) return null
          
          const y = topPadding + i * 20
          const isConnected = connectedInputs.includes(input)
          
          return (
            <g key={input} opacity={hoveredStep ? (isConnected ? 1 : 0.3) : 1}>
              <text
                x={10}
                y={y + 4}
                fontSize="8"
                fill="#2a4060"
                textAnchor="start"
              >
                {input.toUpperCase()}
              </text>
              <path
                d={`M ${80} ${y} Q ${100} ${y} ${targetPos.x} ${targetPos.y + nodeHeight / 2}`}
                fill="none"
                stroke="#1a2f50"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
            </g>
          )
        })}
        
        {/* Final outputs */}
        {finalOutputs.map((output, i) => {
          const sourceStep = steps.find(s => s.outputs.includes(output))
          if (!sourceStep) return null
          const sourcePos = nodePositions[sourceStep.id]
          if (!sourcePos) return null
          
          const y = topPadding + i * 20
          const endX = svgWidth - 10
          const isConnected = connectedOutputs.includes(output)
          
          return (
            <g key={output} opacity={hoveredStep ? (isConnected ? 1 : 0.3) : 1}>
              <path
                d={`M ${sourcePos.x + nodeWidth} ${sourcePos.y + nodeHeight / 2} Q ${endX - 40} ${sourcePos.y + nodeHeight / 2} ${endX - 80} ${y}`}
                fill="none"
                stroke="#00d97e"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
              <text
                x={endX}
                y={y + 4}
                fontSize="8"
                fill="#00d97e"
                textAnchor="end"
              >
                {output.toUpperCase()}
              </text>
            </g>
          )
        })}
        
        {/* Connections */}
        {connections.map((conn, i) => {
          const sourcePos = nodePositions[conn.source]
          const targetPos = nodePositions[conn.target]
          if (!sourcePos || !targetPos) return null
          
          const sourceStep = steps.find(s => s.id === conn.source)
          const targetStep = steps.find(s => s.id === conn.target)
          const sourceColor = CATEGORY_CONFIG[sourceStep?.category || "prep"].color
          const targetColor = CATEGORY_CONFIG[targetStep?.category || "prep"].color
          
          const isConnectedToHovered = hoveredStep === conn.source || hoveredStep === conn.target
          const opacity = hoveredStep ? (isConnectedToHovered ? 1 : 0.1) : 0.4
          
          const x1 = sourcePos.x + nodeWidth
          const y1 = sourcePos.y + nodeHeight / 2
          const x2 = targetPos.x
          const y2 = targetPos.y + nodeHeight / 2
          const cx1 = x1 + (x2 - x1) * 0.4
          const cx2 = x1 + (x2 - x1) * 0.6
          
          const strokeWidth = 2 + (sourceStep?.duration_hours || 1) * 0.3
          
          return (
            <g key={i}>
              <defs>
                <linearGradient id={`grad-conn-${i}`}>
                  <stop offset="0%" stopColor={sourceColor} />
                  <stop offset="100%" stopColor={targetColor} />
                </linearGradient>
              </defs>
              <path
                d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={`url(#grad-conn-${i})`}
                strokeWidth={strokeWidth}
                opacity={opacity}
                style={{ transition: "opacity 0.2s" }}
              />
            </g>
          )
        })}
        
        {/* Step nodes */}
        {steps.map(step => {
          const pos = nodePositions[step.id]
          if (!pos) return null
          
          const config = CATEGORY_CONFIG[step.category]
          const isHovered = hoveredStep === step.id
          const dimmed = showCriticalPath && !step.critical
          const opacity = dimmed ? 0.2 : 1
          
          const isDecision = step.category === "decision"
          
          return (
            <g
              key={step.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              opacity={opacity}
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
              style={{ cursor: "pointer", transition: "opacity 0.2s" }}
            >
              {isDecision ? (
                // Diamond shape for decision
                <g transform={`translate(${nodeWidth / 2}, ${nodeHeight / 2})`}>
                  <polygon
                    points={`0,-${nodeHeight / 2} ${nodeWidth / 2},0 0,${nodeHeight / 2} -${nodeWidth / 2},0`}
                    fill={`${config.color}15`}
                    stroke={step.critical ? config.color : "#1a2f50"}
                    strokeWidth={step.critical ? 2 : 1}
                  />
                  <text
                    y={-4}
                    fontSize="9"
                    fontWeight="700"
                    fill="#e2eaf5"
                    textAnchor="middle"
                  >
                    {step.title.length > 12 ? step.title.slice(0, 12) + "…" : step.title}
                  </text>
                  <text
                    y={10}
                    fontSize="8"
                    fill="#5a7a9a"
                    textAnchor="middle"
                  >
                    {step.duration_hours}h
                  </text>
                </g>
              ) : (
                // Rectangle for other steps
                <>
                  <rect
                    width={nodeWidth}
                    height={nodeHeight}
                    fill={`${config.color}15`}
                    stroke={step.critical && showCriticalPath ? config.color : "#1a2f50"}
                    strokeWidth={step.critical && showCriticalPath ? 2 : 1}
                  />
                  <rect
                    width={3}
                    height={nodeHeight}
                    fill={config.color}
                  />
                  <text
                    x={12}
                    y={16}
                    fontSize="9"
                    fontWeight="700"
                    fill="#e2eaf5"
                  >
                    {step.title.length > 16 ? step.title.slice(0, 16) + "…" : step.title}
                  </text>
                  <text
                    x={12}
                    y={30}
                    fontSize="8"
                    fill="#5a7a9a"
                  >
                    {step.duration_hours}h
                  </text>
                </>
              )}
              
              {/* Hover tooltip */}
              {isHovered && (
                <g transform={`translate(${nodeWidth / 2}, ${-50})`}>
                  <rect
                    x={-80}
                    y={-8}
                    width={160}
                    height={50}
                    fill="#0d1e35"
                    stroke="#1a2f50"
                  />
                  <text y={6} fontSize="9" fill="#e2eaf5" textAnchor="middle" fontWeight="700">
                    {step.title}
                  </text>
                  <text y={20} fontSize="8" fill="#5a7a9a" textAnchor="middle">
                    Duration: {step.duration_hours}h
                  </text>
                  <text y={32} fontSize="7" fill="#5a7a9a" textAnchor="middle">
                    In: {step.inputs.join(", ").slice(0, 30)}
                  </text>
                </g>
              )}
            </g>
          )
        })}
        
        {/* Critical path summary */}
        {showCriticalPath && (
          <text
            x={svgWidth / 2}
            y={svgHeight - 20}
            fontSize="10"
            fill="#ff4d4d"
            textAnchor="middle"
            fontWeight="700"
          >
            CRITICAL PATH: {criticalDuration.toFixed(1)}h
          </text>
        )}
      </svg>
    </div>
  )
}
