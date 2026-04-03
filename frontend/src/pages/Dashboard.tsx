import { GitBranch, LogOut, Plus, BarChart3, Network, Clock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export const Dashboard = () => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
              <GitBranch size={15} className="text-white" />
            </div>
            <span className="text-white font-semibold">RIP</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-400">
              <span className="text-slate-200">@{user?.username}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={15} />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome back, {user?.full_name || user?.username} 👋
            </h1>
            <p className="text-slate-400 text-sm">Manage your relationship graphs and projects</p>
          </div>
          <Button size="md">
            <Plus size={16} />
            New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Projects', value: '0', icon: Network, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Total Nodes', value: '0', icon: BarChart3, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Recent Activity', value: '0', icon: Clock, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          ].map((stat) => (
            <Card key={stat.label} className="flex items-center gap-4">
              <div className={`w-11 h-11 ${stat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Network size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-sm">
            Create your first project to start building and exploring relationship graphs
          </p>
          <Button>
            <Plus size={16} />
            Create first project
          </Button>
        </Card>
      </main>
    </div>
  )
}
