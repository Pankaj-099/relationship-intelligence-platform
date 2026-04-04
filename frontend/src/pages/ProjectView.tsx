import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Upload, Network, GitBranch,
  Trash2, RefreshCw, Database, Settings, X, Check,
  FileJson, FileText, ChevronDown, ChevronUp
} from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { projectsApi } from '../api/projects'
import { graphApi, type CreateNodePayload, type CreateEdgePayload, type CreateSchemaPayload } from '../api/graph'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Loader } from '../components/ui/Loader'
import type { GraphNode, GraphEdge, SchemaDefinition, Project } from '../types/graph'
import toast from 'react-hot-toast'

const NODE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export const ProjectView = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)

  const { currentProject, setCurrentProject } = useProjectStore()
  const [project, setProject] = useState<Project | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [schemas, setSchemas] = useState<SchemaDefinition[]>([])
  const [loading, setLoading] = useState(true)

  // Panels
  const [activeTab, setActiveTab] = useState<'data' | 'schema' | 'import'>('data')
  const [showAddNode, setShowAddNode] = useState(false)
  const [showAddEdge, setShowAddEdge] = useState(false)
  const [showAddSchema, setShowAddSchema] = useState(false)
  const [importing, setImporting] = useState(false)
  const [replacing, setReplacing] = useState(false)

  const jsonInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Forms
  const [nodeForm, setNodeForm] = useState<CreateNodePayload>({
    external_id: '', label: '', node_type: 'default', properties: {}, color: '#6366f1'
  })
  const [edgeForm, setEdgeForm] = useState<CreateEdgePayload>({
    source_external_id: '', target_external_id: '', relationship_type: 'relates_to'
  })
  const [schemaForm, setSchemaForm] = useState<CreateSchemaPayload>({
    name: '', schema_type: 'node', color: '#6366f1', properties_schema: {}
  })
  const [propKey, setPropKey] = useState('')
  const [propValue, setPropValue] = useState('')

  useEffect(() => {
    loadAll()
  }, [projectId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [proj, graphData, schemaData] = await Promise.all([
        projectsApi.get(projectId),
        graphApi.getGraph(projectId),
        graphApi.getSchema(projectId),
      ])
      setProject(proj)
      setCurrentProject(proj)
      setNodes(graphData.nodes)
      setEdges(graphData.edges)
      setSchemas(schemaData)
    } catch {
      toast.error('Failed to load project')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nodeForm.external_id || !nodeForm.label) return toast.error('ID and Label are required')
    try {
      const node = await graphApi.createNode(projectId, nodeForm)
      setNodes((prev) => [...prev, node])
      setProject((p) => p ? { ...p, node_count: p.node_count + 1 } : p)
      setShowAddNode(false)
      setNodeForm({ external_id: '', label: '', node_type: 'default', properties: {}, color: '#6366f1' })
      toast.success('Node added!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to add node')
    }
  }

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edgeForm.source_external_id || !edgeForm.target_external_id) {
      return toast.error('Source and Target are required')
    }
    try {
      const edge = await graphApi.createEdge(projectId, edgeForm)
      setEdges((prev) => [...prev, edge])
      setProject((p) => p ? { ...p, edge_count: p.edge_count + 1 } : p)
      setShowAddEdge(false)
      setEdgeForm({ source_external_id: '', target_external_id: '', relationship_type: 'relates_to' })
      toast.success('Edge added!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to add edge')
    }
  }

  const handleAddSchema = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schemaForm.name) return toast.error('Schema name is required')
    try {
      const schema = await graphApi.createSchema(projectId, schemaForm)
      setSchemas((prev) => [...prev, schema])
      setShowAddSchema(false)
      setSchemaForm({ name: '', schema_type: 'node', color: '#6366f1', properties_schema: {} })
      toast.success('Schema type added!')
    } catch {
      toast.error('Failed to add schema')
    }
  }

  const handleDeleteNode = async (nodeId: number) => {
    try {
      await graphApi.deleteNode(projectId, nodeId)
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setProject((p) => p ? { ...p, node_count: Math.max(0, p.node_count - 1) } : p)
      toast.success('Node deleted')
    } catch {
      toast.error('Failed to delete node')
    }
  }

  const handleDeleteEdge = async (edgeId: number) => {
    try {
      await graphApi.deleteEdge(projectId, edgeId)
      setEdges((prev) => prev.filter((e) => e.id !== edgeId))
      setProject((p) => p ? { ...p, edge_count: Math.max(0, p.edge_count - 1) } : p)
      toast.success('Edge deleted')
    } catch {
      toast.error('Failed to delete edge')
    }
  }

  const handleDeleteSchema = async (schemaId: number) => {
    try {
      await graphApi.deleteSchema(projectId, schemaId)
      setSchemas((prev) => prev.filter((s) => s.id !== schemaId))
      toast.success('Schema deleted')
    } catch {
      toast.error('Failed to delete schema')
    }
  }

  const handleImport = async (file: File, type: 'json' | 'csv') => {
    setImporting(true)
    try {
      const result = type === 'json'
        ? await graphApi.importJson(projectId, file, replacing)
        : await graphApi.importCsv(projectId, file, replacing)

      toast.success(`Imported ${result.nodes_created} nodes, ${result.edges_created} edges`)
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} errors: ${result.errors[0]}`)
      }
      await loadAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleClearGraph = async () => {
    if (!confirm('Clear all nodes and edges? This cannot be undone.')) return
    try {
      await graphApi.clearGraph(projectId)
      setNodes([])
      setEdges([])
      setProject((p) => p ? { ...p, node_count: 0, edge_count: 0 } : p)
      toast.success('Graph cleared')
    } catch {
      toast.error('Failed to clear graph')
    }
  }

  const addProperty = () => {
    if (!propKey) return
    setNodeForm((f) => ({ ...f, properties: { ...f.properties, [propKey]: propValue } }))
    setPropKey('')
    setPropValue('')
  }

  const getNodeLabel = (nodeId: number) => {
    return nodes.find((n) => n.id === nodeId)?.label || nodeId.toString()
  }

  if (loading) return <Loader fullScreen text="Loading project..." />

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-6 h-6 rounded-md" style={{ backgroundColor: project?.color }} />
            <span className="font-semibold text-white">{project?.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-indigo-400 font-medium">{nodes.length}</span> nodes ·
            <span className="text-violet-400 font-medium">{edges.length}</span> edges
          </div>
          <Button size="sm" onClick={() => navigate(`/projects/${projectId}/graph`)}>
            <Network size={14} />
            View Graph
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {[
            { key: 'data', label: 'Data', icon: Database },
            { key: 'schema', label: 'Schema', icon: Settings },
            { key: 'import', label: 'Import', icon: Upload },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* DATA TAB */}
        {activeTab === 'data' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nodes */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Network size={16} className="text-indigo-400" />
                  Nodes
                  <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                    {nodes.length}
                  </span>
                </h2>
                <Button size="sm" onClick={() => setShowAddNode(true)}>
                  <Plus size={14} /> Add Node
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {nodes.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No nodes yet. Add one or import data.</p>
                ) : (
                  nodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: node.color || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{node.label}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {node.external_id} · <Badge label={node.node_type} color={node.color || '#6366f1'} />
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1.5 rounded flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Edges */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <GitBranch size={16} className="text-violet-400" />
                  Edges
                  <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
                    {edges.length}
                  </span>
                </h2>
                <Button size="sm" variant="secondary" onClick={() => setShowAddEdge(true)}
                  disabled={nodes.length < 2}>
                  <Plus size={14} /> Add Edge
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {edges.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No edges yet. Connect your nodes.</p>
                ) : (
                  edges.map((edge) => (
                    <div
                      key={edge.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 group"
                    >
                      <div className="flex items-center gap-2 min-w-0 text-sm">
                        <span className="text-indigo-300 font-medium truncate max-w-24">
                          {getNodeLabel(edge.source_id)}
                        </span>
                        <span className="text-slate-500 flex-shrink-0">→</span>
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full flex-shrink-0">
                          {edge.relationship_type}
                        </span>
                        <span className="text-violet-300 font-medium truncate max-w-24">
                          {getNodeLabel(edge.target_id)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteEdge(edge.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1.5 rounded flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* SCHEMA TAB */}
        {activeTab === 'schema' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Schema Definitions</h2>
                <p className="text-slate-400 text-sm mt-0.5">Define node and edge types for your graph</p>
              </div>
              <Button size="sm" onClick={() => setShowAddSchema(true)}>
                <Plus size={14} /> Add Type
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {schemas.length === 0 ? (
                <Card className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <Settings size={28} className="text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm">No schema types defined yet</p>
                  <p className="text-slate-500 text-xs mt-1">Define node/edge types to organize your graph</p>
                </Card>
              ) : (
                schemas.map((schema) => (
                  <Card key={schema.id} className="group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${schema.color}20`, color: schema.color }}
                        >
                          {schema.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{schema.name}</p>
                          <Badge
                            label={schema.schema_type}
                            color={schema.schema_type === 'node' ? '#6366f1' : '#8b5cf6'}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSchema(schema.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {Object.keys(schema.properties_schema).length > 0 && (
                      <div className="text-xs text-slate-500 space-y-0.5">
                        {Object.entries(schema.properties_schema).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-slate-400">{k}:</span>
                            <span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* IMPORT TAB */}
        {activeTab === 'import' && (
          <div className="max-w-2xl space-y-4">
            <Card>
              <h2 className="font-semibold text-white mb-1">Import Graph Data</h2>
              <p className="text-slate-400 text-sm mb-5">Upload JSON or CSV files to populate your graph</p>

              <label className="flex items-center gap-2 mb-5 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={replacing}
                  onChange={(e) => setReplacing(e.target.checked)}
                  className="w-4 h-4 rounded accent-red-500"
                />
                <span className="text-sm text-slate-300">Replace existing data</span>
                <span className="text-xs text-slate-500">(clears all current nodes/edges)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* JSON Import */}
                <div
                  onClick={() => jsonInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-6 text-center cursor-pointer transition-all group"
                >
                  <FileJson size={28} className="text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-white text-sm font-medium">Import JSON</p>
                  <p className="text-slate-500 text-xs mt-1">nodes/edges format</p>
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0], 'json')}
                  />
                </div>

                {/* CSV Import */}
                <div
                  onClick={() => csvInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl p-6 text-center cursor-pointer transition-all group"
                >
                  <FileText size={28} className="text-violet-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-white text-sm font-medium">Import CSV</p>
                  <p className="text-slate-500 text-xs mt-1">edge list or node list</p>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0], 'csv')}
                  />
                </div>
              </div>

              {importing && (
                <div className="flex items-center justify-center gap-3 mt-4 py-3 bg-slate-800/50 rounded-lg">
                  <Loader size="sm" />
                  <span className="text-sm text-slate-300">Importing data...</span>
                </div>
              )}
            </Card>

            {/* Format guide */}
            <Card>
              <h3 className="font-medium text-white text-sm mb-3">Supported Formats</h3>
              <div className="space-y-3 text-xs text-slate-400">
                <div>
                  <p className="text-slate-300 font-medium mb-1">JSON — nodes & edges</p>
                  <pre className="bg-slate-800 rounded-lg p-3 overflow-x-auto text-slate-300">
{`{
  "nodes": [
    { "id": "1", "label": "Alice", "type": "Person" }
  ],
  "edges": [
    { "source": "1", "target": "2", "type": "KNOWS" }
  ]
}`}
                  </pre>
                </div>
                <div>
                  <p className="text-slate-300 font-medium mb-1">CSV — edge list</p>
                  <pre className="bg-slate-800 rounded-lg p-3 overflow-x-auto text-slate-300">
{`source,target,relationship_type
Alice,Bob,KNOWS
Bob,Carol,WORKS_WITH`}
                  </pre>
                </div>
              </div>
            </Card>

            {/* Danger zone */}
            {(nodes.length > 0 || edges.length > 0) && (
              <Card variant="bordered" className="border-red-500/20">
                <h3 className="font-medium text-red-400 text-sm mb-3">Danger Zone</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">Clear all graph data</p>
                    <p className="text-slate-500 text-xs">Remove all {nodes.length} nodes and {edges.length} edges</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={handleClearGraph}>
                    <Trash2 size={14} />
                    Clear Graph
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Add Node Modal */}
      <Modal isOpen={showAddNode} onClose={() => setShowAddNode(false)} title="Add Node">
        <form onSubmit={handleAddNode} className="space-y-4">
          <Input
            label="Node ID"
            placeholder="unique-id-123"
            required
            value={nodeForm.external_id}
            onChange={(e) => setNodeForm({ ...nodeForm, external_id: e.target.value })}
            hint="Must be unique within this project"
          />
          <Input
            label="Label"
            placeholder="Alice"
            required
            value={nodeForm.label}
            onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
          />
          <Input
            label="Type"
            placeholder="Person, Company, Skill..."
            value={nodeForm.node_type}
            onChange={(e) => setNodeForm({ ...nodeForm, node_type: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Color</label>
            <div className="flex gap-2">
              {NODE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNodeForm({ ...nodeForm, color: c })}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: nodeForm.color === c ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
          {/* Properties */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Properties</label>
            <div className="flex gap-2 mb-2">
              <Input placeholder="key" value={propKey} onChange={(e) => setPropKey(e.target.value)} />
              <Input placeholder="value" value={propValue} onChange={(e) => setPropValue(e.target.value)} />
              <Button type="button" size="sm" variant="secondary" onClick={addProperty}>
                <Plus size={14} />
              </Button>
            </div>
            {Object.entries(nodeForm.properties || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs bg-slate-800 rounded px-2 py-1 mb-1">
                <span className="text-indigo-400">{k}</span>
                <span className="text-slate-500">:</span>
                <span className="text-slate-300">{String(v)}</span>
                <button
                  type="button"
                  onClick={() => {
                    const p = { ...nodeForm.properties }
                    delete p[k]
                    setNodeForm({ ...nodeForm, properties: p })
                  }}
                  className="ml-auto text-slate-500 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddNode(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">Add Node</Button>
          </div>
        </form>
      </Modal>

      {/* Add Edge Modal */}
      <Modal isOpen={showAddEdge} onClose={() => setShowAddEdge(false)} title="Add Edge">
        <form onSubmit={handleAddEdge} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Source Node</label>
            <select
              value={edgeForm.source_external_id}
              onChange={(e) => setEdgeForm({ ...edgeForm, source_external_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            >
              <option value="">Select source node...</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.external_id}>{n.label} ({n.external_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Target Node</label>
            <select
              value={edgeForm.target_external_id}
              onChange={(e) => setEdgeForm({ ...edgeForm, target_external_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              required
            >
              <option value="">Select target node...</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.external_id}>{n.label} ({n.external_id})</option>
              ))}
            </select>
          </div>
          <Input
            label="Relationship Type"
            placeholder="KNOWS, WORKS_WITH, DEPENDS_ON..."
            value={edgeForm.relationship_type}
            onChange={(e) => setEdgeForm({ ...edgeForm, relationship_type: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddEdge(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">Add Edge</Button>
          </div>
        </form>
      </Modal>

      {/* Add Schema Modal */}
      <Modal isOpen={showAddSchema} onClose={() => setShowAddSchema(false)} title="Add Schema Type">
        <form onSubmit={handleAddSchema} className="space-y-4">
          <Input
            label="Type Name"
            placeholder="Person, Company, Skill..."
            required
            value={schemaForm.name}
            onChange={(e) => setSchemaForm({ ...schemaForm, name: e.target.value })}
          />
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Schema Type</label>
            <div className="flex gap-2">
              {(['node', 'edge'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSchemaForm({ ...schemaForm, schema_type: t })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    schemaForm.schema_type === t
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)} Type
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Color</label>
            <div className="flex gap-2">
              {NODE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSchemaForm({ ...schemaForm, color: c })}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: schemaForm.color === c ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddSchema(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">Add Schema</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
