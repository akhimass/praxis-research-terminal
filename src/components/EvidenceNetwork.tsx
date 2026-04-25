import { useState, useEffect, useRef, useCallback } from 'react'

interface NetworkNode {
  id: string
  label: string
  type: "paper" | "compound" | "gene" | "mechanism" | "organism"
  weight: number
  year?: number
  value?: string
}

interface NetworkEdge {
  source: string
  target: string
  relationship: "inhibits" | "causes" | "measures" | "cites" | "expresses" | "targets" | "found_in"
  strength: number
}

interface EvidenceNetworkProps {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  width?: number
  height?: number
}

interface SimNode extends NetworkNode {
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
}

const NODE_COLORS: Record<string, string> = {
  paper: "#9d6fff",
  compound: "#00d97e",
  gene: "#4d9fff",
  mechanism: "#f0a500",
  organism: "#5a7a9a"
}

const EDGE_COLORS: Record<string, string> = {
  inhibits: "#ff4d4d",
  causes: "#f0a500",
  measures: "#5a7a9a",
  cites: "#2a4060",
  targets: "#00d97e",
  expresses: "#9d6fff",
  found_in: "#4d9fff"
}

function getNodeSize(weight: number, type: string): number {
  const baseSize = type === "compound" ? 16 : type === "paper" ? 12 : 14
  const maxSize = type === "compound" ? 32 : type === "paper" ? 28 : 24
  return baseSize + ((weight - 1) / 9) * (maxSize - baseSize)
}

function HexagonPath({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 30) * (Math.PI / 180)
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`
  }).join(" ")
  return <polygon points={points} />
}

function DiamondPath({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const s = size * 0.8
  return (
    <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`} />
  )
}

