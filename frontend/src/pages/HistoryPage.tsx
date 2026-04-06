import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, Plus, Trash2, GitCompare,
  Network, GitBranch, CheckCircle, XCircle, RefreshCw, History
} from 'lucide-react'
import { historyApi } from '../api/history'
import type { Snapshot, DiffResult } from '../api/history'
import { projectsApi } from '../api/projects'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Loader } from '../components/ui/Loader'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'

export const HistoryPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)

  const [projectName, setProjectName] = useState('')
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [showSave, setShowSave] = useState(false)

  // Diff state
  const [selectedA, setSelectedA] = useState<number | null>(null)
  const [selectedB, setSelectedB] = useState<number | null>(null)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [proj, snaps] = await Promise.all([
        projectsApi.get(projectId),
        historyApi.list(projectId),
      ])
      setProjectName(proj.name)
      setSnapshots(snaps)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const snap = await historyApi.save(projectId, description || `Snapshot ${new Date().toLocaleString()}`)
      setSnapshots((prev) => [snap, ...prev])
      setShowSave(false)
      setDescription('')
      toast.success('Snapshot saved!')
    } catch {
      toast.error('Failed to save snapshot')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (snapId: number) => {
    if (!confirm('Delete this snapshot?')) return
    try {
      await historyApi.delete(projectId, snapId)
      setSnapshots((prev) => prev.filter((s) => s.id !== snapId))
      if (selectedA === snapId) setSelectedA(null)
      if (selectedB === snapId) setSelectedB(null)
      toast.success('Snapshot deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleDiff = async () => {
    if (!selectedA || !selectedB) return toast.error('Select two snapshots to compare')
    if (selectedA === selectedB) return toast.error('Select different snapshots')
    setDiffLoading(true)
    try {
      const result = await historyApi.getDiff(projectId, selectedA, selectedB)
      setDiffResult(result)
    } catch {
      toast.error('Failed to compute diff')
    } finally {
      setDiffLoading(false)
    }
  }

  if (loading) return <Loader fullScreen text="Loading history..." />

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(`/projects/${projectId}`)} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <History size={16} className="text-indigo-400" />
            <span className="font-semibold text-white">{projectName}</span>
            <span className="text-slate-500 text-sm">Graph History</span>
          </div>
          <Button size="sm" onClick={() => setShowSave(true)}>
            <Plus size={13} /> Save Snapshot
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Snapshots list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" />
                Snapshots
                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                  {snapshots.length}
                </span>
              </h2>
              {selectedA && selectedB && (
                <Button size="sm" onClick={handleDiff} isLoading={diffLoading}>
                  <GitCompare size={13} /> Compare
                </Button>
              )}
            </div>

            {snapshots.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <History size={28} className="text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm mb-2">No snapshots yet</p>
                <p className="text-slate-500 text-xs mb-4">Save snapshots to track changes over time</p>
                <Button size="sm" onClick={() => setShowSave(true)}>
                  <Plus size={13} /> Save First Snapshot
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snap) => {
                  const isA = selectedA === snap.id
                  const isB = selectedB === snap.id

                  return (
                    <div
                      key={snap.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group ${
                        isA ? 'border-indigo-500 bg-indigo-500/10' :
                        isB ? 'border-violet-500 bg-violet-500/10' :
                        'border-slate-700 bg-slate-900 hover:border-slate-600'
                      }`}
                      onClick={() => {
                        if (!selectedA || (selectedA && selectedB)) {
                          setSelectedA(snap.id)
                          setSelectedB(null)
                          setDiffResult(null)
                        } else if (selectedA && !selectedB) {
                          setSelectedB(snap.id)
                        }
                      }}
                    >
                      {/* Selection badge */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isA ? 'bg-indigo-500 text-white' :
                        isB ? 'bg-violet-500 text-white' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {isA ? 'A' : isB ? 'B' : '○'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{snap.description}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Network size={10} /> {snap.node_count} nodes
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch size={10} /> {snap.edge_count} edges
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatDistanceToNow(new Date(snap.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(snap.id) }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1.5 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {snapshots.length > 0 && (
              <p className="text-xs text-slate-500 mt-3 text-center">
                Click to select A, then click another for B, then Compare
              </p>
            )}
          </div>

          {/* Diff result */}
          <div>
            <h2 className="font-bold text-white flex items-center gap-2 mb-4">
              <GitCompare size={16} className="text-violet-400" />
              Diff View
            </h2>

            {!diffResult ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <GitCompare size={28} className="text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">Select two snapshots and click Compare</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <p className="text-xs text-slate-500 mb-3">
                    <span className="text-indigo-400 font-medium">{diffResult.snapshot_a.description}</span>
                    {' → '}
                    <span className="text-violet-400 font-medium">{diffResult.snapshot_b.description}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Nodes Added', value: diffResult.diff.summary.nodes_added, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      { label: 'Nodes Removed', value: diffResult.diff.summary.nodes_removed, color: 'text-red-400', bg: 'bg-red-500/10' },
                      { label: 'Nodes Modified', value: diffResult.diff.summary.nodes_modified, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                      { label: 'Edges Added', value: diffResult.diff.summary.edges_added, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      { label: 'Edges Removed', value: diffResult.diff.summary.edges_removed, color: 'text-red-400', bg: 'bg-red-500/10' },
                      { label: 'Total Changes', value: diffResult.diff.summary.total_changes, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    ].map((s) => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Nodes added */}
                {diffResult.diff.nodes_added.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                      <CheckCircle size={14} /> Nodes Added ({diffResult.diff.nodes_added.length})
                    </h3>
                    <div className="space-y-1">
                      {diffResult.diff.nodes_added.map((n, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-emerald-500/5 rounded-lg px-2 py-1.5 border border-emerald-500/10">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-white font-medium">{n.label}</span>
                          <span className="text-slate-500">{n.node_type}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Nodes removed */}
                {diffResult.diff.nodes_removed.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                      <XCircle size={14} /> Nodes Removed ({diffResult.diff.nodes_removed.length})
                    </h3>
                    <div className="space-y-1">
                      {diffResult.diff.nodes_removed.map((n, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-red-500/5 rounded-lg px-2 py-1.5 border border-red-500/10">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-white font-medium">{n.label}</span>
                          <span className="text-slate-500">{n.node_type}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Edges added */}
                {diffResult.diff.edges_added.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                      <CheckCircle size={14} /> Edges Added ({diffResult.diff.edges_added.length})
                    </h3>
                    <div className="space-y-1">
                      {diffResult.diff.edges_added.map((e, i) => (
                        <div key={i} className="text-xs bg-emerald-500/5 rounded-lg px-2 py-1.5 border border-emerald-500/10 text-slate-300">
                          {e.relationship_type}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {diffResult.diff.summary.total_changes === 0 && (
                  <Card className="text-center py-8">
                    <p className="text-slate-400 text-sm">No changes between these snapshots</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Save Snapshot Modal */}
      <Modal isOpen={showSave} onClose={() => setShowSave(false)} title="Save Snapshot">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Description"
            placeholder="e.g. Before adding company nodes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowSave(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={saving}>
              Save Snapshot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}