// Activity Page
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, Clock, User, GitBranch, Network, Layers } from 'lucide-react'
import { activityApi, type ActivityLog } from '../api/activity'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Loader } from '../components/ui/Loader'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const ACTION_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  user_registered: { icon: User, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Registered' },
  user_login: { icon: User, color: 'text-sky-400', bg: 'bg-sky-500/10', label: 'Logged In' },
  project_created: { icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-500/10', label: 'Project Created' },
  node_created: { icon: Network, color: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Node Added' },
  edge_created: { icon: GitBranch, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Edge Added' },
  node_deleted: { icon: Network, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Node Deleted' },
  import_completed: { icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Data Imported' },
}

const getActionConfig = (action: string) =>
  ACTION_CONFIG[action] || { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', label: action }

export const ActivityPage = () => {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivity()
  }, [])

  const loadActivity = async () => {
    setLoading(true)
    try {
      const data = await activityApi.getMyActivity(100)
      setLogs(data)
    } catch {
      toast.error('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader fullScreen text="Loading activity..." />

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Activity size={16} className="text-indigo-400" />
            <span className="font-semibold text-white">Activity Log</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadActivity}>
            Refresh
          </Button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {logs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Activity size={28} className="text-slate-600 mb-3" />
            <p className="text-slate-400">No activity yet</p>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-800" />

            <div className="space-y-3">
              {logs.map((log) => {
                const config = getActionConfig(log.action)
                const Icon = config.icon
                return (
                  <div key={log.id} className="flex items-start gap-4 relative">
                    {/* Icon */}
                    <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0 z-10 border border-slate-800`}>
                      <Icon size={16} className={config.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">{config.label}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                          <Clock size={11} />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                      </div>

                      {Object.keys(log.log_metadata || {}).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {Object.entries(log.log_metadata).map(([k, v]) => (
                            <span key={k} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
