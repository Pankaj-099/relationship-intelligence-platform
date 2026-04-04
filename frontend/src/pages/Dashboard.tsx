import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, LogOut, Plus, Network, Layers, Trash2, ExternalLink, Search, Clock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProjectStore } from '../store/projectStore'
import { projectsApi, type CreateProjectPayload } from '../api/projects'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Loader } from '../components/ui/Loader'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16']

export const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { projects, setProjects, addProject, removeProject, isLoading, setLoading } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [form, setForm] = useState<CreateProjectPayload>({ name: '', description: '', color: '#6366f1', is_public: false })
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await projectsApi.list()
      setProjects(res.projects)
    } catch (err: any) {
      console.error('Load projects error:', err)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Project name is required')
    setCreating(true)
    try {
      const project = await projectsApi.create(form)
      addProject(project)
      setShowCreate(false)
      setForm({ name: '', description: '', color: '#6366f1', is_public: false })
      toast.success(`Project "${project.name}" created!`)
      navigate(`/projects/${project.id}`)
    } catch (err: any) {
      console.error('Create project error:', err)
      toast.error(err?.response?.data?.detail || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove all nodes and edges.`)) return
    setDeleting(id)
    try {
      await projectsApi.delete(id)
      removeProject(id)
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete project')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
              <GitBranch size={15} className="text-white" />
            </div>
            <span className="text-white font-semibold">RIP</span>
            <span className="text-slate-600 text-sm hidden sm:block">Relationship Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden sm:block"><span className="text-slate-200">@{user?.username}</span></span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">My Projects</h1>
            <p className="text-slate-400 text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''} · Build and explore your relationship graphs</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} />New Project</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Projects', value: projects.length, icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Total Nodes', value: projects.reduce((s, p) => s + p.node_count, 0), icon: Network, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Total Edges', value: projects.reduce((s, p) => s + p.edge_count, 0), icon: GitBranch, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { label: 'Public', value: projects.filter((p) => p.is_public).length, icon: ExternalLink, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((stat) => (
            <Card key={stat.label} padding="sm" className="flex items-center gap-3">
              <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <stat.icon size={17} className={stat.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {projects.length > 0 && (
          <div className="mb-5 max-w-sm">
            <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search size={15} />} />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader size="lg" text="Loading projects..." /></div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Network size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{search ? 'No projects match your search' : 'No projects yet'}</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">{search ? 'Try a different search term' : 'Create your first project to start building relationship graphs'}</p>
            {!search && <Button onClick={() => setShowCreate(true)}><Plus size={16} />Create first project</Button>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <Card key={project.id} className="group hover:border-slate-600 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/20" onClick={() => navigate(`/projects/${project.id}`)}>
                <div className="h-1.5 rounded-full mb-4" style={{ backgroundColor: project.color }} />
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${project.color}20` }}>
                      <Network size={18} style={{ color: project.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm leading-tight">{project.name}</h3>
                      {project.is_public && <span className="text-xs text-emerald-400">Public</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.name) }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-red-400/10">
                    {deleting === project.id ? <Loader size="sm" /> : <Trash2 size={15} />}
                  </button>
                </div>
                {project.description && <p className="text-slate-400 text-xs mb-3 line-clamp-2">{project.description}</p>}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <span>{project.node_count} nodes</span>
                    <span>{project.edge_count} edges</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Project name" placeholder="e.g. Company Network, Skills Graph" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea placeholder="What is this graph about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-800/60 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none" rows={3} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: form.color === c ? 'white' : 'transparent', transform: form.color === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-sm text-slate-300">Make this project public</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={creating}>Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}