export default function EvidenceNetwork({
  nodes,
  edges,
  width = 800,
  height = 400
}: EvidenceNetworkProps) {
  const [simNodes, setSimNodes] = useState<SimNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const frameRef = useRef(0)
  const nodesRef = useRef<SimNode[]>([])
  const svgRef = useRef<SVGSVGElement>(null)
  
  // Initialize simulation
  useEffect(() => {
    const initialNodes: SimNode[] = nodes.map(node => ({
      ...node,
      x: width * 0.2 + Math.random() * width * 0.6,
      y: height * 0.2 + Math.random() * height * 0.6,
      vx: 0,
      vy: 0
    }))
    nodesRef.current = initialNodes
    setSimNodes(initialNodes)
    frameRef.current = 0
  }, [nodes, width, height])
  
  // Force simulation
  const runSimulation = useCallback(() => {
    if (isPaused || frameRef.current > 150) return
    
    const nodesCopy = [...nodesRef.current]
    const damping = 0.9
    const repulsionK = 3000
    const attractionK = 0.03
    const centerGravity = 0.01
    
    // Apply forces
    for (let i = 0; i < nodesCopy.length; i++) {
      const node = nodesCopy[i]
      if (node.fx !== undefined && node.fx !== null) continue
      
      let fx = 0, fy = 0
      
      // Repulsion from all other nodes
      for (let j = 0; j < nodesCopy.length; j++) {
        if (i === j) continue
        const other = nodesCopy[j]
        const dx = node.x - other.x
        const dy = node.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = repulsionK / (dist * dist)
        fx += (dx / dist) * force
        fy += (dy / dist) * force
      }
      
      // Attraction on edges
      edges.forEach(edge => {
        let other: SimNode | undefined
        if (edge.source === node.id) {
          other = nodesCopy.find(n => n.id === edge.target)
        } else if (edge.target === node.id) {
          other = nodesCopy.find(n => n.id === edge.source)
        }
        if (other) {
          const dx = other.x - node.x
          const dy = other.y - node.y
          fx += dx * attractionK * edge.strength
          fy += dy * attractionK * edge.strength
        }
      })
      
      // Center gravity
      fx += (width / 2 - node.x) * centerGravity
      fy += (height / 2 - node.y) * centerGravity
      
      node.vx = (node.vx + fx) * damping
      node.vy = (node.vy + fy) * damping
    }
    
    // Update positions
    for (const node of nodesCopy) {
      if (node.fx !== undefined && node.fx !== null) {
        node.x = node.fx
        node.y = node.fy!
      } else {
        node.x += node.vx
        node.y += node.vy
        
        // Boundary collision
        const size = getNodeSize(node.weight, node.type)
        if (node.x < size) { node.x = size; node.vx *= -0.5 }
        if (node.x > width - size) { node.x = width - size; node.vx *= -0.5 }
        if (node.y < size) { node.y = size; node.vy *= -0.5 }
        if (node.y > height - size) { node.y = height - size; node.vy *= -0.5 }
      }
    }
    
    nodesRef.current = nodesCopy
    setSimNodes([...nodesCopy])
    frameRef.current++
  }, [edges, width, height, isPaused])
  
  useEffect(() => {
    const interval = setInterval(runSimulation, 16)
    return () => clearInterval(interval)
  }, [runSimulation])
  
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setDraggedNode(nodeId)
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (node) {
      node.fx = node.x
      node.fy = node.y
    }
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const node = nodesRef.current.find(n => n.id === draggedNode)
    if (node) {
      node.fx = x
      node.fy = y
      node.x = x
      node.y = y
      setSimNodes([...nodesRef.current])
    }
  }
  
  const handleMouseUp = () => {
    setDraggedNode(null)
  }
  
  const handleDoubleClick = () => {
    setSelectedNode(null)
    setHoveredNode(null)
    frameRef.current = 0
    nodesRef.current.forEach(n => {
      n.fx = null
      n.fy = null
      n.x = width * 0.2 + Math.random() * width * 0.6
      n.y = height * 0.2 + Math.random() * height * 0.6
      n.vx = 0
      n.vy = 0
    })
    setSimNodes([...nodesRef.current])
  }
  
  const getConnectedNodes = (nodeId: string) => {
    const connected = new Set<string>([nodeId])
    edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target)
      if (edge.target === nodeId) connected.add(edge.source)
    })
    return connected
  }
  
  const connectedNodes = hoveredNode ? getConnectedNodes(hoveredNode) : null
  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Controls */}
      <div className="flex justify-end gap-2 mb-2">
        <button
          className="px-3 py-1 text-[8px] uppercase tracking-wider"
          style={{ 
            background: "#0d1e35", 
            border: "1px solid #1a2f50", 
            color: "#e2eaf5" 
          }}
          onClick={() => {
            frameRef.current = 0
            handleDoubleClick()
          }}
        >
          RESET
        </button>
        <button
          className="px-3 py-1 text-[8px] uppercase tracking-wider"
          style={{ 
            background: isPaused ? "#00d97e20" : "#0d1e35", 
            border: "1px solid #1a2f50", 
            color: isPaused ? "#00d97e" : "#e2eaf5" 
          }}
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? "RESUME" : "FREEZE"}
        </button>
      </div>
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ background: "#050a14", cursor: draggedNode ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <defs>
          {Object.entries(EDGE_COLORS).map(([rel, color]) => (
            <marker
              key={rel}
              id={`arrow-${rel}`}
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill={color} />
            </marker>
          ))}
        </defs>
        
        {/* Edges */}
        {edges.map((edge, i) => {
          const source = simNodes.find(n => n.id === edge.source)
          const target = simNodes.find(n => n.id === edge.target)
          if (!source || !target) return null
          
          const edgeKey = `${edge.source}-${edge.target}`
          const isEdgeHovered = hoveredEdge === edgeKey
          const isConnected = connectedNodes?.has(edge.source) && connectedNodes?.has(edge.target)
          const opacity = hoveredNode ? (isConnected ? 1 : 0.1) : (isEdgeHovered ? 1 : 0.4)
          
          const dx = target.x - source.x
          const dy = target.y - source.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const sourceSize = getNodeSize(source.weight, source.type)
          const targetSize = getNodeSize(target.weight, target.type)
          
          const sx = source.x + (dx / dist) * sourceSize
          const sy = source.y + (dy / dist) * sourceSize
          const tx = target.x - (dx / dist) * (targetSize + 6)
          const ty = target.y - (dy / dist) * (targetSize + 6)
          
          const midX = (sx + tx) / 2
          const midY = (sy + ty) / 2
          
          return (
            <g 
              key={i}
              onMouseEnter={() => setHoveredEdge(edgeKey)}
              onMouseLeave={() => setHoveredEdge(null)}
            >
              <line
                x1={sx}
                y1={sy}
                x2={tx}
                y2={ty}
                stroke={EDGE_COLORS[edge.relationship]}
                strokeWidth={1 + edge.strength * 2}
                opacity={opacity}
                markerEnd={`url(#arrow-${edge.relationship})`}
                style={{ transition: "opacity 0.2s" }}
              />
              {isEdgeHovered && (
                <g>
                  <rect
                    x={midX - 30}
                    y={midY - 10}
                    width={60}
                    height={16}
                    fill="#0d1e35"
                    stroke="#1a2f50"
                  />
                  <text
                    x={midX}
                    y={midY + 2}
                    fontSize="8"
                    fill="#e2eaf5"
                    textAnchor="middle"
                  >
                    {edge.relationship}
                  </text>
                </g>
              )}
            </g>
          )
        })}
        
        {/* Nodes */}
        {simNodes.map(node => {
          const size = getNodeSize(node.weight, node.type)
          const color = NODE_COLORS[node.type]
          const isHovered = hoveredNode === node.id
          const isSelected = selectedNode === node.id
          const isConnected = connectedNodes ? connectedNodes.has(node.id) : true
          const opacity = hoveredNode ? (isConnected ? 1 : 0.2) : 1
          
          const nodeElement = (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              opacity={opacity}
              style={{ cursor: "grab", transition: "opacity 0.2s" }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onMouseDown={(e) => handleMouseDown(node.id, e)}
              onClick={() => setSelectedNode(node.id)}
            >
              {node.type === "paper" && (
                <circle r={size} fill={color} fillOpacity="0.8" stroke={isSelected ? "#fff" : color} strokeWidth={isSelected ? 2 : 1} />
              )}
              {node.type === "compound" && (
                <g fill={color} fillOpacity="0.8" stroke={isSelected ? "#fff" : color} strokeWidth={isSelected ? 2 : 1}>
                  <HexagonPath cx={0} cy={0} size={size} />
                </g>
              )}
              {node.type === "gene" && (
                <g fill={color} fillOpacity="0.8" stroke={isSelected ? "#fff" : color} strokeWidth={isSelected ? 2 : 1}>
                  <DiamondPath cx={0} cy={0} size={size} />
                </g>
              )}
              {node.type === "mechanism" && (
                <rect x={-size} y={-size} width={size * 2} height={size * 2} rx={4} fill={color} fillOpacity="0.8" stroke={isSelected ? "#fff" : color} strokeWidth={isSelected ? 2 : 1} />
              )}
              {node.type === "organism" && (
                <>
                  <circle r={size} fill={color} fillOpacity="0.8" stroke={isSelected ? "#fff" : color} strokeWidth={isSelected ? 2 : 1} />
                  <circle r={size * 0.6} fill="none" stroke={color} strokeWidth={1} />
                </>
              )}
              
              <text
                y={4}
                fontSize="8"
                fill="#fff"
                textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {node.label.length > 10 ? node.label.slice(0, 10) + "…" : node.label}
              </text>
              
              {isHovered && (
                <g transform={`translate(0, ${-size - 25})`}>
                  <rect x={-50} y={-8} width={100} height={20} fill="#0d1e35" stroke="#1a2f50" />
                  <text y={6} fontSize="8" fill="#e2eaf5" textAnchor="middle">
                    {node.type} | {node.label}
                  </text>
                </g>
              )}
            </g>
          )
          
          return nodeElement
        })}
        
        {/* Legend */}
        <g transform="translate(10, 320)">
          <text fontSize="8" fill="#5a7a9a" fontStyle="italic">
            DRAG TO EXPLORE
          </text>
          <g transform="translate(0, 16)">
            {Object.entries(NODE_COLORS).map(([type, color], i) => (
              <g key={type} transform={`translate(0, ${i * 14})`}>
                <circle r={4} cx={4} cy={0} fill={color} />
                <text x={14} y={3} fontSize="7" fill="#5a7a9a">{type}</text>
              </g>
            ))}
          </g>
        </g>
      </svg>
      
      {/* Info Panel */}
      {selectedNodeData && (
        <div 
          className="mt-3 p-3"
          style={{ background: "#0d1e35", border: "1px solid #1a2f50" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="px-2 py-0.5 text-[8px] uppercase"
              style={{ background: NODE_COLORS[selectedNodeData.type] + "30", color: NODE_COLORS[selectedNodeData.type] }}
            >
              {selectedNodeData.type}
            </span>
            <span className="text-[11px] font-bold" style={{ color: "#e2eaf5" }}>
              {selectedNodeData.label}
            </span>
          </div>
          <div className="text-[9px]" style={{ color: "#5a7a9a" }}>
            Connections: {edges.filter(e => e.source === selectedNodeData.id || e.target === selectedNodeData.id).length}
            {selectedNodeData.year && ` | Year: ${selectedNodeData.year}`}
            {selectedNodeData.value && ` | Value: ${selectedNodeData.value}`}
          </div>
        </div>
      )}
    </div>
  )
}
