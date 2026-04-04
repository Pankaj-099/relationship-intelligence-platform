import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  MarkerType,
} from 'reactflow'

import type { Node, Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, RefreshCw, Plus, History } from 'lucide-react'
import { graphApi } from '../api/graph'
import type { GraphNode as ApiNode, GraphEdge as ApiEdge } from '../types/graph'
import { searchApi } from '../api/search'
import { projectsApi } from '../api/projects'
import { CustomNode } from '../components/graph/CustomNode'
import { NodePanel } from '../components/graph/NodePanel'
import { FilterPanel } from '../components/graph/FilterPanel'
import { GraphToolbar } from '../components/graph/GraphToolbar'
import { WSIndicator } from '../components/graph/WSIndicator'
import { Loader } from '../components/ui/Loader'
import { Button } from '../components/ui/Button'
import { useWebSocket } from '../hooks/useWebSocket'
import toast from 'react-hot-toast'

const RF_NODE_TYPES = { custom: CustomNode }

const TYPE_COLORS: Record<string, string> = {
  default: '#6366f1', person: '#8b5cf6', company: '#06b6d4',
  skill: '#10b981', product: '#f59e0b', location: '#ef4444',
  event: '#ec4899', organization: '#f97316', technology: '#14b8a6',
}

const getTypeColor = (type: string, nodeColor?: string | null) =>
  nodeColor || TYPE_COLORS[type?.toLowerCase()] || '#6366f1'

const buildLayout = (apiNodes: ApiNode[], apiEdges: ApiEdge[]) => {
  const total = apiNodes.length
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)))

  const rfNodes: Node[] = apiNodes.map((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const color = getTypeColor(node.node_type, node.color)
    return {
      id: String(node.id),
      type: 'custom',
      position: {
        x: node.position_x !== 0 ? node.position_x : (col - cols / 2) * 220,
        y: node.position_y !== 0 ? node.position_y : row * 200,
      },
      data: {
        label: node.label,
        node_type: node.node_type,
        color,
        size: 48,
        properties: node.properties || {},
        isDimmed: false,
        apiNode: node,
      },
    }
  })

  const rfEdges: Edge[] = apiEdges.map((edge) => {
    const sourceNode = apiNodes.find((n) => n.id === edge.source_id)
    const color = getTypeColor(sourceNode?.node_type || 'default', sourceNode?.color)
    return {
      id: String(edge.id),
      source: String(edge.source_id),
      target: String(edge.target_id),
      label: edge.relationship_type,
      type: 'smoothstep',
      style: { stroke: `${color}80`, strokeWidth: 2 },
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: edge.is_directed
        ? { type: MarkerType.ArrowClosed, color: `${color}80`, width: 16, height: 16 }
        : undefined,
    }
  })

  return { rfNodes, rfEdges }
}

function GraphExplorerInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)
  const { fitView } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([])
  const [apiEdges, setApiEdges] = useState<ApiEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('')
  const [selectedApiNode, setSelectedApiNode] = useState<ApiNode | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})
  const [showGrid, setShowGrid] = useState(true)
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set())
  const [hasHighlight, setHasHighlight] = useState(false)

  // WebSocket
  const { isConnected, connections } = useWebSocket({
    projectId,
    onNodeAdded: (data) => {
      toast.success(`Node "${data.node?.label}" added by ${data.user?.username}`)
      loadGraph()
    },
    onNodeDeleted: (data) => {
      toast(`Node deleted by ${data.user?.username}`)
      loadGraph()
    },
    onEdgeAdded: (data) => {
      toast.success(`Edge added by ${data.user?.username}`)
      loadGraph()
    },
    onUserJoined: (data) => {
      toast(`${data.user?.username} joined`, { icon: '👋' })
    },
  })

  useEffect(() => { loadGraph() }, [projectId])

  const loadGraph = async () => {
    setLoading(true)
    try {
      const [proj, graphData, typesData] = await Promise.all([
        projectsApi.get(projectId),
        graphApi.getGraph(projectId, { limit: 500 }),
        searchApi.getNodeTypes(projectId),
      ])
      setProjectName(proj.name)
      setApiNodes(graphData.nodes)
      setApiEdges(graphData.edges)
      setAvailableTypes(typesData.types)
      setTypeCounts(typesData.counts)

      const { rfNodes, rfEdges } = buildLayout(graphData.nodes, graphData.edges)
      setNodes(rfNodes)
      setEdges(rfEdges)
      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 150)
    } catch {
      toast.error('Failed to load graph')
      navigate(`/projects/${projectId}`)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredNodes = useCallback(() => {
    return apiNodes.filter((node) => {
      const matchesSearch = !searchQuery ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.external_id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(node.node_type)
      return matchesSearch && matchesType
    })
  }, [apiNodes, searchQuery, selectedTypes])

  useEffect(() => {
    const filtered = getFilteredNodes()
    const filteredIds = new Set(filtered.map((n) => String(n.id)))

    setNodes((nds) => nds.map((n) => ({
      ...n,
      hidden: !filteredIds.has(n.id),
      data: {
        ...n.data,
        isDimmed: hasHighlight ? !highlightedIds.has(Number(n.id)) : false,
      },
    })))

    setEdges((eds) => eds.map((e) => ({
      ...e,
      hidden: !filteredIds.has(e.source) || !filteredIds.has(e.target),
      style: {
        ...e.style,
        opacity: hasHighlight
          ? (highlightedIds.has(Number(e.source)) && highlightedIds.has(Number(e.target)) ? 1 : 0.08)
          : 1,
      },
    })))
  }, [searchQuery, selectedTypes, highlightedIds, hasHighlight, apiNodes])

  const onNodeClick = useCallback((_: any, node: Node) => {
    const apiNode = apiNodes.find((n) => String(n.id) === node.id)
    setSelectedApiNode(apiNode || null)
  }, [apiNodes])

  const onPaneClick = useCallback(() => {
    setSelectedApiNode(null)
    if (hasHighlight) {
      setHighlightedIds(new Set())
      setHasHighlight(false)
    }
  }, [hasHighlight])

  const handleFocusNeighbors = async (nodeId: number) => {
    try {
      const result = await searchApi.getNeighbors(projectId, nodeId, 1)
      const ids = new Set(result.nodes.map((n) => n.id))
      setHighlightedIds(ids)
      setHasHighlight(true)
      toast.success(`Showing ${ids.size} connected nodes`)
    } catch {
      toast.error('Failed to get neighbors')
    }
  }

  const handleDeleteNode = async (nodeId: number) => {
    if (!confirm('Delete this node and all its connections?')) return
    try {
      await graphApi.deleteNode(projectId, nodeId)
      setApiNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setApiEdges((prev) => prev.filter((e) => e.source_id !== nodeId && e.target_id !== nodeId))
      setNodes((nds) => nds.filter((n) => n.id !== String(nodeId)))
      setEdges((eds) => eds.filter((e) => e.source !== String(nodeId) && e.target !== String(nodeId)))
      setSelectedApiNode(null)
      toast.success('Node deleted')
    } catch {
      toast.error('Failed to delete node')
    }
  }

  const handleExport = () => {
    const data = {
      nodes: apiNodes.map((n) => ({ id: n.external_id, label: n.label, type: n.node_type, properties: n.properties })),
      edges: apiEdges.map((e) => ({
        source: apiNodes.find((n) => n.id === e.source_id)?.external_id,
        target: apiNodes.find((n) => n.id === e.target_id)?.external_id,
        type: e.relationship_type,
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}-graph.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Graph exported!')
  }

  const filteredNodes = getFilteredNodes()
  if (loading) return <Loader fullScreen text="Loading graph..." />

  return (
    <div className="w-screen h-screen bg-slate-950 relative overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/projects/${projectId}`)} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="text-white font-semibold text-sm">{projectName}</span>
          <span className="text-slate-500 text-xs hidden sm:block">Graph Explorer</span>
          <WSIndicator isConnected={isConnected} connections={connections} />
        </div>
        <div className="flex items-center gap-2">
          {hasHighlight && (
            <button onClick={() => { setHighlightedIds(new Set()); setHasHighlight(false) }} className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              Clear highlight
            </button>
          )}
          <Button size="sm" variant="secondary" onClick={() => navigate(`/projects/${projectId}/history`)}>
            <History size={13} /> History
          </Button>
          <Button size="sm" variant="secondary" onClick={loadGraph}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
            <Plus size={13} /> Add Data
          </Button>
        </div>
      </div>

      <div className="w-full h-full pt-14">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={RF_NODE_TYPES}
          fitView
          minZoom={0.05}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
        >
          {showGrid && <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1e293b" />}
          <MiniMap
            className="!bg-slate-900 !border !border-slate-700 !rounded-xl"
            nodeColor={(n) => n.data?.color || '#6366f1'}
            maskColor="rgba(15,23,42,0.75)"
            style={{ bottom: 80, right: 16 }}
          />
        </ReactFlow>
      </div>

      <FilterPanel
        nodeTypes={availableTypes}
        typeCounts={typeCounts}
        selectedTypes={selectedTypes}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onTypeToggle={(type) => setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type])}
        onClearFilters={() => { setSearchQuery(''); setSelectedTypes([]); setHighlightedIds(new Set()); setHasHighlight(false) }}
        totalNodes={apiNodes.length}
        visibleNodes={filteredNodes.length}
      />

      <NodePanel
        node={selectedApiNode}
        edges={apiEdges}
        allNodes={apiNodes}
        onClose={() => setSelectedApiNode(null)}
        onDelete={handleDeleteNode}
        onFocusNeighbors={handleFocusNeighbors}
      />

      <GraphToolbar
        onFitView={() => fitView({ padding: 0.2, duration: 600 })}
        onExport={handleExport}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        nodeCount={filteredNodes.length}
        edgeCount={apiEdges.length}
      />

      {apiNodes.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <RefreshCw size={24} className="text-indigo-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No nodes in this graph</p>
            <p className="text-slate-400 text-sm">Go back and add some nodes first</p>
          </div>
        </div>
      )}
    </div>
  )
}

export const GraphExplorer = () => (
  <ReactFlowProvider>
    <GraphExplorerInner />
  </ReactFlowProvider>
)
